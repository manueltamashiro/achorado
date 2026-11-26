/* ACHORADO — js/engine/prologo.js (v0.13 T2, agente GB · B3): el prólogo jugable dentro de la combi.
   Solo en PARTIDA NUEVA (game.newGame llama ACH.prologo.play(onDone) antes de la intro). Escena propia en un lienzo encima de #world:
   Alexander canta, nadie le hace caso, pasa la lata; un señor tose... y se voltea. Tutorial: ESPACIO guitarrazo, SHIFT correr, Q Titina,
   E abrir la puerta trasera. La combi se estrella (es la combi volcada del paradero) y empieza la Gambetta.
   La primera vez no se salta; si ya se vio (localStorage achorado.prologo.v1) sale «SALTAR · ESC».
   El juego queda en el estado 'cine' mientras dura (nada del nivel corre). Lee el teclado con ACH.input.down (también el táctil).
   Debug: ACH.debug.prologo() lo lanza · ACH.debug.prologo.info() · ACH.debug.prologo.skip(). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var KEY = 'achorado.prologo.v1';

  function seen() { try { return window.localStorage.getItem(KEY) === '1'; } catch (e) { return !!seen.mem; } }
  function markSeen() { seen.mem = true; try { window.localStorage.setItem(KEY, '1'); } catch (e) { /* memoria */ } }
  function sfx(n, d) { try { if (ACH.audio && ACH.audio.emit) ACH.audio.emit(n, d); } catch (e) { /* nada */ } }
  function down(c) { var I = ACH.input; return !!(I && I.down && I.down(c)); }
  function L(quien, cara, texto) { return { quien: quien, cara: cara, texto: texto }; }
  function dlg(lines, done) { if (ACH.dialogo && ACH.dialogo.play) ACH.dialogo.play(lines, { onDone: done, onEsc: function () { skip(); } }); else done(); }   // v0.13 fix M2: sin id (el diálogo no ofrece su propio SALTAR); ESC salta el prólogo entero
  function dlgOn() { try { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function dig(path) { var o = ACH.sprites; path.split('.').forEach(function (k) { o = o == null ? o : o[k]; }); return o; }
  function fr(o, i) { if (Array.isArray(o)) o = o[((i % o.length) + o.length) % o.length]; return o && o.width ? o : null; }

  var P = null;   // escena viva
  var cvs = null, ctx = null, skipBtn = null, raf = 0, lastT = 0, prevDown = {};

  function build() {
    var st = document.getElementById('stage'); if (!st) return false;
    if (!cvs) {
      cvs = document.createElement('canvas'); cvs.id = 'prologoCv';
      cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;z-index:2;display:none;';
      st.appendChild(cvs);
      skipBtn = document.createElement('button'); skipBtn.type = 'button'; skipBtn.tabIndex = -1; skipBtn.setAttribute('data-ui', '');
      skipBtn.textContent = 'SALTAR ⏭ · ESC';
      skipBtn.style.cssText = 'position:absolute;right:8px;top:8px;z-index:7;display:none;min-height:44px;padding:0 14px;font:14px Silkscreen,monospace;background:#131015;color:#ffe500;border:2px solid #ff2e88;cursor:pointer;';
      skipBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); skip(); });
      st.appendChild(skipBtn);
      window.addEventListener('keydown', function (e) { if (P && P.skippable && (e.code === 'Escape') && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); skip(); } }, true);
    }
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    cvs.width = V.w; cvs.height = V.h; ctx = cvs.getContext('2d'); ctx.imageSmoothingEnabled = false;
    return true;
  }

  /* ---------------- La escena ---------------- */
  function newScene() {
    var V = { w: cvs.width, h: cvs.height }, bg = ACH.sprites.gb.combiInterior(V.w, V.h);
    var y0 = bg.floor0 + 8, y1 = V.h - 28;
    var seats = [];
    for (var sx = 60; sx < V.w - 60; sx += 56) seats.push(sx + 13);
    var pax = [{ kind: 'celular', x: seats[1], y: bg.floor0 - 6 }, { kind: 'duerme', x: seats[2] || seats[1] + 56, y: V.h - 10 },
      { kind: 'audifonos', x: seats[3] || V.w - 120, y: bg.floor0 - 6 }, { kind: 'tose', x: seats[0], y: V.h - 10 }];
    return { V: V, bg: bg, y0: y0, y1: y1, x0: 22, x1: V.w - 40, t: 0, phase: 'abre', shake: 0, flash: 0, hint: '', hintKey: '',
      p: { x: V.w * 0.55, y: (y0 + y1) / 2, dir: 'left', atkT: -1, atkCD: 0, hp: 100, hurtT: 0, walkT: 0, run: false },
      tit: { state: 'hombro', x: 0, y: 0, t: 0, target: null, cd: 0 },
      pax: pax, zs: [], lucho: { x: V.w - 60, y: (y0 + y1) / 2, gone: false }, notes: [], skippable: seen(), done: false, learned: {} };
  }
  function play(onDone) {
    if (P) return false;
    if (!ACH.sprites || !ACH.sprites.gb || !build()) return false;
    var G = ACH.G;
    if (G) { G.state = 'cine'; try { ACH.hud.setState('cine'); } catch (e) { /* nada */ } }
    P = newScene(); P.onDone = onDone;
    cvs.style.display = 'block';
    skipBtn.style.display = P.skippable ? 'block' : 'none';
    prevDown = {}; lastT = 0;
    if (!raf) raf = requestAnimationFrame(loop);
    intro();
    return true;
  }
  function intro() {
    P.phase = 'canta';
    dlg([L('alexander', 'habla', 'Buenas tardes, señores pasajeros. Disculpen la molestia...'),
      L('alexander', 'feliz', 'Les voy a cantar una cancioncita, con todo el corazón.'),
      L('titina', 'feliz', '¡Grrú!')], function () {
      P.singT = 3.2; sfx('hab.alivio');
      P.after = function () {
        dlg([L(null, 'habla', 'Celular. Sueño. Audífonos. Nadie levanta la mirada.'),
          L('alexander', 'picaro', 'Gracias, gracias... ¿una monedita? Lo que sea su voluntad.'),
          L(null, 'habla', 'En la lata cae: un botón, un caramelo de limón y una pelusa. Titina se come la pelusa.'),
          L('titina', 'molesta', '¡Grrú!'),
          L(null, 'habla', 'Al fondo, un señor tose... y tose... y deja de toser.'),
          L('luchovivo', 'molesta', '¡Baja, baja, aquí no se canta! ¡AL FONDO HAY SITIO!'),
          L('alexander', 'sorpresa', 'Oiga, Don Lucho... el señor de atrás se está parando raro.')], function () { turn(3); P.phase = 'golpe'; hint('ESPACIO', 'guitarrazo: pégale al pasajero', 'GUITARRAZO', 'pégale al pasajero'); });
      };
    });
  }
  function turn(i) {
    var q = P.pax[i]; if (!q || q.z) return;
    q.z = true;
    P.zs.push({ x: q.x, y: Math.max(P.y0, Math.min(P.y1, q.y > P.bg.floor0 ? P.y1 - 6 : P.y0 + 6)), hp: 2, kind: q.kind, stun: 0, kb: 0, hurtT: 0, atkCD: 1, t: Math.random() * 2, spd: 16 });
    sfx('zombie.alert', {});
  }
  function hint(key, txt, tKey, tTxt) {   // v0.13 verificación: en táctil, el nombre del botón en vez de la tecla
    var tc = !!(tKey && document.body && document.body.classList.contains('touch'));
    P.hintKey = tc ? tKey : key; P.hint = tc ? tTxt : txt;
  }

  /* ---------------- Paso ---------------- */
  function edge(c) { var d = down(c), was = !!prevDown[c]; return d && !was; }
  function step(dt) {
    P.t += dt;
    if (P.shake > 0) P.shake -= dt;
    if (P.flash > 0) P.flash -= dt;
    if (P.singT > 0) {
      P.singT -= dt;
      if (Math.random() < dt * 10) P.notes.push({ x: P.p.x + (Math.random() * 12 - 6), y: P.p.y - 26, t: 0, c: ['#ff2e88', '#ffe500', '#1fe07a'][Math.floor(Math.random() * 3)] });
      if (P.singT <= 0 && P.after) { var a = P.after; P.after = null; a(); }
    }
    P.notes.forEach(function (n) { n.t += dt; n.y -= 18 * dt; }); P.notes = P.notes.filter(function (n) { return n.t < 1.2; });
    var playing = (P.phase === 'golpe' || P.phase === 'pelea' || P.phase === 'puerta') && !dlgOn();
    if (playing) control(dt);
    zombies(dt, playing);
    titina(dt);
    if (P.phase === 'golpe' && P.zs.length && P.zs.every(dead)) {
      P.phase = 'pausa';
      dlg([L('alexander', 'sorpresa', '¡Por fin alguien reacciona a mi música!'),
        L('alexander', 'miedo', 'Ay, no... ¡los otros también!')], function () { turn(0); turn(1); turn(2); P.phase = 'pelea'; hint('SHIFT', 'corre · Q: Titina los distrae · ESPACIO: guitarrazo', 'JOYSTICK A FONDO', 'corre · TITINA los distrae'); });
    }
    if (P.phase === 'pelea' && P.zs.every(dead)) {
      P.phase = 'pausa'; P.shake = 0.6; sfx('gb.bocina', {});
      dlg([L(null, 'habla', 'La combi da un bandazo. Adelante, el chofer gruñe... y no suelta el acelerador.'),
        L('luchovivo', 'sorpresa', '¡El chofer también! ¡Yo me bajo aquí nomás!'),
        L(null, 'habla', 'Don Lucho salta por la puerta de adelante.'),
        L('alexander', 'miedo', '¡La puerta de atrás! ¡Rápido, Titina!')], function () { P.lucho.gone = true; P.phase = 'puerta'; hint('E', 'abre la puerta trasera (al fondo, a la izquierda)', 'ABRIR', 'la puerta de atrás (al fondo, a la izq.)'); });
    }
    if (P.phase === 'puerta' && !dlgOn() && P.p.x < P.x0 + 28 && edge('KeyE')) crash();
    if (P.phase === 'choque') { P.crashT += dt; if (P.crashT > 1.6) finish(); }
    ['Space', 'KeyE', 'KeyQ'].forEach(function (c) { prevDown[c] = down(c); });
  }
  function dead(z) { return z.hp <= 0; }
  function control(dt) {
    var p = P.p, I = ACH.input, a = I && I.axis ? I.axis() : { x: 0, y: 0 };
    p.run = down('ShiftLeft') || down('ShiftRight');
    if (p.run && (a.x || a.y)) P.learned.run = true;
    var sp = (p.run ? 92 : 56) * (p.atkT >= 0 ? 0.4 : 1);
    if (a.x || a.y) {
      var l = Math.sqrt(a.x * a.x + a.y * a.y) || 1;
      p.x = Math.max(P.x0, Math.min(P.x1, p.x + a.x / l * sp * dt)); p.y = Math.max(P.y0, Math.min(P.y1, p.y + a.y / l * sp * dt));
      p.dir = Math.abs(a.x) >= Math.abs(a.y) ? (a.x < 0 ? 'left' : 'right') : (a.y < 0 ? 'up' : 'down');
      p.walkT += dt;
    }
    if (p.atkCD > 0) p.atkCD -= dt;
    if (p.atkT >= 0) { p.atkT += dt; if (p.atkT > 0.27) p.atkT = -1; }
    if (edge('Space') && p.atkCD <= 0) {
      p.atkT = 0; p.atkCD = 0.36; sfx('guitar.swing', {}); P.learned.atk = true;
      var fx = p.dir === 'left' ? -1 : p.dir === 'right' ? 1 : 0, fy = p.dir === 'up' ? -1 : p.dir === 'down' ? 1 : 0;
      P.zs.forEach(function (z) {
        if (dead(z)) return;
        var dx = z.x - p.x, dy = z.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 28 && (dx * fx + dy * fy) > -4) {
          z.hp -= 1; z.hurtT = 0.2; z.kb = (dx < 0 ? -1 : 1) * 70; z.stun = Math.max(z.stun, 0.35); sfx(z.hp <= 0 ? 'hit.generic' : 'stone.hit.zombie', {});
          P.shake = 0.12;
        }
      });
    }
    if (edge('KeyQ') && P.tit.state === 'hombro' && P.tit.cd <= 0) {
      var best = null, bd = 1e9;
      P.zs.forEach(function (z) { if (dead(z)) return; var d = Math.abs(z.x - p.x) + Math.abs(z.y - p.y); if (d < bd) { bd = d; best = z; } });
      if (best) { P.tit.state = 'vuela'; P.tit.target = best; P.tit.x = p.x; P.tit.y = p.y - 24; P.tit.t = 0; sfx('titina.launch', {}); P.learned.q = true; }
    }
    if (p.hurtT > 0) p.hurtT -= dt;
  }
  function zombies(dt, active) {
    var p = P.p;
    P.zs.forEach(function (z) {
      z.t += dt; if (z.hurtT > 0) z.hurtT -= dt;
      if (dead(z)) return;
      if (z.kb) { z.x = Math.max(P.x0, Math.min(P.x1, z.x + z.kb * dt)); z.kb *= Math.exp(-10 * dt); if (Math.abs(z.kb) < 2) z.kb = 0; }
      if (z.stun > 0) { z.stun -= dt; return; }
      if (!active) return;
      var dx = p.x - z.x, dy = p.y - z.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 11) { z.x += dx / d * z.spd * dt; z.y += dy / d * z.spd * 0.7 * dt; }
      else { z.atkCD -= dt; if (z.atkCD <= 0) { z.atkCD = 1.4; p.hp = Math.max(25, p.hp - 8); p.hurtT = 0.4; P.flash = 0.15; sfx('zombie.bite', {}); sfx('player.hurt', {}); } }
    });
  }
  function titina(dt) {
    var T = P.tit, p = P.p;
    if (T.cd > 0) T.cd -= dt;
    if (T.state === 'vuela') {
      var z = T.target; T.t += dt;
      if (!z || dead(z)) { T.state = 'vuelve'; return; }
      var dx = z.x - T.x, dy = (z.y - 26) - T.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 4) { z.stun = 2.5; T.state = 'picotea'; T.t = 0; sfx('titina.coo', {}); }
      else { T.x += dx / d * 170 * dt; T.y += dy / d * 170 * dt; }
    } else if (T.state === 'picotea') {
      T.t += dt; if (T.target) { T.x = T.target.x + Math.sin(T.t * 20) * 3; T.y = T.target.y - 26; }
      if (T.t > 1.4) T.state = 'vuelve';
    } else if (T.state === 'vuelve') {
      var ex = p.x - T.x, ey = (p.y - 24) - T.y, e = Math.sqrt(ex * ex + ey * ey) || 1;
      if (e < 5) { T.state = 'hombro'; T.cd = 1.5; sfx('titina.return', {}); }
      else { T.x += ex / e * 190 * dt; T.y += ey / e * 190 * dt; }
    }
  }
  function crash() {
    P.phase = 'choque'; P.crashT = 0; P.shake = 1.2; P.flash = 0.5; P.hint = '';
    sfx('gb.choque', {}); sfx('vehicle.fall', {}); sfx('glass.crunch', {});
  }
  function finish() {
    if (!P || P.done) return;
    P.done = true; markSeen();
    var cb = P.onDone;
    close();
    if (cb) { try { cb(); } catch (e) { console.warn('[ACHORADO] prologo.onDone', e); } }
  }
  function skip() { if (!P || !P.skippable) return; try { if (dlgOn()) ACH.dialogo.close(); } catch (e) { /* nada */ } finish(); }
  function close() {
    P = null;
    if (cvs) cvs.style.display = 'none';
    if (skipBtn) skipBtn.style.display = 'none';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
  }

  /* ---------------- Dibujo ---------------- */
  function blit(c, x, y, flip) {
    if (!c) return;
    var ax = c.ax === undefined ? c.width >> 1 : c.ax, ay = c.ay === undefined ? c.height - 1 : c.ay;
    if (!flip) { ctx.drawImage(c, Math.round(x - ax), Math.round(y - ay)); return; }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(c, -ax, -ay); ctx.restore();
  }
  function draw() {
    var V = P.V, g = ctx, A = ACH.sprites.gb, sh = P.shake > 0 ? Math.round((Math.random() * 2 - 1) * 3 * Math.min(1, P.shake * 2)) : 0;
    g.save(); g.translate(sh, P.shake > 0 ? Math.round((Math.random() * 2 - 1) * 2) : 0);
    g.drawImage(P.bg, 0, 0);
    // la ciudad pasa por las ventanas (rayas que se mueven)
    g.fillStyle = 'rgba(120,124,126,0.35)';
    for (var i = 0; i < 6; i++) { var x = ((i * 97 - P.t * 140) % (V.w + 80) + V.w + 80) % (V.w + 80) - 40; g.fillRect(x, 50, 12, 36); }
    var list = [];
    P.pax.forEach(function (q, i) { if (!q.z) list.push({ y: q.y, f: function () { blit(A.pasajero(q.kind, Math.floor(P.t * 1.3 + i), false), q.x, q.y, i % 2 === 1); } }); });
    P.zs.forEach(function (z) {
      list.push({ y: z.y, f: function () {
        if (dead(z)) { g.globalAlpha = 0.85; var dz = fr(dig('zombie.caminante.dead'), 0); if (dz) blit(dz, z.x, z.y, false); else blit(A.pasajero(z.kind, 0, true), z.x, z.y, false); g.globalAlpha = 1; return; }
        var c = A.pasajero(z.kind, Math.floor(z.t * 3), true);
        blit(c, z.x, z.y, P.p.x < z.x);
        if (z.hurtT > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; blit(c, z.x, z.y, P.p.x < z.x); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        if (z.stun > 0.4) { g.fillStyle = '#ffe500'; g.fillRect(Math.round(z.x - 5 + Math.sin(P.t * 8) * 4), Math.round(z.y - 34), 2, 2); }
      } });
    });
    if (!P.lucho.gone) list.push({ y: P.lucho.y, f: function () { blit(A.pasajero('lucho', Math.floor(P.t * 2), false), P.lucho.x, P.lucho.y, true); } });
    var p = P.p;
    list.push({ y: p.y, f: function () {
      var set = P.tit.state === 'hombro' ? 'bird' : 'nobird', c;
      if (p.atkT >= 0) c = fr(dig('alex.' + set + '.attack.' + p.dir), Math.min(2, Math.floor(p.atkT / 0.09)));
      else if (P.singT > 0) c = fr(dig('alex.' + set + '.idle.' + p.dir), 0);
      else c = fr(dig('alex.' + set + '.walk.' + p.dir), Math.floor(p.walkT * 8));
      if (!c) c = fr(dig('alex.bird.idle.right'), 0);
      if (p.hurtT > 0 && Math.floor(p.hurtT * 20) % 2 === 0) g.globalAlpha = 0.45;
      blit(c, p.x, p.y, false); g.globalAlpha = 1;
    } });
    list.sort(function (a, b) { return a.y - b.y; }).forEach(function (o) { o.f(); });
    if (P.tit.state !== 'hombro') { var tf = fr(dig('titina.fly'), Math.floor(P.t * 10)); if (tf) blit(tf, P.tit.x, P.tit.y, false); }
    P.notes.forEach(function (n) { g.globalAlpha = Math.max(0, 1 - n.t / 1.2); g.fillStyle = n.c; var x = Math.round(n.x), y = Math.round(n.y); g.fillRect(x, y, 2, 2); g.fillRect(x + 1, y - 4, 1, 4); g.fillRect(x + 2, y - 4, 2, 1); g.globalAlpha = 1; });
    // la puerta trasera brilla cuando toca abrirla
    if (P.phase === 'puerta' && Math.floor(P.t * 3) % 2) { g.strokeStyle = '#ffe500'; g.lineWidth = 2; g.strokeRect(1, P.bg.top + 2, 14, V.h - P.bg.top - 4); }
    g.restore();
    if (P.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + Math.min(0.8, P.flash * 2) + ')'; g.fillRect(0, 0, V.w, V.h); }
    if (P.phase === 'choque') { g.fillStyle = 'rgba(19,16,21,' + Math.min(1, P.crashT / 1.2) + ')'; g.fillRect(0, 0, V.w, V.h); }
    // pista del tutorial
    if (P.hint && !dlgOn()) {
      g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var s = P.hint, kw = Math.ceil(g.measureText(P.hintKey).width) + 8, tw = Math.ceil(g.measureText(s).width), w = kw + tw + 14, x0 = Math.round(V.w / 2 - w / 2), y = 14;
      g.fillStyle = 'rgba(19,16,21,0.88)'; g.fillRect(x0, y - 8, w, 16);
      g.fillStyle = '#ffe500'; g.fillRect(x0 + 4, y - 6, kw, 12); g.fillStyle = '#131015'; g.fillText(P.hintKey, x0 + 4 + kw / 2, y + 0.5);
      g.fillStyle = '#f3efe2'; g.fillText(s, x0 + kw + 10 + tw / 2, y + 0.5);
    }
  }
  function loop(ts) {
    raf = 0;
    if (!P) return;
    var t = ts / 1000, dt = lastT ? Math.min(0.05, t - lastT) : 1 / 60; lastT = t;
    try { step(dt); if (P) draw(); } catch (e) { console.warn('[ACHORADO] prologo', e); finish(); return; }
    if (P) raf = requestAnimationFrame(loop);
  }

  ACH.prologo = { play: play, active: function () { return !!P; }, phase: function () { return P ? P.phase : null; },
    canOpen: function () { return !!(P && P.phase === 'puerta' && !dlgOn() && P.p.x < P.x0 + 28); },   // v0.13 verificación: botón ABRIR del táctil
    seen: seen, skip: skip, KEY: KEY };
  ACH.debug = ACH.debug || {};
  ACH.debug.prologo = function () { return play(function () { if (ACH.game && ACH.game.startIntro) ACH.game.startIntro('gambetta'); }); };
  ACH.debug.prologo.info = function () { return P ? { phase: P.phase, zs: P.zs.map(function (z) { return { x: Math.round(z.x), y: Math.round(z.y), hp: z.hp }; }), p: { x: Math.round(P.p.x), y: Math.round(P.p.y), hp: P.p.hp }, tit: P.tit.state, learned: P.learned } : null; };
  ACH.debug.prologo.skip = function () { if (P) { P.skippable = true; skip(); } return !P; };
  ACH.debug.prologo.step = function (n) { for (var i = 0; i < (n || 1) && P; i++) step(1 / 60); return ACH.debug.prologo.info(); };
})();
