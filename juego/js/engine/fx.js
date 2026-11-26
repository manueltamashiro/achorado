/* ACHORADO — fx.js: "jugo" del guitarrazo: estela, chispas, astillas, polvo, destello, texto flotante, sacudida y hitstop. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var FX = ACH.ent.CFG.fx; // constantes de afinación: viven en ACH.ent.CFG.fx (entities.js)

  var PINK = '#ff2e88', YELLOW = '#ffe500', PALE = '#fff6b0', WHITE = '#ffffff';
  var WOOD = ['#8a4b1d', '#5a3314', '#b9783a'], DUST = ['#a8a59a', '#86837a'];

  var parts = [], texts = [], trails = [], flashes = [], killN = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  // v0.13 (G5): opción «reducir sacudida y destellos» (ACH.opciones calma) = sin sacudida y destellos chicos; ACH.fx.calma() para los demás
  function calma() { try { return !!(ACH.opciones && ACH.opciones.get('calma')); } catch (e) { return false; } }
  function reducedMotion() {
    if (calma()) return true;
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  function reset(G) {
    parts.length = 0; texts.length = 0; trails.length = 0; flashes.length = 0; smoke.length = 0; smokeT = 0; resetAmbient();
    wtexts.length = 0; spins.length = 0;
    if (G) { G.hitstop = 0; G.shake = null; G.shakeX = 0; G.shakeY = 0; G.holdInput = false; }
  }

  /* ---------- hitstop y sacudida ---------- */
  function hitstop(G, s) { if (s > (G.hitstop || 0)) G.hitstop = s; }
  function shake(G, amp, dur) {
    if (reducedMotion()) return;
    var cur = G.shake ? G.shake.amp * (G.shake.t / G.shake.dur) : 0;
    if (amp >= cur) G.shake = { amp: amp, t: dur, dur: dur };
  }
  // Tiempo real (corre también durante el hitstop): offsets enteros que decaen a 0.
  function updateShake(G, dt) {
    var s = G.shake;
    if (!s) { G.shakeX = 0; G.shakeY = 0; return; }
    s.t -= dt;
    if (s.t <= 0) { G.shake = null; G.shakeX = 0; G.shakeY = 0; return; }
    var a = Math.round(s.amp * s.t / s.dur);
    G.shakeX = a ? Math.round(rand(-a, a)) : 0;
    G.shakeY = a ? Math.round(rand(-a, a)) : 0;
  }

  /* ---------- eventos ---------- */
  // Estela del guitarrazo: al cuadro activo, golpee o no.
  function swing(G, p) {
    var w = p.atkW;
    if (w && w.arc >= 6) { spin(p, w.range || 26, w.dur || 0.4); return; }   // v0.9: la escoba gira 360°: estela circular de polvo
    trails.push({ x: p.x, y: p.y - FX.trailY, dir: p.dir, t: 0 });
  }

  function burst(x, y, ang, nSpark, nSplint) {
    var i, a, s;
    for (i = 0; i < nSpark; i++) {
      a = ang + rand(-FX.partSpread, FX.partSpread); s = rand(FX.partSpeedMin, FX.partSpeedMax);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(FX.partLifeMin, FX.partLifeMax),
        col: Math.random() < 0.5 ? WHITE : PALE, w: i % 2 ? 2 : 1, h: i % 2 ? 2 : 1, drag: FX.partDrag });
    }
    for (i = 0; i < nSplint; i++) {
      a = ang + rand(-FX.partSpread, FX.partSpread); s = rand(FX.partSpeedMin * 0.7, FX.partSpeedMax * 0.8);
      var horiz = Math.abs(Math.cos(a)) > 0.5;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(FX.partLifeMin, FX.partLifeMax),
        col: WOOD[i % WOOD.length], w: horiz ? 3 : 1, h: horiz ? 1 : 3, drag: FX.partDrag });
    }
  }
  function dustPuff(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), s = rand(FX.dustSpeed * 0.5, FX.dustSpeed);
      var sz = Math.random() < 0.5 ? 2 : 3;
      parts.push({ x: x + rand(-3, 3), y: y + rand(-1, 1), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5 - 6, t: 0, life: FX.dustLife * rand(0.8, 1.1),
        col: DUST[i % DUST.length], w: sz, h: sz, drag: 4, dust: true });
    }
  }

  // Un zombie recibió un guitarrazo. (nx, ny) = dirección del golpe. first = primer zombie de este guitarrazo (lleva el texto).
  function hit(G, z, nx, ny, kill, first) {
    var cx = z.x - nx * 3, cy = z.y - 9 - ny * 2;          // punto de contacto: pecho, del lado de Alexander
    var ang = Math.atan2(ny, nx);
    burst(cx, cy, ang, FX.sparksHit + (kill ? FX.sparksKill : 0), FX.splintersHit + (kill ? FX.splintersKill : 0));
    if (kill) dustPuff(z.x, z.y - 1, FX.dustKill);
    flashes.push({ x: cx, y: cy, t: 0 });
    if (trails.length && trails[trails.length - 1].t < FX.trailSweepT) trails[trails.length - 1].t = FX.trailSweepT; // al conectar, la estela se ve completa durante el hitstop
    z.squash = FX.squashT;
    hitstop(G, kill ? FX.hitstopKill : FX.hitstopHit);
    shake(G, kill ? FX.shakeKill : FX.shakeHit, kill ? FX.shakeKillT : FX.shakeHitT);
    if (first || kill) {
      var list = kill ? FX.killText : FX.hitText;
      var str = kill ? list[killN++ % list.length] : list[0];
      texts.push({ x: z.x, y: z.y - FX.textY, s: str, t: 0 });
      if (texts.length > 4) texts.shift();
    }
  }

  /* ---------- actualización (tiempo de simulación: se congela en hitstop) ---------- */
  function update(G, dt) {
    var i;
    for (i = parts.length - 1; i >= 0; i--) {
      var q = parts[i];
      q.t += dt;
      if (q.t >= q.life) { parts.splice(i, 1); continue; }
      var k = Math.exp(-q.drag * dt);                       // arrastre sin gravedad
      q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt;
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t >= FX.textT) texts.splice(i, 1); }
    for (i = trails.length - 1; i >= 0; i--) { trails[i].t += dt; if (trails[i].t >= FX.trailT) trails.splice(i, 1); }
    for (i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t >= FX.flashT) flashes.splice(i, 1); }
    updateSmoke(G, dt);
    updateAmbient(dt);
    updateExtra(dt);
  }


  /* ---------- humo de los anticuchos (ambiente; corre con el tiempo de simulación) ---------- */
  var smoke = [], smokeT = 0;
  function updateSmoke(G, dt) {
    var i, q, V = ACH.render.VIEW, cam = G.cam;
    for (i = smoke.length - 1; i >= 0; i--) {
      q = smoke[i]; q.t += dt;
      if (q.t >= FX.smokeLife) { smoke.splice(i, 1); continue; }
      q.x += (FX.smokeDrift * (0.6 + q.t) + q.dx) * dt; q.y -= FX.smokeRise * dt;
    }
    smokeT -= dt;
    if (smokeT > 0) return;
    smokeT = FX.smokeEvery;
    var props = ACH.world.props;
    for (i = 0; i < props.length; i++) {
      var p = props[i];
      if (!p.smoke || smoke.length >= FX.smokeMax) continue;
      if (p.smoke.x < cam.x - 20 || p.smoke.x > cam.x + V.w + 20 || p.smoke.y < cam.y - 20 || p.smoke.y > cam.y + V.h + 80) continue; // solo si se ve
      smoke.push({ x: p.smoke.x + rand(-1, 1), y: p.smoke.y, t: 0, dx: rand(-2, 2), s: Math.random() < 0.5 ? 2 : 3 });
    }
  }
  function drawSmoke(ctx, ox, oy) {
    for (var i = 0; i < smoke.length; i++) {
      var q = smoke[i], life = q.t / FX.smokeLife;
      ctx.globalAlpha = 0.5 * (1 - life) * Math.min(1, q.t * 5);
      ctx.fillStyle = life < 0.5 ? '#c9c7c0' : '#a9a8a3';
      var s = q.s + (life > 0.55 ? 1 : 0);
      ctx.fillRect(Math.round(q.x - ox) - (s >> 1), Math.round(q.y - oy) - (s >> 1), s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- v0.9 (H3): API pública de texto flotante, temblor, giro de la escoba, chispas y vidrio ---------- */
  // ACH.fx.text(x, y, str, color): texto en px de mundo que sube y se apaga (fuente Silkscreen, con sombra). Máx. 8 a la vez.
  var wtexts = [], spins = [];
  var TXT_T = 0.9;
  function text(x, y, str, color) {
    if (str === undefined || str === null) return;
    wtexts.push({ x: x, y: y, s: String(str), c: color || YELLOW, t: 0 });
    if (wtexts.length > 8) wtexts.shift();
  }
  // ACH.fx.shake(f, t) con ACH.G; también acepta shake(G, f, t) (como lo llama cerro.js).
  function shakePub(a, b, c) {
    if (a && typeof a === 'object') { shake(a, +b || 0, +c || 0.2); return; }
    var G = ACH.G; if (G) shake(G, +a || 0, +b || 0.2);
  }
  // Estela circular de polvo del giro de la escoba: sigue a `who` (o queda en x, y). r = radio en px de mundo.
  function spin(who, r, dur) {
    spins.push({ who: who && typeof who === 'object' ? who : null, x: who && who.x, y: who && who.y, r: r || 26, t: 0, dur: dur || 0.4, a0: -Math.PI / 2, n: 0 });
    if (spins.length > 3) spins.shift();
  }
  var SPARK = ['#fff6b0', '#ffe500', '#ffffff', '#ffb020'], GLASS = ['#cfe8f0', '#9fc4d0', '#ffffff', '#7fa8b8'];
  function sparks(x, y, n, spd) {
    n = n || 8; spd = spd || 90;
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), s = rand(spd * 0.4, spd);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - 20, t: 0, life: rand(0.2, 0.45), col: SPARK[i % SPARK.length], w: 1, h: 1, drag: 5 });
    }
    if (parts.length > 220) parts.splice(0, parts.length - 220);
  }
  function glass(x, y, n, spd) {
    n = n || 10; spd = spd || 70;
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), s = rand(spd * 0.3, spd);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.55, t: 0, life: rand(0.3, 0.6), col: GLASS[i % GLASS.length], w: i % 3 ? 1 : 2, h: 1, drag: 6 });
    }
    if (parts.length > 220) parts.splice(0, parts.length - 220);
  }
  function updateExtra(dt) {
    var i;
    for (i = wtexts.length - 1; i >= 0; i--) { wtexts[i].t += dt; if (wtexts[i].t >= TXT_T) wtexts.splice(i, 1); }
    for (i = spins.length - 1; i >= 0; i--) {
      var s = spins[i]; s.t += dt;
      if (s.who) { s.x = s.who.x; s.y = s.who.y; }
      // polvo que suelta la punta de la escoba al barrer el piso
      var ang = s.a0 + Math.PI * 2 * Math.min(1, s.t / s.dur) * 1.0, k = Math.floor(s.t / 0.05);
      if (k > s.n && s.t < s.dur) {
        s.n = k;
        var px = s.x + Math.cos(ang) * s.r, py = s.y + Math.sin(ang) * s.r * 0.55;
        parts.push({ x: px + rand(-2, 2), y: py + rand(-1, 1), vx: -Math.sin(ang) * 18, vy: Math.cos(ang) * 9 - 4, t: 0, life: FX.dustLife * rand(0.8, 1.2),
          col: DUST[k % DUST.length], w: 2, h: 2, drag: 4, dust: true });
      }
      if (s.t >= s.dur) spins.splice(i, 1);
    }
  }
  function drawSpin(ctx, s, ox, oy) {
    var prog = Math.min(1, s.t / s.dur), fade = s.t > s.dur * 0.6 ? 1 - (s.t - s.dur * 0.6) / (s.dur * 0.4) : 1;
    var cx = s.x - ox, cy = s.y - oy - 1, steps = 40, i;
    for (i = 0; i <= steps; i++) {
      var q = i / steps; if (q > prog) break;
      var a = s.a0 + Math.PI * 2 * q, age = prog - q;   // lo recién barrido se ve más fuerte
      var al = Math.max(0, (1 - age * 1.6)) * fade;
      if (al <= 0.02) continue;
      ctx.globalAlpha = 0.55 * al;
      ctx.fillStyle = age < 0.12 ? '#e0d6b8' : DUST[i & 1];
      ctx.fillRect(Math.round(cx + Math.cos(a) * s.r), Math.round(cy + Math.sin(a) * s.r * 0.55), age < 0.12 ? 2 : 1, 1);
      ctx.fillRect(Math.round(cx + Math.cos(a) * (s.r - 3)), Math.round(cy + Math.sin(a) * (s.r - 3) * 0.55), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  function drawWText(ctx, t, ox, oy) {
    var k = t.t / TXT_T, x = Math.round(t.x - ox), y = Math.round(t.y - oy - 14 * Math.min(1, k * 1.5));
    ctx.globalAlpha = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4);
    ctx.fillStyle = '#131015'; ctx.fillText(t.s, x + 1, y + 1);
    ctx.fillStyle = t.c; ctx.fillText(t.s, x, y);
  }

  /* ---------- dibujo ---------- */
  // Fuente de píxeles hecha a mano (alto 5, ancho variable). '#' = píxel.
  var FONT = {
    P: ['###', '#.#', '###', '#..', '#..'], L: ['#..', '#..', '#..', '#..', '###'],
    A: ['.#.', '#.#', '###', '#.#', '#.#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
    G: ['###', '#..', '#.#', '#.#', '###'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    O: ['###', '#.#', '#.#', '#.#', '###'], I: ['###', '.#.', '.#.', '.#.', '###'],
    '!': ['#', '#', '#', '.', '#'], '¡': ['#', '.', '#', '#', '#'],
    // v0.9 (H3): las letras que faltaban (¡TRAC!, ¡CRASH!, ¡FUAP!, ¡ZAS!…)
    B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['###', '#..', '#..', '#..', '###'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['###', '#..', '###', '..#', '###'],
    Z: ['###', '..#', '.#.', '#..', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
    J: ['..#', '..#', '..#', '#.#', '###'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Q: ['###', '#.#', '#.#', '###', '..#'], ' ': ['..']
  };
  function textWidth(str) {
    var w = 0;
    for (var i = 0; i < str.length; i++) { var g = FONT[str[i]]; if (g) w += g[0].length + 1; }
    return w - 1;
  }
  function drawGlyphs(ctx, str, x, y, sc, col) {
    ctx.fillStyle = col;
    var cx = x;
    for (var i = 0; i < str.length; i++) {
      var g = FONT[str[i]]; if (!g) continue;
      for (var r = 0; r < 5; r++) for (var c = 0; c < g[r].length; c++) {
        if (g[r][c] === '#') ctx.fillRect(cx + c * sc, y + r * sc, sc, sc);
      }
      cx += (g[0].length + 1) * sc;
    }
  }
  function drawText(ctx, t, ox, oy) {
    var sc = t.t < FX.textPopT ? FX.textPopScale : FX.textScale;
    var w = textWidth(t.s) * sc, h = 5 * sc;
    var x = Math.round(t.x - ox - w / 2), y = Math.round(t.y - oy - h / 2 - FX.textRise * (t.t / FX.textT));
    x = Math.max(2, Math.min(ACH.render.VIEW.w - w - 2 - sc, x));
    y = Math.max(2, y);
    var fade = t.t / FX.textT;
    ctx.globalAlpha = fade < 0.55 ? 1 : Math.max(0, 1 - (fade - 0.55) / 0.45);
    drawGlyphs(ctx, t.s, x + sc, y + sc, sc, YELLOW);    // sombra amarilla
    drawGlyphs(ctx, t.s, x, y, sc, PINK);
    ctx.globalAlpha = 1;
  }

  function drawTrail(ctx, tr, ox, oy) {
    var DIRV = ACH.ent.DIRV[tr.dir], CFG = ACH.ent.CFG, f = Math.atan2(DIRV[1], DIRV[0]);
    var prog = Math.min(1, tr.t / FX.trailSweepT), a0 = f - CFG.atkArc / 2, span = CFG.atkArc * prog;
    var fade = 1 - tr.t / FX.trailT, R = FX.trailReach, cx = tr.x - ox, cy = tr.y - oy;
    ctx.globalAlpha = Math.max(0, fade);
    for (var s = 0; s <= 1.0001; s += 0.02) {            // s: 0 = cola del barrido, 1 = punta
      var a = a0 + span * s, th = Math.max(1, Math.round(FX.trailThick * s * (0.4 + 0.6 * fade) + 0.5));
      if (s > prog + 0.0001) break;
      ctx.fillStyle = s > 0.75 ? WHITE : PALE;
      for (var r = 0; r < th; r++) {
        var rr = R - r;
        ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFlash(ctx, f, ox, oy) {
    var x = Math.round(f.x - ox), y = Math.round(f.y - oy), i;
    if (calma()) { ctx.fillStyle = PALE; ctx.fillRect(x, y, 1, 1); return; }
    ctx.fillStyle = PALE;
    for (i = -2; i <= 2; i++) { ctx.fillRect(x + i, y, 1, 1); ctx.fillRect(x, y + i, 1, 1); }
    ctx.fillStyle = WHITE;
    ctx.fillRect(x - 1, y - 1, 3, 3);
  }

  function draw(ctx, G, ox, oy) {
    var i;
    for (i = 0; i < trails.length; i++) drawTrail(ctx, trails[i], ox, oy);
    for (i = 0; i < spins.length; i++) drawSpin(ctx, spins[i], ox, oy);
    for (i = 0; i < parts.length; i++) {
      var q = parts[i], life = q.t / q.life;
      ctx.globalAlpha = q.dust ? 0.75 * (1 - life) : (life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1);
      ctx.fillStyle = q.col;
      var w = q.dust && life > 0.5 ? q.w + 1 : q.w;       // el polvo se expande
      ctx.fillRect(Math.round(q.x - ox), Math.round(q.y - oy), w, q.dust && life > 0.5 ? q.h + 1 : q.h);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < flashes.length; i++) drawFlash(ctx, flashes[i], ox, oy);
    for (i = 0; i < texts.length; i++) drawText(ctx, texts[i], ox, oy);
    if (wtexts.length) {
      ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (i = 0; i < wtexts.length; i++) drawWText(ctx, wtexts[i], ox, oy);
      ctx.globalAlpha = 1; ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
  }


  /* ======================================================================================================
     VIDA ANIMADA (P6): ambiente que se mueve solo. Todo con sprites horneados de 1 a 8 px o puntos de 1 px,
     solo cerca de la cámara, tope duro de partículas (FX.ambMax = 40). Cada ítem tiene su constante en CFG.fx
     (amb*): 0 apaga, el número es la fuerza. Los ganchos de render.js llaman a drawAmbient(ctx, camX, camY, 'ground'|'air').
     'ground' (suelo, antes del y-sort): anillos en charcos, salpicaduras, basura baja y sombras, sombras de gallinazo.
     'air' (después de la capa alta, antes de niebla y luz): cables sueltos, banderines y ropa, moscas, gotas, basura alta.
     ====================================================================================================== */
  var A = {
    t: 0, sig: '', lastClock: 0, wind: 0, gustPow: 0, windAng: 0, gustT: 2.5, gustLeft: 0, gustDur: 1,
    litter: [], litterInit: true, ripples: [], drips: [], splashes: [], birds: [], birdT: 9,
    cables: [], spans: [], rags: [], puddles: [], dripSrc: [], flySrc: [], eddies: [], flies: 0, last: {}
  };
  var AS = null; // sprites horneados de ambiente

  function resetAmbient() {
    A.litter.length = 0; A.litterInit = true; A.ripples.length = 0; A.drips.length = 0; A.splashes.length = 0; A.birds.length = 0;
    A.gustT = 2.5; A.gustLeft = 0; A.gustPow = 0; A.wind = 0; A.birdT = 9; A.flies = 0;
  }
  function ambOn(key) { return FX.ambient > 0 && FX[key] > 0; }
  function nearCam(x, y, cam, V, m) { return x > cam.x - m && x < cam.x + V.w + m && y > cam.y - m && y < cam.y + V.h + m; }

  function rowsCanvas(rows, pal) {
    var h = rows.length, w = rows[0].length, c = document.createElement('canvas'), g;
    c.width = w; c.height = h; g = c.getContext('2d');
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var col = pal[rows[y].charAt(x)];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  function bakeAmbient() {
    AS = {};
    var paper = { a: '#cfcbb9', b: '#a9a695', c: '#8c8a7e' }, news = { a: '#b5b2a4', b: '#8f8d82', c: '#6f6d66', d: '#55534f' };
    var bag = { a: '#d2d6d4', b: '#a1aaad', c: '#7b8588' }, bagD = { a: '#8e979b', b: '#6f787d', c: '#555d62' };
    AS.litter = [
      [rowsCanvas(['aaaa.', 'abaab', 'aaaab', '.bbbb'], paper), rowsCanvas(['.aaa.', 'bbbbc'], paper), rowsCanvas(['.aa.', 'aaab', 'aabb', '.bbc', '..c.'], paper), rowsCanvas(['aab', 'abb', '.bc'], paper)],
      [rowsCanvas(['.aa..', 'aaab.', 'aabbb', '.abb.', '..bc.'], bag), rowsCanvas(['.aa.', 'aaab', 'abbb', 'aabb', '.abc', '..c.'], bag), rowsCanvas(['.aab..', 'aaabbb', '.abbbc', '..bcc.'], bag), rowsCanvas(['..a..', '.aab.', 'aabbb', '.bbc.', '.cc..'], bag)],
      [rowsCanvas(['aadaa', 'abbab', 'aadaa', '.bccc'], news), rowsCanvas(['.aaa.', 'bdbcc'], news), rowsCanvas(['.ad.', 'aaab', 'abdb', '.bcc', '..c.'], news), rowsCanvas(['aab', 'adb', '.bc'], news)],
      [rowsCanvas(['.aa..', 'aaab.', 'aabbb', '.abb.', '..bc.'], bagD), rowsCanvas(['.aa.', 'aaab', 'abbb', 'aabb', '.abc', '..c.'], bagD), rowsCanvas(['.aab..', 'aaabbb', '.abbbc', '..bcc.'], bagD), rowsCanvas(['..a..', '.aab.', 'aabbb', '.bbc.', '.cc..'], bagD)]
    ];
    // anillos de lluvia: radio 1..4, elipse aplastada (perspectiva 3/4)
    AS.ring = [];
    for (var r = 1; r <= 4; r++) {
      var rw = r * 2 + 3, rh = r + 3, c = document.createElement('canvas'), g;
      c.width = rw; c.height = rh; g = c.getContext('2d'); g.fillStyle = '#b3bec9';
      for (var a = 0; a < 36; a++) {
        var an = a / 36 * Math.PI * 2;
        g.fillRect(Math.round((rw - 1) / 2 + Math.cos(an) * r), Math.round((rh - 1) / 2 + Math.sin(an) * r * 0.5), 1, 1);
      }
      AS.ring.push(c);
    }
    // banderines (3 cuadros: punta izquierda, centro, derecha) y ropa (2 cuadros)
    var PEN = ['#a8574a', '#c2ad6a', '#6f8f86', '#9aa1a8'];
    AS.pen = PEN.map(function (col) {
      var pal = { a: col, b: 'rgba(0,0,0,0.25)' };
      return [rowsCanvas(['aaa', 'aab', '.ab', '..b'].map(function (s, i) { return i === 3 ? 'ab.' : s; }), pal),
              rowsCanvas(['aaa', 'aab', '.a.', '.b.'], pal), rowsCanvas(['aaa', 'baa', 'ba.', '.b.'], pal)];
    });
    var SH = [['#8f7a62', '#b9a78a'], ['#6f8294', '#9fb0bf'], ['#a8574a', '#c98c7e'], ['#bdb9ab', '#dcd8ca']];
    AS.shirt = SH.map(function (c) {
      var pal = { a: c[0], b: c[1], k: '#3a3846' };
      return [rowsCanvas(['k.k.k', 'bbabb', 'baaab', '.aaa.', '.aaa.', '.aab.'], pal), rowsCanvas(['.k.k.', 'bbabb', '.aaab', '.aaa.', 'baaa.', '.ab..'], pal)];
    });
  }
  function bakeBirdShadows() {
    if (AS.bird || !ACH.gfx || !ACH.gfx.gallinazo) return;
    var o = ACH.sprites && ACH.sprites.npc && ACH.sprites.npc.gallinazo && ACH.sprites.npc.gallinazo.fly, n = Array.isArray(o) ? o.length : 1;
    AS.bird = [];
    for (var i = 0; i < n; i++) {
      var s = ACH.gfx.gallinazo('fly', i), w = s.width, h = Math.max(3, Math.round(s.height * 0.55));
      var c = document.createElement('canvas'), g;
      c.width = w; c.height = h; g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(s, 0, 0, w, h);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = '#16141c'; g.fillRect(0, 0, w, h);
      AS.bird.push(c);
    }
  }

  /* ---------- construcción de las listas fijas (una vez, y de nuevo si cambia el mundo) ---------- */
  function topsOf(p) {  // puntas de aislador en px de mundo (de la ficha del sprite)
    var s = p._spr || (ACH.gfx && ACH.gfx.prop && ACH.gfx.prop(p.k, p.v, p.dir, p.fb)), out = [], i;
    var list = s && s.tops;
    if (!list && p.top) return [{ x: p.top.x, y: p.top.y }];
    if (!list) return out;
    for (i = 0; i < list.length; i++) out.push({ x: p.x + list[i].x, y: p.y + list[i].y });
    return out;
  }
  function buildAmbient() {
    var W = ACH.world, T = W.T || 16, i, j;
    A.cables.length = 0; A.spans.length = 0; A.rags.length = 0; A.puddles.length = 0; A.dripSrc.length = 0; A.flySrc.length = 0; A.eddies.length = 0;
    var rnd = (function (s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(8803);
    ['N', 'S'].forEach(function (side, si) {
      var ps = ((W.poles && W.poles[side]) || []).filter(function (p) { return p.top; }).sort(function (a, b) { return a.x - b.x; });
      for (i = 0; i < ps.length; i++) {
        var p = ps[i], tops = topsOf(p);
        if (!tops.length) continue;
        tops.sort(function (a, b) { return a.x - b.x; });
        if (i % 3 === 1 || i % 7 === 4) A.cables.push({ x: tops[0].x + 1, y: tops[0].y + 1, len: 16 + ((rnd() * 10) | 0), ph: rnd() * 6.28, w: 1.1 + rnd() * 0.5 });
        if (i % 6 === 4 && tops.length > 1) { var tt = tops[tops.length - 1]; A.cables.push({ x: tt.x, y: tt.y + 1, len: 12 + ((rnd() * 8) | 0), ph: rnd() * 6.28, w: 1.4 + rnd() * 0.4 }); }
        // goteo de la cruceta: una punta por poste, sobre la vereda
        A.dripSrc.push({ x: tops[(i + si) % tops.length].x + 0.5, y: tops[(i + si) % tops.length].y + 2, gy: p.y + 1, next: rnd() * 3 });
        if (i % 4 === 2) A.rags.push({ x: p.top.x + 1, y: p.top.y + 7, ph: rnd() * 6.28, col: i % 8 === 2 ? 0 : 1 });
        if (i + 1 < ps.length && ps[i + 1].x - p.x <= 16 * T) {      // la misma curva que los cables horneados de render.js
          var F = FX, a = p.top, b = ps[i + 1].top, sag = F.cableSag + (i % 2 ? 2 : 0), kind = (i * 3 + si * 5) % 7;
          if (kind === 2 || kind === 5) {
            var sp = { ax: a.x, ay: a.y - F.cableWireDx / 2, bx: b.x, by: b.y - F.cableWireDx / 2, sag: sag, shirt: kind === 5, items: [] }, n = sp.shirt ? 3 : 6;
            for (j = 0; j < n; j++) sp.items.push({ t: sp.shirt ? 0.28 + j * 0.2 + rnd() * 0.05 : 0.14 + j * (0.72 / (n - 1)), c: (rnd() * 4) | 0, ph: rnd() * 6.28 });
            A.spans.push(sp);
          }
        }
      }
    });
    // goteo de toldos (fachada norte): el borde delantero queda ~19 px sobre la base del lote y cae ~31 px a la vereda.
    // Si el motor publica ACH.world.lotsBaked[i].awnings = [{x, y, w}] (px de mundo, borde delantero), se usa eso.
    var lb = W.lotsBaked, gotAwn = false;
    if (lb && lb.length) lb.forEach(function (e) {
      (e && e.awnings || []).forEach(function (a) {
        gotAwn = true;
        for (j = 0; j < 2; j++) A.dripSrc.push({ x: Math.round(a.x + a.w * (j ? 0.72 : 0.28)), y: a.y, gy: a.y + 30, next: rnd() * 3 });
      });
    });
    if (!gotAwn) (W.LOTS || []).forEach(function (f) {
      if (f.side !== 'N' || !f.front || f.front.indexOf('toldo') < 0) return;
      var y = (f.r1 + 1) * T - 19;
      for (j = 0; j < 2; j++) A.dripSrc.push({ x: f.c0 * T + (j ? 44 : 14), y: y, gy: y + 31, next: rnd() * 3 });
    });
    // charcos y basura
    var d = W.decals || [];
    for (i = 0; i < d.length; i++) if (d[i].k === 'charco') {
      var s = ACH.gfx.decal('charco', d[i].v);
      A.puddles.push({ x: d[i].x, y: d[i].y - s.height * 0.5, rx: s.width * 0.5, ry: s.height * 0.5, next: rnd() * 1.5 });
    }
    for (i = 0; i < W.props.length; i++) {
      var q = W.props[i];
      if (q.k === 'trash' || q.k === 'bags') A.flySrc.push({ x: q.x, y: q.y - 5, id: i });
    }
    // remolinos en la boca de los jirones
    (W.JIRONES || []).forEach(function (J) {
      var cx = (J[0] + J[1] + 1) * T / 2;
      A.eddies.push({ x: cx, y: 15 * T, r: 40 }, { x: cx, y: 35 * T, r: 40 });
    });
  }

  /* ---------- viento: ráfagas cada 8–15 s ---------- */
  function updateWind(dt) {
    if (A.gustLeft > 0) {
      A.gustLeft -= dt;
      A.gustPow = A.gustLeft > 0 ? Math.sin(Math.PI * (1 - A.gustLeft / A.gustDur)) : 0;
    } else {
      A.gustPow = 0; A.gustT -= dt;
      if (A.gustT <= 0) {
        A.gustDur = A.gustLeft = rand(2.6, 4.6);
        A.windAng = rand(-0.4, 0.4) + (Math.random() < 0.3 ? Math.PI : 0);
        var e = FX.ambGustEvery || [8, 15]; A.gustT = rand(e[0], e[1]) + A.gustDur;
      }
    }
    A.wind = (0.1 + 0.9 * A.gustPow) * FX.ambGust;
  }
  function rainNorm() {   // 0..1, misma onda que las gotas grandes de la garúa (render.js)
    var t = ACH.G ? ACH.G.clock : A.t, g = Math.sin(t * 0.37) + Math.sin(t * 0.91 + 1.3) * 0.6;
    return Math.max(0, Math.min(1, (g + 1.6) / 3.2));
  }

  /* ---------- basura al viento ---------- */
  function litterSpawn(cam, V, M, visibleOK) {
    var W = ACH.world, T = W.T || 16;
    for (var k = 0; k < 14; k++) {
      var x, y, e = A.eddies[(Math.random() * A.eddies.length) | 0];
      if (e && Math.random() < 0.3 && nearCam(e.x, e.y, cam, V, M)) { var an = Math.random() * 6.28, rr = rand(8, e.r); x = e.x + Math.cos(an) * rr; y = e.y + Math.sin(an) * rr * 0.6; }
      else if (visibleOK) { x = cam.x + 8 + Math.random() * (V.w - 16); y = cam.y + 8 + Math.random() * (V.h - 16); }
      else { x = cam.x - M + Math.random() * (V.w + 2 * M); y = cam.y - M + Math.random() * (V.h + 2 * M); }
      if (!visibleOK && x > cam.x - 4 && x < cam.x + V.w + 4 && y > cam.y - 4 && y < cam.y + V.h + 4) continue;
      if (x < 0 || y < 0 || x >= W.W || y >= W.H || W.isSolidTile(Math.floor(x / T), Math.floor(y / T))) continue;
      var kind = Math.random() < 0.55 ? 0 : (Math.random() < 0.7 ? 1 : (Math.random() < 0.5 ? 2 : 3));
      A.litter.push({ x: x, y: y, z: 0, vx: 0, vy: 0, vz: 0, kind: kind, f: (Math.random() * 4) | 0, anim: Math.random() * 4, fly: false, k: Math.random(), lag: Math.random() * 1.5 });
      return;
    }
  }
  function updateLitter(dt, cam, V) {
    var W = ACH.world, T = W.T || 16, M = FX.ambNear, n = Math.min(10, Math.round(FX.ambLitter)), i, j, it;
    for (i = A.litter.length - 1; i >= 0; i--) {   // fuera de la zona cercana: se retira (reaparece al otro lado)
      it = A.litter[i];
      if (it.x < cam.x - M * 1.6 || it.x > cam.x + V.w + M * 1.6 || it.y < cam.y - M * 1.6 || it.y > cam.y + V.h + M * 1.6 || A.litter.length > n) A.litter.splice(i, 1);
    }
    if (A.litter.length < n) {
      var tries = A.litterInit ? n * 3 : 2;
      while (tries-- > 0 && A.litter.length < n) litterSpawn(cam, V, M, A.litterInit);
      if (A.litter.length >= n) A.litterInit = false;
    }
    var wind = A.wind, wx = Math.cos(A.windAng), wy = Math.sin(A.windAng) * 0.45;
    for (i = 0; i < A.litter.length; i++) {
      it = A.litter[i];
      if (!it.fly) {
        if (wind > 0.28 && (it.lag -= dt) <= 0 && Math.random() < dt * 3 * Math.min(1, wind)) { it.fly = true; it.vz = rand(30, 60); it.lag = rand(0.3, 1.5); }
        continue;
      }
      var sp = 38 + it.k * 46;
      it.vx += (wx * wind * sp - it.vx) * Math.min(1, dt * 2.2);
      it.vy += (wy * wind * sp + Math.sin(A.t * 1.7 + it.k * 9) * 6 * wind - it.vy) * Math.min(1, dt * 2.2);
      for (j = 0; j < A.eddies.length; j++) {       // remolino en las esquinas de los jirones
        var e = A.eddies[j], dx = it.x - e.x, dy = (it.y - e.y) / 0.6, d = Math.sqrt(dx * dx + dy * dy);
        if (d < e.r && d > 1 && wind > 0.12) {
          var ts = 70 * (1 - d / e.r) * Math.min(1, wind * 1.6) * dt * 4;
          it.vx += -dy / d * ts; it.vy += dx / d * ts * 0.6; it.vz += 34 * dt * (1 - d / e.r);
        }
      }
      it.vz -= 170 * dt; it.z += it.vz * dt;
      if (it.z <= 0) {
        it.z = 0;
        if (wind > 0.22) it.vz = rand(18, 48) * Math.min(1, wind * 1.5); else it.vz = 0;
      }
      var nx = it.x + it.vx * dt, ny = it.y + it.vy * dt;
      var hit = false;
      if (W.isSolidTile(Math.floor(nx / T), Math.floor(it.y / T))) { it.vy += (Math.random() < 0.5 ? -1 : 1) * 30; it.vx = -it.vx * 0.3; nx = it.x; hit = true; }
      if (W.isSolidTile(Math.floor(nx / T), Math.floor(ny / T))) { it.vy = -it.vy * 0.4; ny = it.y; hit = true; }
      it.blockT = hit ? (it.blockT || 0) + dt : 0;
      if (it.blockT > 0.5) { it.fly = false; it.z = 0; it.vx = it.vy = it.vz = 0; it.blockT = 0; it.lag = rand(2, 4); it.f = Math.floor(it.anim) & 3; continue; }   // atascada contra una pared: se queda ahí
      it.x = nx; it.y = ny;
      it.anim += dt * (3 + Math.sqrt(it.vx * it.vx + it.vy * it.vy) * 0.22 + it.z * 0.3);
      if (wind < 0.16 && it.z === 0) {
        var k = Math.exp(-4 * dt); it.vx *= k; it.vy *= k;
        if (Math.abs(it.vx) + Math.abs(it.vy) < 5) { it.fly = false; it.vx = it.vy = 0; it.f = Math.floor(it.anim) & 3; }
      }
    }
  }
  function drawLitter(ctx, ox, oy, high) {
    for (var i = 0; i < A.litter.length; i++) {
      var it = A.litter[i], fr = AS.litter[it.kind][it.fly ? Math.floor(it.anim) & 3 : it.f];
      var sx = Math.round(it.x - ox), sy = Math.round(it.y - oy);
      if (sx < -12 || sx > 492 || sy < -12 || sy > 284) continue;
      if (!high) {   // sombra: siempre en el suelo, más tenue cuanto más alto
        ctx.globalAlpha = Math.max(0.08, 0.28 - it.z * 0.015);
        ctx.fillStyle = '#2a2440'; ctx.fillRect(sx - 1, sy, Math.max(2, fr.width - 1), 1);
      }
      if ((it.z >= 3) !== high) continue;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(fr, sx - (fr.width >> 1), sy - Math.round(it.z) - fr.height);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- anillos de lluvia en los charcos ---------- */
  function updateRipples(dt, cam, V, budget) {
    var i, p, rate = FX.ambRipples * (0.35 + 1.3 * rainNorm());
    for (i = A.ripples.length - 1; i >= 0; i--) { A.ripples[i].t += dt; if (A.ripples[i].t >= 0.8) A.ripples.splice(i, 1); }
    for (i = 0; i < A.puddles.length; i++) {
      p = A.puddles[i];
      if (!nearCam(p.x, p.y, cam, V, 24)) continue;
      p.next -= dt * rate;
      if (p.next > 0) continue;
      p.next = rand(0.25, 0.9);
      if (A.ripples.length >= Math.min(6, budget)) continue;
      var an = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * 0.62;
      A.ripples.push({ x: p.x + Math.cos(an) * rr * p.rx, y: p.y + Math.sin(an) * rr * p.ry, t: 0 });
    }
  }
  function drawRipples(ctx, ox, oy) {
    for (var i = 0; i < A.ripples.length; i++) {
      var q = A.ripples[i], fi = Math.min(3, Math.floor(q.t / 0.2)), c = AS.ring[fi];
      ctx.globalAlpha = 0.75 * (1 - q.t / 0.8) * FX.ambRipples > 0.9 ? 0.9 : 0.75 * (1 - q.t / 0.8);
      ctx.drawImage(c, Math.round(q.x - ox) - (c.width >> 1), Math.round(q.y - oy) - (c.height >> 1));
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- goteo de cruceta y toldos ---------- */
  function updateDrips(dt, cam, V, budget) {
    var i, s, q;
    for (i = A.drips.length - 1; i >= 0; i--) {
      q = A.drips[i]; q.vz += 260 * dt; q.z -= q.vz * dt;
      if (q.z <= 0) { A.splashes.push({ x: q.x, y: q.gy, t: 0 }); A.drips.splice(i, 1); }
    }
    for (i = A.splashes.length - 1; i >= 0; i--) { A.splashes[i].t += dt; if (A.splashes[i].t >= 0.3) A.splashes.splice(i, 1); }
    var rate = FX.ambDrips * (0.5 + rainNorm());
    for (i = 0; i < A.dripSrc.length; i++) {
      s = A.dripSrc[i];
      if (!nearCam(s.x, s.gy, cam, V, 8)) continue;
      s.next -= dt * rate;
      if (s.next > 0) continue;
      s.next = rand(1.6, 4.2);
      if (A.drips.length + A.splashes.length < Math.min(8, budget)) A.drips.push({ x: s.x, gy: s.gy, z: Math.max(2, s.gy - s.y), vz: 0 });
    }
  }
  function drawDrips(ctx, ox, oy, air) {
    var i, q;
    if (air) {
      for (i = 0; i < A.drips.length; i++) {
        q = A.drips[i];
        var sx = Math.round(q.x - ox), sy = Math.round(q.gy - q.z - oy);
        ctx.globalAlpha = 0.7; ctx.fillStyle = '#aeb9c4'; ctx.fillRect(sx, sy, 1, 1);
        ctx.globalAlpha = 0.4; ctx.fillRect(sx, sy - 1, 1, 1);
      }
    } else {
      for (i = 0; i < A.splashes.length; i++) {
        q = A.splashes[i];
        var px = Math.round(q.x - ox), py = Math.round(q.y - oy);
        ctx.fillStyle = '#aeb9c4';
        if (q.t < 0.12) { ctx.globalAlpha = 0.7; ctx.fillRect(px - 1, py - 1, 1, 1); ctx.fillRect(px + 1, py - 1, 1, 1); ctx.fillRect(px, py, 1, 1); }
        else { ctx.globalAlpha = 0.45 * (1 - q.t / 0.3) + 0.1; ctx.fillRect(px - 2, py, 1, 1); ctx.fillRect(px + 2, py, 1, 1); ctx.fillRect(px, py - 1, 1, 1); }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- cables sueltos que se mecen ---------- */
  function drawCables(ctx, ox, oy, cam, V) {
    var k = FX.ambCables, amp0 = 0.07 + 0.2 * A.wind;
    ctx.fillStyle = '#17151b';
    for (var i = 0; i < A.cables.length; i++) {
      var c = A.cables[i];
      if (!nearCam(c.x, c.y + 10, cam, V, 8)) continue;
      var x = c.x - ox, y = c.y - oy, windSign = Math.cos(A.windAng) >= 0 ? 1 : -1;
      ctx.globalAlpha = Math.min(1, 0.85 * k);
      for (var s = 0; s < c.len; s++) {
        var u = s / c.len, th = (amp0 * Math.sin(A.t * c.w * 1.6 + c.ph - u * 1.6) + 0.16 * A.wind * windSign) * (0.4 + u);
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        x += Math.sin(th); y += Math.cos(th);
      }
      ctx.fillStyle = '#4a4756'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); ctx.fillStyle = '#17151b';   // punta pelada
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- banderines, ropa y trapos ---------- */
  function spanPt(s, t) {
    var u = 1 - t, my = (s.ay + s.by) / 2 + s.sag * 2;
    return [u * s.ax + t * s.bx, u * u * s.ay + 2 * u * t * my + t * t * s.by];
  }
  function drawCloth(ctx, ox, oy, cam, V) {
    var k = FX.ambCloth, flap = 3 + A.wind * 7, i, j;
    ctx.globalAlpha = Math.min(1, 0.9 * k);
    for (i = 0; i < A.spans.length; i++) {
      var s = A.spans[i], mx = (s.ax + s.bx) / 2;
      if (mx < cam.x - 90 || mx > cam.x + V.w + 90) continue;
      for (j = 0; j < s.items.length; j++) {
        var it = s.items[j], pt = spanPt(s, it.t), wave = Math.sin(A.t * flap + it.ph + it.t * 5);
        if (s.shirt) {
          var sh = AS.shirt[it.c][wave > 0.2 ? 1 : 0];
          ctx.drawImage(sh, Math.round(pt[0] - ox) - 2, Math.round(pt[1] - oy));
        } else {
          var pn = AS.pen[it.c][wave > 0.45 ? 2 : (wave < -0.45 ? 0 : 1)];
          ctx.drawImage(pn, Math.round(pt[0] - ox) - 1, Math.round(pt[1] - oy) + 1);
        }
      }
    }
    // trapos atados al poste: dos hileras de 1 px que ondulan hacia donde sopla
    var dir = Math.cos(A.windAng) >= 0 ? 1 : -1;
    for (i = 0; i < A.rags.length; i++) {
      var r = A.rags[i];
      if (r.x < cam.x - 10 || r.x > cam.x + V.w + 10 || r.y < cam.y - 10 || r.y > cam.y + V.h + 10) continue;
      var len = 7;
      for (j = 0; j < len; j++) {
        var yy = Math.round(Math.sin(A.t * (5 + A.wind * 8) + r.ph - j * 0.9) * (0.3 + j * 0.16) * (0.6 + A.wind));
        ctx.fillStyle = r.col ? '#6f8f86' : '#a8574a';
        ctx.fillRect(Math.round(r.x - ox) + j * dir, Math.round(r.y - oy) + yy, 1, 2);
        if (j < len - 1) { ctx.fillStyle = r.col ? '#8fb0a6' : '#c98c7e'; ctx.fillRect(Math.round(r.x - ox) + j * dir, Math.round(r.y - oy) + yy, 1, 1); }
      }
    }
    // tendales horneados por el motor: ACH.world.lotsBaked[i].cloth = [{x, y, w}] en px de mundo (la cuerda va de x a x+w en la fila y)
    var lb = ACH.world && ACH.world.lotsBaked;
    if (lb && lb.length) for (i = 0; i < lb.length; i++) {
      var cl = lb[i] && lb[i].cloth;
      if (!cl) continue;
      for (j = 0; j < cl.length; j++) {
        var c = cl[j];
        if (c.x + c.w < cam.x || c.x > cam.x + V.w || c.y < cam.y - 8 || c.y > cam.y + V.h + 8) continue;
        for (var q = 4; q < c.w - 3; q += 8) {
          var w2 = Math.sin(A.t * flap + q * 0.7 + c.x);
          ctx.drawImage(AS.shirt[(q + c.x) & 3][w2 > 0.2 ? 1 : 0], Math.round(c.x + q - ox) - 2, Math.round(c.y - oy));
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- moscas: puntos de 1 px en lazos cortos, sin estado (salen del tiempo) ---------- */
  function flyDots(ctx, cx, cy, ox, oy, id, n) {
    for (var j = 0; j < n; j++) {
      var ph = id * 1.7 + j * 2.3, w = A.t * (2.6 + j * 0.5) + ph;
      var x = cx + Math.cos(w) * (3.2 + j) + Math.sin(w * 2.9 + ph) * 1.2;
      var y = cy + Math.sin(w * 1.3) * 2.4 + Math.cos(w * 3.7) * 1;
      if (Math.sin(A.t * 17 + ph * 3) < -0.85) continue;     // parpadeo: a veces se pierde de vista
      var fx = Math.round(x - ox), fy = Math.round(y - oy);
      ctx.fillRect(fx, fy, 1, 1);
      if (Math.sin(A.t * 41 + ph * 5) > 0.3) { ctx.fillStyle = '#7d827e'; ctx.fillRect(fx + 1, fy - 1, 1, 1); ctx.fillStyle = '#121016'; }   // destello del ala: se lee también sobre una bolsa negra
    }
    return n;
  }
  function drawFlies(ctx, ox, oy, cam, V, budget) {
    var G = ACH.G, i, used = 0, per = 3, m = 18;
    ctx.fillStyle = '#121016'; ctx.globalAlpha = Math.min(1, 0.85 * FX.ambFlies);
    for (i = 0; i < A.flySrc.length && used + per <= budget; i++) {
      var s = A.flySrc[i];
      if (!nearCam(s.x, s.y, cam, V, m)) continue;
      used += flyDots(ctx, s.x, s.y, ox, oy, s.id, per);
    }
    if (G && G.zombies) for (i = 0; i < G.zombies.length && used + 2 <= budget; i++) {
      var z = G.zombies[i];
      if (z.state !== 'muerto' || z.deadT < 1.2 || z.deadT > 9.5 || !nearCam(z.x, z.y, cam, V, m)) continue;
      used += flyDots(ctx, z.x, z.y - 3, ox, oy, 100 + i, 2);
    }
    ctx.globalAlpha = 1; A.flies = used;
  }

  /* ---------- sombras de gallinazo que cruzan en círculos ---------- */
  function updateBirds(dt, cam, V, budget) {
    var i, b;
    for (i = A.birds.length - 1; i >= 0; i--) {
      b = A.birds[i]; b.t += dt; b.ang += b.w * dt; b.cx += b.dx * dt;
      b.x = b.cx + Math.cos(b.ang) * b.r; b.y = b.cy + Math.sin(b.ang) * b.r * 0.55;
      if (b.t >= b.life) A.birds.splice(i, 1);
    }
    A.birdT -= dt;
    if (A.birdT <= 0) {
      A.birdT = rand(16, 34) / FX.ambBirds;
      if (A.birds.length < Math.min(2, budget)) {
        var an = Math.random() * 6.28;
        A.birds.push({ t: 0, life: rand(11, 17), cx: cam.x + V.w / 2 + rand(-70, 70), cy: cam.y + V.h / 2 + rand(-30, 30), dx: rand(-9, 9), r: rand(46, 84), ang: an,
          w: (Math.random() < 0.5 ? -1 : 1) * rand(0.32, 0.5), x: 0, y: 0, ph: Math.random() * 3 });
      }
    }
  }
  function drawBirds(ctx, ox, oy) {
    if (!A.birds.length) return;
    bakeBirdShadows();
    if (!AS.bird || !AS.bird.length) return;
    for (var i = 0; i < A.birds.length; i++) {
      var b = A.birds[i], f = Math.min(1, b.t / 1.5, (b.life - b.t) / 1.5), c = AS.bird[Math.floor(A.t * 5 + b.ph) % AS.bird.length];
      var sx = Math.round(b.x - ox), sy = Math.round(b.y - oy), left = b.w * Math.sin(b.ang) * -1 < 0;   // rumbo: derivada de la órbita
      var vx = -Math.sin(b.ang) * b.w + b.dx / (b.r || 1) * 0;
      for (var pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass ? 0.09 : 0.2) * f * FX.ambBirds;
        if (vx < 0) { ctx.save(); ctx.translate(sx + pass + (c.width >> 1), sy - (c.height >> 1)); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0); ctx.restore(); }
        else ctx.drawImage(c, sx + pass - (c.width >> 1), sy - (c.height >> 1));
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- API de ambiente ---------- */
  function ambTotal() { return A.litter.length + A.ripples.length + A.drips.length + A.splashes.length + A.birds.length + A.flies; }
  function updateAmbient(dt) {
    var G = ACH.G, W = ACH.world;
    if (!G || !G.cam || !W || !W.props || !W.props.length || !ACH.render || FX.ambient <= 0) return;
    if (!AS) bakeAmbient();
    A.lastClock = G.clock;
    var V = ACH.render.VIEW, cam = G.cam, sig = W.props.length + ':' + (W.decals ? W.decals.length : 0) + ':' + (W.lotsBaked ? W.lotsBaked.length : 0);
    if (sig !== A.sig) { A.sig = sig; buildAmbient(); }
    A.t += dt;
    updateWind(dt);
    var max = FX.ambMax > 40 ? 40 : FX.ambMax;
    if (ambOn('ambLitter')) updateLitter(dt, cam, V); else A.litter.length = 0;
    if (ambOn('ambRipples')) updateRipples(dt, cam, V, max - A.litter.length - A.flies); else A.ripples.length = 0;
    if (ambOn('ambDrips')) updateDrips(dt, cam, V, max - A.litter.length - A.ripples.length - A.flies); else { A.drips.length = 0; A.splashes.length = 0; }
    if (ambOn('ambBirds')) updateBirds(dt, cam, V, max - ambTotal() + A.birds.length); else A.birds.length = 0;
  }
  function drawAmbient(ctx, camX, camY, layer) {
    var G = ACH.G;
    if (!G || !G.cam || FX.ambient <= 0 || !ACH.world || !ACH.render) return;
    if (layer === 'ground') {  // pantallas sin paso de juego (título, intro, victoria): el ambiente sigue vivo con el reloj
      var st = G.state;
      if ((st === 'title' || st === 'intro' || st === 'won') && G.clock > A.lastClock) updateAmbient(Math.min(0.1, G.clock - A.lastClock));
    }
    if (!AS) return;
    var V = ACH.render.VIEW, cam = { x: camX, y: camY }, max = FX.ambMax > 40 ? 40 : FX.ambMax;
    if (layer === 'ground') {
      if (A.ripples.length) drawRipples(ctx, camX, camY);
      if (A.splashes.length) drawDrips(ctx, camX, camY, false);
      if (A.litter.length) drawLitter(ctx, camX, camY, false);
      if (A.birds.length) drawBirds(ctx, camX, camY);
    } else if (layer === 'air') {
      if (ambOn('ambCables')) drawCables(ctx, camX, camY, cam, V);
      if (ambOn('ambCloth')) drawCloth(ctx, camX, camY, cam, V);
      if (A.drips.length) drawDrips(ctx, camX, camY, true);
      if (A.litter.length) drawLitter(ctx, camX, camY, true);
      if (ambOn('ambFlies')) drawFlies(ctx, camX, camY, cam, V, Math.min(FX.ambFliesMax, max - ambTotal() + A.flies)); else A.flies = 0;
    }
  }

  ACH.fx = { calma: calma, FX: FX, drawAmbient: drawAmbient, updateAmbient: updateAmbient, drawSmoke: drawSmoke, reset: reset, update: update, updateShake: updateShake, swing: swing, hit: hit, draw: draw,
    text: text, shake: shakePub, spin: spin, sparks: sparks, glass: glass, dust: dustPuff,   // v0.9 (H3)
    counts: function () { return { parts: parts.length, texts: texts.length, trails: trails.length, flashes: flashes.length, smoke: smoke.length,
      amb: { litter: A.litter.length, ripples: A.ripples.length, drips: A.drips.length, splashes: A.splashes.length, birds: A.birds.length, flies: A.flies,
        total: ambTotal(), cables: A.cables.length, spans: A.spans.length, rags: A.rags.length, puddles: A.puddles.length, dripSrc: A.dripSrc.length, wind: +A.wind.toFixed(2) } }; },
    ambient: A };
})();
