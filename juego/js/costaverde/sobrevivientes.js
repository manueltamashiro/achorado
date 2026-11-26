/* ACHORADO — js/costaverde/sobrevivientes.js (v0.13 T2, agente CV · E3): 3 parapentistas sobrevivientes varados en el malecón.
   Cada uno tiene una mini-tarea; al rescatarlo da una pista de la cura (ACH.objetivo.diario 'cura-4/5/6') y un objeto.
     para1 CHALO  (Parapuerto)        «espántame a los muertos»: al acercarte caen 4 zombis alrededor; mátalos (o que no quede ninguno a 130 px)
     para2 MAYRA  (Parque del Amor)   «tráeme un helado»: E con un helado en la mochila (lo vende el heladero)
     para3 BRAYAN (Parque Letonia)    un perro bravo lo tiene acorralado: E con una pelota (o patéale una pelota cerca) y el perro se va tras ella
   Diálogos con ACH.dialogo (Alexander con retrato; el parapentista solo con nombre en el texto). Banderas de partida costaverde.para1..3.
   Debug: ACH.debug.cv.para.tp(n) · done(n) · state() */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var CV = ACH.cv = ACH.cv || {}; CV.systems = CV.systems || [];
  if (!CV.register) CV.register = function (s) { CV.systems.push(s); return s; };
  var T = 16;
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function sfx(n, d) { if (CV.sfx) CV.sfx(n, d); }
  function toast(t) { if (CV.toast) CV.toast(t); }
  function flag(k, v) { return CV.flag ? CV.flag(k, v) : false; }
  function pop(s, x, y, c) { if (CV.zombis && CV.zombis.popText) CV.zombis.popText(s, x, y, c); }
  function obj() { return ACH.objetivo || null; }
  function diario(id, tit, tx) { try { var O = obj(); if (O && typeof O.diario === 'function') O.diario(id, tit, tx); } catch (e) { /* nada */ } }
  function talk(lines, cb) { if (CV.talk) CV.talk(lines, cb); else if (cb) cb(); }
  function has(id) { var I = ACH.inv; return !!(I && I.count && I.count(id) > 0); }
  function take(id) { var I = ACH.inv; return !!(I && I.take && I.take(id, 1)); }
  function give(x, y, items) { try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(x, y, items, false); } catch (e) { /* nada */ } }

  var P = [
    { id: 'para1', name: 'CHALO', col: 0, c: 50, r: 23.4, task: 'zombis',
      ask: [{ quien: 'chalo', cara: 'sorpresa', texto: '¡Causa, causa! Aterricé de emergencia y los muertos me huelen. ¡No me dejes!' },
        { quien: 'alexander', cara: 'serio', texto: 'Tranquilo, pata. Tú quédate quieto, que yo los espanto.' }],
      thanks: [{ quien: 'chalo', cara: 'feliz', texto: '¡Gracias, hermano! Te cuento algo: volando de noche vi luces en el Morro Solar. Alguien trabaja allá arriba.' },
        { quien: 'alexander', cara: 'sorpresa', texto: '¿En el Morro? ¿De Chorrillos? Eso queda más abajo de la costa...' },
        { quien: 'chalo', cara: 'habla', texto: 'Llévate estas barras: en el aire brillan y se ven de lejos. Yo me escondo en la caseta.' }],
      cura: ['cura-4', 'Luces en el Morro Solar', 'Chalo, parapentista: «Volando de noche vi luces en el Morro Solar, en Chorrillos. Alguien trabaja allá arriba.»'],
      gift: [{ id: 'packFosfo', n: 1 }], giftTxt: 'Chalo te regaló un pack de barras fosforescentes.' },
    { id: 'para2', name: 'MAYRA', col: 1, c: 138, r: 23.2, task: 'helado',
      ask: [{ quien: 'mayra', cara: 'triste', texto: 'Me torcí el tobillo al aterrizar y me muero de calor... ¿No tendrás un heladito? El heladero no me hace caso.' },
        { quien: 'alexander', cara: 'picaro', texto: 'Un helado para la dama. Le busco al del triciclo amarillo.' }],
      thanks: [{ quien: 'mayra', cara: 'risa', texto: '¡Me salvaste la vida! Mi prima es enfermera: dice que unos científicos bajaron a Chorrillos con neveras de vacunas, en lancha.' },
        { quien: 'alexander', cara: 'serio', texto: 'Neveras... ¡La cura! Entonces sí existe.' },
        { quien: 'mayra', cara: 'feliz', texto: 'Toma, mi pelota de cuero de la suerte. Pégale a uno de esos por mí.' }],
      cura: ['cura-5', 'Neveras en lancha', 'Mayra, parapentista: «Mi prima es enfermera: unos científicos bajaron a Chorrillos con neveras de vacunas, en lancha.»'],
      gift: [{ id: 'pelotaCuero', n: 1 }], giftTxt: 'Mayra te regaló su pelota de cuero.' },
    { id: 'para3', name: 'BRAYAN', col: 2, c: 245, r: 23.6, task: 'perro',
      ask: [{ quien: 'brayan', cara: 'sorpresa', texto: '¡Ayuda! Este perro no me deja bajar de la banca. ¡Le encantan las pelotas, dicen!' },
        { quien: 'alexander', cara: 'risa', texto: 'Ese chusco no es zombi, solo es malcriado. Con una pelota se le pasa.' }],
      thanks: [{ quien: 'brayan', cara: 'serio', texto: '¡Al fin! Escucha: en la radio del club de pesca de Chorrillos repiten un código: "Agua Dulce, siete de la noche".' },
        { quien: 'alexander', cara: 'serio', texto: 'Agua Dulce... La playa de Chorrillos. Ahí tengo que llegar.' },
        { quien: 'brayan', cara: 'feliz', texto: 'Toma, para el camino. Y gracias, ¿ah?' }],
      cura: ['cura-6', 'Agua Dulce, 7 p.m.', 'Brayan, parapentista: «En la radio del club de pesca de Chorrillos repiten un código: "Agua Dulce, siete de la noche".»'],
      gift: [{ id: 'chaufa', n: 1 }, { id: 'sencillo', n: 4 }], giftTxt: 'Brayan te regaló un chaufa y unos sencillos.' }
  ];
  P.forEach(function (s) { s.x = Math.round(s.c * T); s.y = Math.round(s.r * T); });
  function reset(G) {
    var cont = !!CV.continuando;
    P.forEach(function (s, i) {
      s.state = cont && flag(s.id) ? 'libre' : 'espera';   // espera → pide → (tarea) → libre
      s.asked = s.state === 'libre'; s.zs = []; s.dog = s.task === 'perro' && s.state !== 'libre' ? { x: s.x + 22, y: s.y + 10, run: 0, t: 0 } : null; s.waveT = 0; s.busy = false;
    });
  }
  function spawnRing(G, s) {
    var E = ACH.ent, W = ACH.world; if (!E || !E.makeZombie) return;
    var types = ['caminante', 'cv_parapentista', 'caminante', 'cv_corredor'];
    for (var k = 0; k < 4; k++) {
      var a = k / 4 * Math.PI * 2 + rand(-0.3, 0.3), x = s.x + Math.cos(a) * rand(56, 74), y = s.y + Math.sin(a) * rand(30, 44);
      y = Math.max(20 * T, Math.min(32.3 * T, y));
      if (W.collideCircle(x, y, 6)) { x = s.x + (k - 1.5) * 26; y = s.y + 40; if (W.collideCircle(x, y, 6)) continue; }
      var z = E.makeZombie(types[k], x, y, { loco: 'camina' });
      z.loco = 'camina'; z.shield = false; z.low = false; z.punch3 = false; z.cv = true; z.hp = z.hpMax = (E.ZT[types[k]] || {}).hp || 2;
      if (types[k] === 'cv_corredor') { z.jog = 1; z.jogY = y; }
      try { var Z = ACH.sprites.zvar; if (types[k] !== 'caminante' && Z && Z[types[k]]) z.skin = types[k]; } catch (e) { /* nada */ }
      z.state = 'perseguir'; z.lastX = G.player.x; z.lastY = G.player.y;
      G.zombies.push(z); s.zs.push(z);
    }
    sfx('zombie.alert', { x: s.x, y: s.y, type: 'caminante' });
  }
  function rescue(G, s) {
    if (s.state === 'libre') return;
    s.state = 'libre'; s.busy = true; s.waveT = 3;
    flag(s.id, true);
    talk(s.thanks, function () {
      s.busy = false;
      diario(s.cura[0], s.cura[1], s.cura[2]);
      give(s.x + 10, s.y + 8, s.gift);
      toast(s.giftTxt + ' · Pista de la cura en el DIARIO');
      sfx('ui.ok'); pop('¡RESCATADO!', s.x, s.y - 34, '#1fe07a');
      var n = P.filter(function (q) { return q.state === 'libre'; }).length;
      if (n === 3) toast('¡Rescataste a los 3 parapentistas! Todas las pistas apuntan a Chorrillos.');
    });
  }
  function update(G, dt) {
    var p = G.player; if (!p) return;
    P.forEach(function (s) {
      if (s.waveT > 0) s.waveT -= dt;
      if (s.dog) updateDog(G, s, dt);
      if (s.state === 'libre' || s.busy) return;
      var d = dist(p.x, p.y, s.x, s.y);
      if (!s.asked && d < 80 && G.state === 'playing' && !(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active())) {
        s.asked = true; s.state = 'pide';
        talk(s.ask, function () {
          if (s.task === 'zombis') spawnRing(G, s);
          toast(s.task === 'zombis' ? 'Espanta a los muertos que rodean a Chalo' : s.task === 'helado' ? 'Tráele un helado a Mayra (E con el helado en la mochila)' : 'Distrae al perro con una pelota (E) o patéasela cerca');
        });
      }
      if (s.state === 'pide' && s.task === 'zombis' && s.zs.length) {
        var alive = s.zs.filter(function (z) { return z.state !== 'muerto' && G.zombies.indexOf(z) >= 0 && dist(z.x, z.y, s.x, s.y) < 130; }).length;
        if (!alive) rescue(G, s);
      }
    });
  }
  // el perro de Brayan: ladra encima de él; con la pelota sale disparado y se va
  function updateDog(G, s, dt) {
    var dg = s.dog; dg.t += dt;
    if (dg.run > 0) { dg.run -= dt; dg.x += 140 * dt; dg.y += Math.sin(dg.t * 9) * 0.6; if (dg.run <= 0) s.dog = null; return; }
    if (Math.floor(dg.t * 1.2) !== Math.floor((dg.t - dt) * 1.2) && G.player && dist(G.player.x, G.player.y, dg.x, dg.y) < 220) { sfx('cv.perro.ladra', { x: dg.x, y: dg.y }); pop('¡GUAU!', dg.x, dg.y - 18, '#f3efe2'); }
  }
  function chaseBall(G, s) {
    if (!s.dog) return;
    s.dog.run = 2.2; pop('¡PELOTA!', s.dog.x, s.dog.y - 20, '#ffe500'); sfx('cv.perro.ladra', { x: s.dog.x, y: s.dog.y });
    rescue(G, s);
  }
  // pelota pateada cerca del perro (juguetes.js manda sus proyectiles por ACH.nivel.onProjectile, kind 'ball')
  function onProjectile(G, pr) {
    var s = P[2]; if (!pr || s.state !== 'pide' || !s.dog || !(pr.kind === 'ball' || /pelota|ball/.test(String(pr.kind || '')))) return false;
    if (dist(pr.x, pr.y, s.dog.x, s.dog.y) < 46) chaseBall(G, s);
    return false;
  }
  function addActs() {
    var EA = CV.eAct; if (!EA || !EA.add) return;
    P.forEach(function (s) {
      EA.add({ id: 'para.' + s.id,
        near: function (G) {
          var p = G.player; if (s.busy || dist(p.x, p.y, s.x, s.y) > 30) return null;
          if (s.state === 'libre') return { x: s.x, y: s.y, label: 'HABLAR', prompt: 'HABLAR CON ' + s.name };
          if (s.state !== 'pide') return null;
          if (s.task === 'helado') return { x: s.x, y: s.y, label: 'DAR', prompt: has('helado') ? 'DARLE UN HELADO' : 'NECESITAS UN HELADO' };
          if (s.task === 'perro') return { x: s.x, y: s.y, label: 'TIRAR', prompt: has('pelota') || has('pelotaCuero') ? 'TIRARLE LA PELOTA AL PERRO' : 'NECESITAS UNA PELOTA' };
          return null;
        },
        act: function (G) {
          if (s.state === 'libre') { talk([{ quien: s.name.toLowerCase(), cara: 'feliz', texto: (s.cura[2].split('«')[1] || '¡Gracias otra vez!').replace('»', '') }]); return; }
          if (s.task === 'helado') { if (take('helado')) { sfx('cv.helado.lamer', { x: s.x, y: s.y }); rescue(G, s); } else toast('Mayra: «Un heladito, porfa... el triciclo amarillo pasa por el Amor.»'); return; }
          if (s.task === 'perro') { if (take('pelota') || take('pelotaCuero')) chaseBall(G, s); else toast('Brayan: «¡Una pelota! Don Fosfo vende, y en la losa hay sueltas.»'); }
        } });
    });
  }
  function spr(s) {
    var A = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.t2; if (!A || !A.para) return null;
    var pose = s.state === 'libre' ? (s.waveT > 0 && Math.floor(s.waveT * 4) % 2 ? 'saluda' : 'parado') : 'sentado';
    return A.para(s.col, pose);
  }
  function dogFrame(dg, t) {
    var PJ = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.pj, D = PJ && PJ.perro && (PJ.perro.chusco || PJ.perro.golden);
    if (!D) return null;
    try {
      if (dg.run > 0) { var r = D.run && D.run.right; return r && r.length ? r[Math.floor(t * 10) % r.length] : null; }
      var b = D.bite; return b && b.length ? b[Math.floor(t * 3) % b.length] : D.sit;
    } catch (e) { return null; }
  }
  function blit(g, s, x, y) { if (!s || !s.width) return false; var ax = typeof s.ax === 'number' ? s.ax : s.width >> 1, ay = typeof s.ay === 'number' ? s.ay : s.height - 1; g.drawImage(s, Math.round(x - ax), Math.round(y - ay)); return true; }
  function drawables(G, out) {
    var cam = G.cam, Vw = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    P.forEach(function (s) {
      if (s.x < cam.x - 60 || s.x > cam.x + Vw.w + 60 || s.y < cam.y - 40 || s.y > cam.y + Vw.h + 40) return;
      out.push({ y: s.y, x: s.x, draw: function (g, cx, cy) {
        g.fillStyle = 'rgba(28,26,34,.35)'; g.fillRect(Math.round(s.x - cx - 8), Math.round(s.y - cy - 1), 16, 3);
        if (!blit(g, spr(s), s.x - cx, s.y - cy)) { g.fillStyle = '#131015'; g.fillRect(Math.round(s.x - cx - 5), Math.round(s.y - cy - 20), 10, 20); g.fillStyle = '#e84a8a'; g.fillRect(Math.round(s.x - cx - 4), Math.round(s.y - cy - 19), 8, 18); }
        if (s.state !== 'libre' && !s.busy) {   // signo de ayuda
          var bx = Math.round(s.x - cx), by = Math.round(s.y - cy - 36 + Math.sin((G.clock || 0) * 4) * 1.5);
          g.fillStyle = '#131015'; g.fillRect(bx - 4, by - 5, 9, 11); g.fillStyle = '#ffe500'; g.fillRect(bx - 3, by - 4, 7, 9);
          g.fillStyle = '#131015'; g.fillRect(bx, by - 3, 1, 4); g.fillRect(bx, by + 2, 1, 1);
        }
      } });
      if (s.dog) {
        var dg = s.dog;
        out.push({ y: dg.y, x: dg.x, draw: function (g, cx, cy) {
          var f = dogFrame(dg, G.clock || 0);
          if (!blit(g, f, dg.x - cx, dg.y - cy)) { g.fillStyle = '#131015'; g.fillRect(Math.round(dg.x - cx - 8), Math.round(dg.y - cy - 9), 16, 9); g.fillStyle = '#8a5a2a'; g.fillRect(Math.round(dg.x - cx - 7), Math.round(dg.y - cy - 8), 14, 7); }
        } });
      }
    });
  }
  function onRespawn() { /* el anillo de Chalo sigue ahí: al volver, se termina */ }
  CV.register({ name: 'sobrevivientes', reset: function (G) { reset(G); addActs(); }, update: update, drawables: drawables, onProjectile: onProjectile, onRespawn: onRespawn });
  CV.sobrevivientes = P;

  ACH.debug = ACH.debug || {}; ACH.debug.cv = ACH.debug.cv || {};
  ACH.debug.cv.para = {
    tp: function (n) { var s = P[(n | 0) - 1] || P[0]; if (ACH.debug.cv.tp) ACH.debug.cv.tp('faro'); if (ACH.debug.teleport) ACH.debug.teleport(s.x - 40, s.y + 6); if (CV.snapCam) CV.snapCam(); return ACH.debug.cv.para.state(); },
    done: function (n) { var s = P[(n | 0) - 1]; if (s && ACH.G) rescue(ACH.G, s); return ACH.debug.cv.para.state(); },
    state: function () { return P.map(function (s) { return { id: s.id, name: s.name, state: s.state, task: s.task, ring: s.zs.filter(function (z) { return z.state !== 'muerto'; }).length, dog: !!s.dog, x: s.x, y: s.y }; }); }
  };
})();
