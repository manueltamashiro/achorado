/* ACHORADO v0.14 — js/engine/volumen.js  «Capa B: volumen y sombras dentro del mundo» (contrato juego/V014.md)
 * SOLO DIBUJO: no toca posiciones lógicas, hitboxes, colisiones ni velocidades. render.js llama aquí por ganchos chicos
 * (busca «v0.14 (B)» en render.js). Todo lo horneable se hornea una vez en buildGround; lo de cada cuadro usa 2 búferes compartidos.
 *
 *  Edificios (horneado, una vez por lote):  lot(g, res, f, lx, ly)
 *     degradé vertical de fachada (arriba más clara, abajo más oscura), banda de oclusión en la base, borde de azotea con luz
 *     (y labio oscuro debajo), bordes de techo del lado del cielo con luz, reflejo leve en las ventanas que el lote declara (res.lights).
 *  Sombras horneadas suaves: buildingShadow() (sin dientes de 2 px, penumbra que se abre lejos del muro), ao() (degradé, no escalones),
 *     softBlit() (sombras SE de props con borde suave).
 *  Actores (cada cuadro):
 *     shadows()  capa de sombras a media resolución (se agranda con suavizado = borde suave): silueta del cuadro actual proyectada al SE
 *                como el sol horneado + mancha de contacto; con el salto se aleja, se achica y se aclara; late con el paso.
 *                De noche: segunda sombra alargada que se aleja del farol encendido más cercano.
 *     actor()    inclinación al correr y squash al aterrizar / recibir golpe (solo la transformación del dibujo, en todas las capas).
 *     rimPass()  una pasada de pantalla sobre la capa de personajes de render.js (entC): rim de luz arriba-izquierda (lado del cielo),
 *                borde oscuro abajo-derecha y oclusión a los pies. Costo fijo, no por actor.
 *  API: ACH.volumen = { on(), setOn(b), stats(), P (parámetros) }. ?vol=0 lo apaga; localStorage['ach.vol'] = '0' | '1'.
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  // ---------------- Parámetros (0 = apagado). Lo horneado se rehace con ACH.render.rebake(). ----------------
  var P = {
    // edificios (horneado)
    faceTop: 0.10,        // luz sobre la parte alta de la fachada
    faceBottom: 0.40,     // oscuro hacia la base de la fachada
    faceAO: 0.40, faceAOpx: 6,   // banda de oclusión al pie de la fachada (alfa, alto en px)
    parapet: 0.34,        // línea de luz en el borde de azotea (donde el techo se vuelve fachada)
    parapetLip: 0.22,     // sombra bajo el labio de la azotea
    roofEdge: 0.16,       // luz en los bordes norte/oeste del techo (lado del cielo); el borde este se oscurece a la mitad
    roofGrad: 0.10,       // el techo se oscurece un poco hacia el sur
    glint: 0.22,          // reflejo diagonal en las ventanas declaradas
    shadowSoft: 1,        // sombra de manzana: 1 = suave (penumbra), 0 = la vieja con dientes
    penumbra: 5,          // px de penumbra al final de la sombra de manzana
    // actores (cada cuadro)
    cast: 1.0,            // fuerza de la capa de sombras de actores (multiplica a CFG.fx.contactShadow / 0.45)
    castLen: 0.42,        // largo de la sombra del sol (fracción de la altura; props usan 0.45)
    castA: 0.72, blobA: 0.8,   // opacidad dentro de la capa: silueta proyectada y mancha de contacto
    nightLen: 1.25, nightR: 120, nightA: 1.0,    // sombra del farol: largo máximo, radio de alcance, opacidad
    rim: 0, rimNight: 0, rimCol: '#eef2f8', rimPx: 2,   // luz de borde (día / noche). v0.16: apagada (0.34 / 0.16): se veía como un borde blanco alrededor de los personajes
    edge: 0.42, edgeCol: '#1a1626',                 // borde oscuro abajo-derecha
    bodyFeet: 0.40,       // oclusión a los pies (degradé en las 7 filas sobre los pies de cada actor)
    lean: 0.085,          // inclinación al correr (px de corrimiento por px de alto; 24 px → ~2 px arriba)
    land: 0.13, landSq: 0.12,  // squash al aterrizar: duración (s) y fuerza
    hit: 0.10, hitSq: 0.08,    // squash al recibir golpe
    vignetteFx: 0.35,     // viñeta CPU cuando la lente WebGL (ACH.postfx) está activa: la suya ya cierra las esquinas
    // ---- v0.14.1 ----
    loose: 1,             // drawables sueltos (NPC de Miraflores/Costa Verde, vendedores, ganchos ysort, objetos de armas.js) con sombra
                          //   proyectada + rim/borde/pies como los actores. Opt-out por objeto: {vol:false}. 0 = como v0.14
    looseA: 0.62,         // opacidad de su silueta proyectada (dentro de la capa de sombras)
    zLean: 0.045,         // inclinación de zombis al caminar (px por px de alto; la de Alexander es 0.085)
    zLeanV: 30,           // px/s de mundo a los que la inclinación del zombi llega al máximo
    clouds: 0.075,        // sombras de nubes de día (alfa máximo; 0 = apagado). «Panza de burro»: grandes, lentas, apenas se notan
    cloudScale: 2.4,      // px de mundo por texel de la textura de nubes (256² → ~614 px de mundo por repetición)
    cloudVX: -5, cloudVY: 1.6,   // velocidad de deriva (px de mundo / s)
    motes: 1,             // partículas ambientales (0 = apagado): motas de día, polvo/garúa en la luz de los faroles de noche, brisa en Costa Verde
    motesN: 22, motesA: 0.20,      // motas en el aire de día (cantidad, alfa)
    lampDustN: 8, lampDustA: 0.42, // garúa/polvo en cada farol encendido (por farol, hasta lampMax faroles en pantalla)
    lampMax: 8,
    breezeN: 16, breezeA: 0.16,    // brisa marina en Costa Verde (estelas finas que corren con el viento)
    seaGlint: 0.85,       // brillo/reflejo animado del mar de Costa Verde (0 = apagado)
    seaGlintN: 110,
    hitFlash: 1,          // destello de luz al tumbar un zombi (luz breve en el mapa de luz + halo aditivo). La opción calma lo apaga
    hitFlashR: 72, hitFlashT: 0.13, hitFlashA: 0.85, hitFlashDay: 0.22
  };

  var ON = true;
  try { if (/[?&]vol=0\b/.test(location.search || '')) ON = false; else if (localStorage.getItem('ach.vol') === '0') ON = false; } catch (e) { /* sin almacenamiento */ }

  function mk(w, h, gpu) { var c = document.createElement('canvas'); if (gpu && ACH.lienzo) ACH.lienzo.gpu(c); c.width = w; c.height = h; return c; }
  function R() { return ACH.render && ACH.render.vol; }   // internos de render.js (playerSprite, zombieSprite, LIGHTS…)
  function nightT() { var N = ACH.noche; return N && N.t > 0 ? Math.min(1, N.t) : 0; }

  // =====================================================================================================
  //  EDIFICIOS (horneado)
  // =====================================================================================================
  var bake = null, bakeG = null, bakeMs = 0;
  function bakeBuf(w, h) {
    if (!bake) { bake = mk(Math.max(64, w), Math.max(64, h)); bakeG = bake.getContext('2d'); }
    if (bake.width < w || bake.height < h) { bake.width = Math.max(bake.width, w); bake.height = Math.max(bake.height, h); }
    bakeG.setTransform(1, 0, 0, 1, 0, 0); bakeG.globalAlpha = 1; bakeG.globalCompositeOperation = 'source-over';
    bakeG.imageSmoothingEnabled = false;
    bakeG.clearRect(0, 0, w, h);
    return bakeG;
  }
  function vgrad(g, y0, y1, stops) {
    var gr = g.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
    return gr;
  }
  function rgba(r, gg, b, a) { return 'rgba(' + r + ',' + gg + ',' + b + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }

  // Dibuja el lote en g con volumen. Devuelve true si lo dibujó (si no, render.js lo dibuja como siempre).
  function lot(g, res, f, lx, ly) {
    if (!ON || !res || !res.canvas || f.walk) return false;
    var t0 = now(), W = ACH.world, T = W.T, cv = res.canvas, w = cv.width, h = cv.height;
    var face = 0;
    try { face = Math.round((W.effFace ? W.effFace(f, res) : (f.face || 0)) * T); } catch (e) { face = 0; }
    face = Math.max(0, Math.min(h, face));
    var b = bakeBuf(w, h), yf = h - face;     // yf = fila donde el techo se vuelve fachada
    b.drawImage(cv, 0, 0);
    b.globalCompositeOperation = 'source-atop';   // solo sobre los píxeles del lote
    // techo: leve oscurecimiento hacia el sur + bordes del lado del cielo con luz
    if (yf > 2) {
      if (P.roofGrad > 0) { b.fillStyle = vgrad(b, 0, yf, [[0, rgba(255, 255, 255, P.roofGrad * 0.4)], [0.5, 'rgba(0,0,0,0)'], [1, rgba(26, 22, 40, P.roofGrad)]]); b.fillRect(0, 0, w, yf); }
      if (P.roofEdge > 0) {
        b.fillStyle = rgba(240, 244, 250, P.roofEdge); b.fillRect(0, 0, w, 1); b.fillRect(0, 0, 1, yf);
        b.fillStyle = rgba(240, 244, 250, P.roofEdge * 0.45); b.fillRect(0, 1, w, 1);
        b.fillStyle = rgba(26, 22, 40, P.roofEdge * 0.6); b.fillRect(w - 1, 0, 1, yf);
      }
    }
    if (face > 3) {
      // fachada: luz arriba, sombra abajo (cielo panza de burro: luz cenital difusa)
      b.fillStyle = vgrad(b, yf, h, [[0, rgba(255, 250, 240, P.faceTop)], [0.4, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [1, rgba(30, 26, 46, P.faceBottom)]]);
      b.fillRect(0, yf, w, face);
      // oclusión ambiental en la base (donde la fachada toca la vereda)
      if (P.faceAO > 0) { var ah = Math.min(P.faceAOpx, face >> 1); b.fillStyle = vgrad(b, h - ah, h, [[0, 'rgba(20,18,30,0)'], [1, rgba(20, 18, 30, P.faceAO)]]); b.fillRect(0, h - ah, w, ah); }
      // borde de azotea: línea de luz y el labio oscuro justo debajo
      if (yf > 0 && P.parapet > 0) {
        b.fillStyle = rgba(248, 246, 240, P.parapet); b.fillRect(0, yf - 1, w, 1);
        b.fillStyle = rgba(26, 22, 40, P.parapetLip); b.fillRect(0, yf, w, 1);
        b.fillStyle = rgba(26, 22, 40, P.parapetLip * 0.5); b.fillRect(0, yf + 1, w, 1);
      }
      // esquinas: la arista oeste recibe cielo, la este queda en sombra
      b.fillStyle = vgrad(b, yf, h, [[0, rgba(240, 244, 250, 0.10)], [1, 'rgba(240,244,250,0)']]); b.fillRect(0, yf, 1, face);
      b.fillStyle = rgba(26, 22, 40, 0.16); b.fillRect(w - 1, yf, 1, face);
    }
    // ventanas declaradas por el lote: reflejo diagonal del cielo (arriba-izquierda), muy leve
    if (P.glint > 0 && res.lights && res.lights.length) {
      for (var i = 0; i < res.lights.length; i++) {
        var L = res.lights[i]; if (!L.w || !L.h || L.w < 3 || L.h < 3) continue;
        var x0 = Math.round(L.x - L.w / 2), y0 = Math.round(L.y - L.h / 2);
        var gr = b.createLinearGradient(x0, y0, x0 + L.w, y0 + L.h);
        gr.addColorStop(0, rgba(235, 240, 248, P.glint)); gr.addColorStop(0.35, rgba(235, 240, 248, P.glint * 0.25)); gr.addColorStop(0.36, 'rgba(235,240,248,0)'); gr.addColorStop(1, 'rgba(235,240,248,0)');
        b.fillStyle = gr; b.fillRect(x0, y0, L.w, L.h);
        b.fillStyle = rgba(250, 252, 255, P.glint * 0.9); b.fillRect(x0, y0, Math.max(1, L.w >> 2), 1);
      }
    }
    b.globalCompositeOperation = 'source-over';
    g.drawImage(bake, 0, 0, w, h, lx, ly, w, h);
    bakeMs += now() - t0;
    return true;
  }

  // Sombra de la manzana norte sobre su vereda: paralelogramo SE (1 px a la derecha por 2 hacia abajo) con borde antialias y una
  // penumbra que se abre al final (lo más lejos del muro es lo más suave). Reemplaza el diente de 2 px.
  function buildingShadow(g, x0, x1, yb, L, alpha, col) {
    if (!ON || !(P.shadowSoft > 0)) return false;
    var pen = Math.max(1, Math.min(P.penumbra, L >> 1)), y, a;
    g.save(); g.fillStyle = col || '#2a2440';
    for (y = 0; y < L + pen; y++) {
      var sh = y * 0.5, k = y < L - pen ? 1 : Math.max(0, 1 - (y - (L - pen)) / (2 * pen));
      a = alpha * k * (1 - 0.18 * y / Math.max(1, L));   // se aclara un poco al alejarse del muro
      if (a <= 0.004) continue;
      g.globalAlpha = a;
      g.fillRect(x0 + sh, yb + y, x1 - x0, 1);           // x fraccional: borde lateral antialias (sin dientes)
      if (y > L - pen) { g.globalAlpha = a * 0.4; g.fillRect(x0 + sh - 1, yb + y, 1, 1); g.fillRect(x1 + sh, yb + y, 1, 1); }
    }
    g.restore();
    return true;
  }
  // Oclusión ambiental horneada: degradé desde el borde sólido hacia afuera. dir: 'S' (hacia abajo), 'N', 'W', 'E'.
  function ao(g, x, y, w, h, a, dir) {
    var gr;
    if (dir === 'S') gr = g.createLinearGradient(0, y, 0, y + h);
    else if (dir === 'N') gr = g.createLinearGradient(0, y + h, 0, y);
    else if (dir === 'E') gr = g.createLinearGradient(x, 0, x + w, 0);
    else gr = g.createLinearGradient(x + w, 0, x, 0);
    gr.addColorStop(0, rgba(42, 36, 64, a)); gr.addColorStop(0.55, rgba(42, 36, 64, a * 0.4)); gr.addColorStop(1, 'rgba(42,36,64,0)');
    var a0 = g.globalAlpha; g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x, y, w, h); g.globalAlpha = a0;
  }
  // Sombra SE de un prop (silueta dura de shadowSE): 5 pasadas sub-píxel = borde suave sin filtros (funciona en Safari).
  var SOFT = [[0, 0, 0.36], [0.6, 0, 0.17], [-0.6, 0, 0.17], [0, 0.6, 0.17], [0.5, -0.5, 0.13]];
  function softBlit(g, s, x, y) {
    if (!ON) { g.drawImage(s, x, y); return; }
    var a0 = g.globalAlpha;
    g.imageSmoothingEnabled = true;
    for (var i = 0; i < SOFT.length; i++) { g.globalAlpha = a0 * SOFT[i][2] / 0.36 * 0.42; g.drawImage(s, x + SOFT[i][0], y + SOFT[i][1]); }
    g.imageSmoothingEnabled = false; g.globalAlpha = a0;
  }

  // =====================================================================================================
  //  ACTORES (cada cuadro)
  // =====================================================================================================
  var SL = null, SLg = null, slW = 0, slH = 0;           // capa de sombras a media resolución (GPU)
  var ST = { ms: 0, msAvg: 0, actors: 0, shadows: 0, night: 0, frames: 0, skipped: 0 };
  var frameMs = 0;
  var PL = { lean: 0, landT: 0, hitT: 0, prevZ: 0, prevHurt: 0 };
  var lastClock = 0, lamps = null, lampsN = -1;

  function ensureSL(vw, vh) {
    var w = Math.ceil(vw / 2) + 2, h = Math.ceil(vh / 2) + 2;
    if (SL && slW === w && slH === h) return;
    if (!SL) { SL = mk(w, h, true); SLg = SL.getContext('2d'); }
    SL.width = w; SL.height = h; slW = w; slH = h;
  }

  // contacto suave (degradé radial), una vez
  var blob = null;
  function blobSpr() {
    if (blob) return blob;
    var LS = ACH.sprites && ACH.sprites.light;
    if (LS && LS.softContact) { blob = LS.softContact; return blob; }
    var c = mk(32, 32), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); blob = c; return c;
  }

  // Llamado al inicio de cada render: estado de dibujo de Alexander (inclinación, squash). No toca la simulación.
  var fdt = 0;   // v0.14.1: dt de dibujo de este cuadro (para la inclinación de zombis)
  function frame(G) {
    frameMs = 0;
    var dt = Math.max(0, Math.min(0.1, (G.clock || 0) - lastClock)); lastClock = G.clock || 0;
    fdt = dt; wrapFx();
    var p = G.player; if (!p) return;
    var want = 0;
    if (p.moving && p.hp > 0 && !(p.z > 0)) want = (p.mx || 0) * P.lean * (p.running ? 1 : 0.3);
    PL.lean += (want - PL.lean) * Math.min(1, dt * 12);
    if (Math.abs(PL.lean) < 0.004 && want === 0) PL.lean = 0;
    var z = p.z || 0;
    if (PL.prevZ > 0.5 && z <= 0.01) PL.landT = P.land;
    PL.prevZ = z;
    if ((p.hurtT || 0) > PL.prevHurt + 0.05) PL.hitT = P.hit;
    PL.prevHurt = p.hurtT || 0;
    PL.landT = Math.max(0, PL.landT - dt); PL.hitT = Math.max(0, PL.hitT - dt);
  }

  function lampList() {
    var r = R(); if (!r) return [];
    var L = r.lights();
    if (lamps && lampsN === L.length) return lamps;
    lamps = []; lampsN = L.length;
    for (var i = 0; i < L.length; i++) if (L[i].k === 'lampLight') lamps.push(L[i]);
    return lamps;
  }

  // Una silueta en la capa de sombras. (X, Y) = pies en pantalla; m = [a, c, d] de la proyección (x' = a·u + c·ys, y' = d·ys).
  function silh(s, X, Y, flip, c, d, alpha) {
    if (!s || !s.width) return;
    SLg.globalAlpha = alpha;
    SLg.setTransform(0.5 * (flip ? -1 : 1), 0, 0.5 * c, 0.5 * d, 0.5 * X, 0.5 * Y);
    SLg.drawImage(s, -s.ax, -s.ay);
  }
  function blobAt(X, Y, w, h, alpha) {
    var bs = blobSpr();
    SLg.globalAlpha = alpha;
    SLg.setTransform(1, 0, 0, 1, 0, 0);
    SLg.drawImage(bs, (X - w / 2) * 0.5, (Y - h / 2) * 0.5, w * 0.5, h * 0.5);
  }
  // sombra del farol más cercano (de noche): se aleja de la luz y se alarga con la distancia
  function nightCast(s, wx, wy, X, Y, flip, nt, base) {
    var Ls = lampList(), best = null, bd = P.nightR * P.nightR, i;
    for (i = 0; i < Ls.length; i++) {
      var L = Ls[i]; if (L.night && nt < 0.2) continue;
      var dx = wx - L.x, dy = wy - L.y, dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = L; }
    }
    if (!best) return;
    var dist = Math.sqrt(bd) || 1, ux = (wx - best.x) / dist, uy = (wy - best.y) / dist, k = dist / P.nightR;
    var len = 0.35 + P.nightLen * k, dco = -len * uy;
    if (Math.abs(dco) < 0.16) dco = -0.16;
    silh(s, X, Y, flip, -len * ux, dco, base * P.nightA * nt * Math.pow(1 - k, 0.6));
    ST.night++;
  }

  // v0.14.1: ¿un drawable suelto recibe el tratamiento de actor? Necesita x (pies) y no ser del piso (y = −1e5/−1e6 = capa de suelo).
  function looseOk(it) {
    return !!(ON && P.loose > 0 && it && it.vol !== false && typeof it.x === 'number' && typeof it.y === 'number' && it.y > -1e4 &&
      (typeof it.draw === 'function' || it.spr || it.canvas));
  }
  // su silueta proyectada: se llama a su propio draw() con una transformación que lo aplasta y lo sesga al SE desde los pies (x, y).
  // Sin canvas extra ni sprite: lo que el módulo dibuja (aunque sean varias piezas) es la silueta. Lo que dibuje encima (avisos) también cae.
  function looseSilh(it, cx, cy, c, d, alpha, G) {
    var r = R(), X = Math.round(it.x) - cx, Y = Math.round(it.y) - cy, VIEW = r.VIEW;
    if (X < -60 || X > VIEW.w + 60 || Y < -12 || Y > VIEW.h + 70) return false;
    SLg.save();
    SLg.setTransform(0.5, 0, 0.5 * c, 0.5 * d, -0.5 * c * Y, 0.5 * (Y - d * Y));
    SLg.globalAlpha = alpha;
    try { r.drawLoose(SLg, it, cx, cy, G); } catch (e) { /* el dibujo del módulo no debe romper el cuadro */ }
    SLg.restore();
    SLg.globalCompositeOperation = 'source-over';
    return true;
  }

  // Capa de sombras de actores. Devuelve true si la dibujó (si no, render.js usa las elipses de siempre).
  // v0.14.1: list = la lista del orden por y de render.js (para los drawables sueltos); puede faltar.
  function shadows(ctx, G, cx, cy, list) {
    var r = R(); if (!ON || !r || !(P.cast > 0)) return false;
    var t0 = now(), VIEW = r.VIEW, F = ACH.ent.CFG.fx, base = (F.contactShadow > 0 ? F.contactShadow : 0) / 0.45;
    if (!(base > 0)) return true;
    ensureSL(VIEW.w, VIEW.h);
    SLg.setTransform(1, 0, 0, 1, 0, 0); SLg.globalCompositeOperation = 'source-over'; SLg.globalAlpha = 1;
    SLg.clearRect(0, 0, slW, slH);
    SLg.imageSmoothingEnabled = true;
    var nt = nightT(), sun = 1 - 0.7 * nt, len = P.castLen, J = ACH.ent.JUMP || { h: 14 }, n = 0, i;
    var cA = P.castA * sun, bA = P.blobA;
    // Alexander
    var p = G.player;
    if (p && !r.invisible(p) && p.hp > 0) {
      var z = Math.max(0, p.z || 0), zk = Math.min(1, z / (J.h || 14)), X = Math.round(p.x) - cx, Y = Math.round(p.y) - cy;
      var s = (p.jumpT >= 0 || z > 0) ? r.jumpSprite(p) : r.playerSprite(p);
      var step = p.moving ? Math.abs(Math.sin((p.animT || 0) * Math.PI * 0.5)) : 0;   // rebote del paso: 2 por ciclo de 4 cuadros
      silh(s, X + z * len * 0.5, Y + z * len, false, -len * 0.5, -len, cA * (1 - 0.45 * zk));
      if (nt > 0.02) nightCast(s, p.x, p.y, X, Y, false, nt, 1 - 0.5 * zk);
      var bw = 13 * (1 - 0.35 * zk) * (1 - 0.06 * step), bh = 5 * (1 - 0.3 * zk);
      blobAt(X + 1, Y, bw, bh, bA * (1 - 0.55 * zk));
      n++;
    }
    // zombis (y orquesta)
    for (i = 0; i < G.zombies.length; i++) {
      var zb = G.zombies[i];
      if (zb.state === 'muerto') continue;
      var zx = Math.round(zb.x) - cx, zy = Math.round(zb.y) - cy;
      if (zx < -40 || zx > VIEW.w + 40 || zy < -10 || zy > VIEW.h + 40) continue;
      var zs = r.zombieSprite(zb, false);
      silh(zs, zx, zy, zb.flip, -len * 0.5, -len, cA);
      if (nt > 0.02) nightCast(zs, zb.x, zb.y, zx, zy, zb.flip, nt, 1);
      var small = zb.type === 'escolar';
      blobAt(zx + 1, zy, small ? 11 : 13, small ? 4 : 5, bA);
      n++;
    }
    // perros
    if (G.npcs && G.npcs.dogs) for (i = 0; i < G.npcs.dogs.length; i++) {
      var dg = G.npcs.dogs[i], dx = Math.round(dg.x) - cx, dy = Math.round(dg.y) - cy;
      if (dx < -24 || dx > VIEW.w + 24 || dy < -10 || dy > VIEW.h + 30) continue;
      var ds = r.dogSprite(dg);
      if (ds) silh(ds.s, dx, dy, ds.flip, -len * 0.5, -len, cA);
      blobAt(dx + 1, dy, 15, 4, bA); n++;
    }
    // gatos (sin silueta: van encaramados a veces)
    if (G.cats) for (i = 0; i < G.cats.length; i++) {
      var ct = G.cats[i], kx = Math.round(ct.x) - cx, ky = Math.round(ct.y) - cy;
      if (kx < -16 || kx > VIEW.w + 16 || ky < -8 || ky > VIEW.h + 20) continue;
      var cz = Math.min(1, Math.max(0, ct.z || 0) / 20);
      blobAt(kx + 1, ky, 11 * (1 - 0.3 * cz), 4, bA * 0.8 * (1 - 0.5 * cz)); n++;
    }
    // v0.14.1: drawables sueltos (NPC de otros módulos, objetos de armas.js): su propio dibujo proyectado al SE
    if (list && P.loose > 0) for (i = 0; i < list.length; i++) {
      var le = list[i].loose;
      if (le && looseOk(le) && looseSilh(le, cx, cy, -len * 0.5, -len, P.looseA * sun, G)) n++;
    }
    // todo al color de la sombra horneada y a la pantalla, agrandado con suavizado (borde suave)
    SLg.setTransform(1, 0, 0, 1, 0, 0); SLg.globalAlpha = 1;
    SLg.globalCompositeOperation = 'source-in'; SLg.fillStyle = '#2a2440'; SLg.fillRect(0, 0, slW, slH);
    SLg.globalCompositeOperation = 'source-over';
    var a0 = ctx.globalAlpha, sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = Math.min(1, P.cast * base);
    ctx.drawImage(SL, 0, 0, slW, slH, 0, 0, slW * 2, slH * 2);
    ctx.imageSmoothingEnabled = sm; ctx.globalAlpha = a0;
    ST.shadows = n;
    frameMs += now() - t0;
    return true;
  }
  // gallinazos y Titina: mancha suave
  function bird(ctx, x, y) {
    if (!ON) return false;
    var F = ACH.ent.CFG.fx; if (!(F.contactShadow > 0)) return true;
    var a0 = ctx.globalAlpha, sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = Math.min(1, F.contactShadow * 0.9);
    var bs = blobSpr(); ctx.drawImage(bs, x - 4.5 + 1, y - 2, 9, 4);
    ctx.imageSmoothingEnabled = sm; ctx.globalAlpha = a0;
    return true;
  }

  /* Dibujo de un actor. ent = la entrada que render.js está dibujando; sq = aplastado del golpe. Solo transforma el dibujo
     (inclinación al correr, squash al aterrizar / golpe) en TODAS las capas (principal, tinte, destello, borrado) para que calcen.
     El rim, el borde y la oclusión a los pies van en una sola pasada de pantalla (rimPass), no por actor: medido, el búfer por actor
     costaba ~50 µs por actor (2,6 ms con 42 zombis en pantalla); la pasada de pantalla cuesta lo mismo con 1 o con 60. */
  function actor(g, c, x, y, flip, sq, ent, main) {
    var sx = 1, sy = 1, sk = 0;
    if (ent && ent.player && ent.player.hp > 0) {
      sk = -PL.lean;
      var kl = PL.landT > 0 ? PL.landT / P.land : 0, kh = PL.hitT > 0 ? PL.hitT / P.hit : 0;
      var q = Math.max(kl * P.landSq, kh * P.hitSq);
      if (q > 0) { sx = 1 + q * 1.15; sy = 1 - q; }
    } else if (ent && P.zLean > 0) {   // v0.14.1: zombis (ent = la entrada {z} de render.js o el zombi mismo)
      var zz = ent.z || (ent.type !== undefined && ent.state !== undefined ? ent : null);
      if (zz && zz.state !== 'muerto') sk = zombieLean(zz, main);
    }
    if (sq) { sx = (c.width + 2) / c.width; sy = (c.height - 1) / c.height; }
    if (sx === 1 && sy === 1 && sk === 0) {
      if (!flip) g.drawImage(c, x - c.ax, y - c.ay); else { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(c, -c.ax, -c.ay); g.restore(); }
      return;
    }
    g.save(); g.translate(x, y); g.transform(sx, 0, sk, sy, 0, 0); if (flip) g.scale(-1, 1); g.drawImage(c, -c.ax, -c.ay); g.restore();
    if (main) ST.actors++;
  }

  // v0.14.1: inclinación de dibujo de un zombi, suavizada; se actualiza solo al dibujar en el lienzo principal (las demás capas leen
  // el mismo valor, así calzan). El estado vive en un WeakMap: no se le agrega nada al zombi.
  var ZL = typeof WeakMap === 'function' ? new WeakMap() : null;
  function zombieLean(z, main) {
    if (!ZL) return 0;
    var s = ZL.get(z);
    if (!s) { s = { l: 0, px: z.x }; ZL.set(z, s); }
    if (main && fdt > 0) {
      var vx = (z.x - s.px) / fdt; s.px = z.x;
      var want = z.moving && z.state !== 'golpeado' ? Math.max(-1, Math.min(1, vx / P.zLeanV)) * P.zLean : 0;
      s.l += (want - s.l) * Math.min(1, fdt * 9);
      if (Math.abs(s.l) < 0.002 && want === 0) s.l = 0;
    }
    return -s.l;
  }

  /* Pasada de pantalla sobre la capa de personajes de render.js (entC: cada personaje ya recortado por lo que tiene delante).
     1) oclusión a los pies: degradé oscuro en las 6 filas sobre los pies de cada actor visible (source-atop: solo sus píxeles)
     2) rim de luz arriba-izquierda (rimPx px)  3) borde oscuro abajo-derecha (1 px). Todo en un búfer de pantalla en GPU. */
  var RB = null, RBg = null, feetGr = null;
  // v0.14.1: npc = capa de drawables sueltos (render.js, ya recortada por lo que tienen delante) o null; nf = sus pies [x, y, …] en pantalla
  function rimPass(ctx, ent, G, cx, cy, npc, nf) {
    if (!ON || !ent) return;
    var nt = nightT(), rim = P.rim * (1 - nt) + P.rimNight * nt;
    if (!(rim > 0 || P.edge > 0 || P.bodyFeet > 0)) return;
    var t0 = now(), w = ent.width, h = ent.height;
    var r0 = R(), K = r0 && r0.VIEW && r0.VIEW.w ? Math.max(1, Math.round(w / r0.VIEW.w)) : 1, lw = w / K, lh = h / K;   // v0.15 (A): entC mide VIEW×K
    if (!RB) { RB = mk(w, h, true); RBg = RB.getContext('2d'); }
    if (RB.width !== w || RB.height !== h) { RB.width = w; RB.height = h; feetGr = null; }
    var g = RBg, a0 = ctx.globalAlpha;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.imageSmoothingEnabled = false;
    // 1) volumen del cuerpo: oclusión a los pies (y una luz muy leve arriba)
    if (P.bodyFeet > 0 && G) {
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
      if (!feetGr) {
        feetGr = g.createLinearGradient(0, -7, 0, 1);
        feetGr.addColorStop(0, 'rgba(26,22,40,0)'); feetGr.addColorStop(0.6, rgba(26, 22, 40, P.bodyFeet * 0.55)); feetGr.addColorStop(1, rgba(26, 22, 40, P.bodyFeet));
      }
      g.fillStyle = feetGr;
      var n = 0, i, p = G.player;
      var foot = function (x, y, hw) { if (x < -16 || x > lw + 16 || y < -8 || y > lh + 8) return; g.setTransform(K, 0, 0, K, x * K, y * K); g.fillRect(-hw, -7, hw * 2, 8); n++; };
      if (p && p.hp > 0) foot(Math.round(p.x) - cx, Math.round(p.y - (p.z || 0)) - cy, 9);
      for (i = 0; i < G.zombies.length; i++) { var z = G.zombies[i]; if (z.state !== 'muerto') foot(Math.round(z.x) - cx, Math.round(z.y) - cy, 10); }
      if (G.npcs && G.npcs.dogs) for (i = 0; i < G.npcs.dogs.length; i++) foot(Math.round(G.npcs.dogs[i].x) - cx, Math.round(G.npcs.dogs[i].y) - cy, 10);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(ent, 0, 0);   // el degradé solo donde hay personaje
      ctx.globalAlpha = 1; ctx.drawImage(RB, 0, 0, lw, lh);
      if (npc && nf && nf.length) {   // v0.14.1: pies de los NPC, recortados por su propia capa
        g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.fillStyle = feetGr;
        for (i = 0; i + 1 < nf.length; i += 2) foot(nf[i], nf[i + 1], 8);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'destination-in'; g.drawImage(npc, 0, 0);
        ctx.drawImage(RB, 0, 0, lw, lh);
      }
      ST.feet = n;
    }
    // 2) rim arriba-izquierda
    if (rim > 0) {
      g.globalCompositeOperation = 'copy'; g.drawImage(ent, 0, 0);
      if (npc) { g.globalCompositeOperation = 'source-over'; g.drawImage(npc, 0, 0); }
      g.globalCompositeOperation = 'source-in'; g.fillStyle = P.rimCol; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(ent, P.rimPx * K, P.rimPx * K); if (npc) g.drawImage(npc, P.rimPx * K, P.rimPx * K);
      ctx.globalAlpha = a0 * rim; ctx.drawImage(RB, 0, 0, lw, lh);
    }
    // 3) borde oscuro abajo-derecha
    if (P.edge > 0) {
      g.globalCompositeOperation = 'copy'; g.drawImage(ent, 0, 0);
      if (npc) { g.globalCompositeOperation = 'source-over'; g.drawImage(npc, 0, 0); }
      g.globalCompositeOperation = 'source-in'; g.fillStyle = P.edgeCol; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(ent, -K, -K); if (npc) g.drawImage(npc, -K, -K);
      ctx.globalAlpha = a0 * P.edge; ctx.drawImage(RB, 0, 0, lw, lh);
    }
    g.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a0;
    frameMs += now() - t0;
  }

  // =====================================================================================================
  //  v0.14.1: ATMÓSFERA (nubes, partículas, mar, destello de golpe). Todo sin estado por partícula: posición = f(índice, tiempo).
  // =====================================================================================================
  function levelId() { var W = ACH.world; if (!W) return ''; return W.id || W.level || (W.cfgNoche ? 'cerro' : 'gambetta'); }
  function indoors() { var CV = ACH.cv; return !!(CV && CV.locales && CV.locales.inRoom); }
  function calma() { try { return !!(ACH.fx && ACH.fx.calma && ACH.fx.calma()); } catch (e) { return false; } }
  function hash(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }

  // --- sombras de nubes: textura 256² tileable de manchas suaves (una vez, en GPU), deriva lenta en coordenadas de mundo ---
  var CL = null;
  function cloudTex() {
    if (CL) return CL;
    var N = 256, c = mk(N, N, true), g = c.getContext('2d');
    for (var i = 0; i < 16; i++) {
      var x = hash(i, 1) * N, y = hash(i, 2) * N, r = 30 + hash(i, 3) * 58, sy = 0.55 + hash(i, 4) * 0.3, a = 0.35 + hash(i, 5) * 0.65;
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {   // repetida en los 8 vecinos: sin costura
        var X = x + ox * N, Y = y + oy * N;
        if (X + r < 0 || X - r > N || Y + r * sy < 0 || Y - r * sy > N) continue;
        g.setTransform(1, 0, 0, sy, X, Y);
        var gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
        gr.addColorStop(0, rgba(42, 36, 64, a)); gr.addColorStop(0.55, rgba(42, 36, 64, a * 0.55)); gr.addColorStop(1, 'rgba(42,36,64,0)');
        g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r);
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    CL = c; return c;
  }
  function clouds(ctx, G, cx, cy) {
    if (!ON || !(P.clouds > 0) || indoors()) return;
    var nt = nightT(), a = P.clouds * (1 - nt); if (a < 0.004) return;
    var t0 = now(), r = R(), VIEW = r.VIEW, tex = cloudTex(), S = 256 * P.cloudScale, t = G.clock || 0;
    var ox = ((cx - t * P.cloudVX) % S + S) % S, oy = ((cy - t * P.cloudVY) % S + S) % S;
    var a0 = ctx.globalAlpha, sm = ctx.imageSmoothingEnabled;
    ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true;
    for (var y = -oy; y < VIEW.h; y += S) for (var x = -ox; x < VIEW.w; x += S) ctx.drawImage(tex, x, y, S, S);
    ctx.globalAlpha = a0; ctx.imageSmoothingEnabled = sm;
    frameMs += now() - t0;
  }

  // --- partículas ambientales (después del mapa de luz: brillan solas) ---
  function ambient(ctx, G, cx, cy) {
    if (!ON) return;
    var t0 = now(), r = R(), VIEW = r.VIEW, t = G.clock || 0, nt = nightT(), lv = levelId(), inn = indoors(), i, k, x, y, a;
    var a0 = ctx.globalAlpha, op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    if (P.motes > 0 && !inn) {
      var Wm = VIEW.w + 40, Hm = VIEW.h + 40;
      // motas en el aire de día: suben y bajan muy lento, con paralaje leve (están entre la cámara y el piso)
      var dayA = P.motesA * P.motes * (1 - nt);
      if (dayA > 0.01) {
        ctx.fillStyle = '#f2ecdc';
        for (i = 0; i < P.motesN; i++) {
          x = ((hash(i, 7) * Wm + t * (2 + 4 * hash(i, 8)) - cx * 1.25) % Wm + Wm) % Wm - 20;
          y = ((hash(i, 9) * Hm + Math.sin(t * (0.3 + hash(i, 10) * 0.4) + i) * 10 - cy * 1.25) % Hm + Hm) % Hm - 20;
          a = dayA * (0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + hash(i, 11)) + i * 1.7)));
          ctx.globalAlpha = a; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      }
      // garúa/polvo en la luz de los faroles encendidos (de noche)
      if (nt > 0.05 && P.lampDustN > 0) {
        var Ls = lampList(), used = 0;
        ctx.fillStyle = '#ffdcaa';
        for (k = 0; k < Ls.length && used < P.lampMax; k++) {
          var L = Ls[k], lx = L.x - cx, ly = L.y - cy;
          if (lx < -40 || lx > VIEW.w + 40 || ly < -10 || ly > VIEW.h + 70) continue;
          used++;
          var s = L.night ? nt : Math.max(nt, 0.2);
          for (i = 0; i < P.lampDustN; i++) {
            var ph = hash(i + k * 13, 3), life = 1.6 + hash(i, 4) * 1.2, u = ((t / life + ph) % 1);
            x = lx + (hash(i + k * 7, 5) - 0.5) * 34 + u * 6;          // cae sesgada con el viento
            y = ly - 46 + u * 50;
            var d = Math.abs(x - lx) / 18; a = P.lampDustA * P.motes * s * Math.sin(u * Math.PI) * Math.max(0, 1 - d * d);
            if (a < 0.01) continue;
            ctx.globalAlpha = a; ctx.fillRect(Math.round(x), Math.round(y), 1, (i & 1) ? 2 : 1);
          }
        }
      }
      // brisa marina: estelas finas que corren hacia el este (Costa Verde)
      if (lv === 'costaverde' && P.breezeN > 0) {
        ctx.fillStyle = '#e6eeea';
        var bA = P.breezeA * P.motes * (1 - 0.55 * nt), Wb = VIEW.w + 80;
        for (i = 0; i < P.breezeN; i++) {
          var sp = 38 + hash(i, 12) * 40, len = 3 + Math.round(hash(i, 13) * 5);
          x = ((hash(i, 14) * Wb + t * sp - cx * 1.1) % Wb + Wb) % Wb - 40;
          y = ((hash(i, 15) * (VIEW.h + 20) + Math.sin(t * 0.9 + i) * 4 - cy * 1.1) % (VIEW.h + 20) + VIEW.h + 20) % (VIEW.h + 20) - 10;
          a = bA * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i * 2.3)));
          ctx.globalAlpha = a; ctx.fillRect(Math.round(x), Math.round(y), len, 1);
        }
      }
    }
    // halo aditivo de los destellos de golpe (se lee también de día, donde el mapa de luz casi no aclara)
    if (FL.length) {
      var LS = ACH.sprites && ACH.sprites.light;
      for (i = FL.length - 1; i >= 0; i--) {
        var f = FL[i], age = t - f.t;
        if (age > P.hitFlashT || age < 0) { FL.splice(i, 1); continue; }
        if (!LS || !LS.glow) continue;
        var gs = LS.glow(Math.round(P.hitFlashR * 0.5) * 2, '#fff0d4');
        ctx.globalAlpha = Math.min(1, P.hitFlashDay * P.hitFlash * (1 - age / P.hitFlashT) * (1 - 0.5 * nt));
        ctx.drawImage(gs, Math.round(f.x - cx - gs.cx), Math.round(f.y - cy - gs.cy));
      }
    }
    ctx.globalAlpha = a0; ctx.globalCompositeOperation = op;
    frameMs += now() - t0;
  }

  // --- mar de Costa Verde: destellos que titilan y franjas de brillo que derivan (lo llama mundo.js dentro del recorte de la vista) ---
  function seaGlints(ctx, G, cx, cy, top, w, h) {
    if (!ON || !(P.seaGlint > 0) || top >= h) return;
    var t0 = now(), t = G.clock || 0, nt = nightT(), k = P.seaGlint * (1 - 0.75 * nt), i, x, y, a;
    if (k < 0.01) return;
    var a0 = ctx.globalAlpha, op = ctx.globalCompositeOperation, H = h - top, Wg = w + 60;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = nt > 0.5 ? '#c8d4e0' : '#eef6f0';
    for (i = 0; i < P.seaGlintN; i++) {
      var depth = hash(i, 21);                                        // 0 = horizonte (arriba), 1 = cerca
      y = top + 6 + depth * (H - 8);
      x = ((hash(i, 22) * Wg - cx * (0.75 + 0.2 * depth) + t * (3 + 5 * hash(i, 23))) % Wg + Wg) % Wg - 30;
      var tw = Math.sin(t * (1.6 + 2.2 * hash(i, 24)) + i * 2.1); if (tw <= 0) continue;
      a = k * tw * tw * (0.45 + 0.5 * depth);
      ctx.globalAlpha = Math.min(1, a); ctx.fillRect(Math.round(x), Math.round(y), 2 + Math.round(depth * 3 + hash(i, 25) * 3), 1);
      if (depth > 0.6 && tw > 0.8) { ctx.globalAlpha = Math.min(1, a * 0.5); ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 1); }   // chispa en cruz cerca
    }
    // 3 franjas largas de brillo que derivan despacio (reflejo del cielo gris)
    for (i = 0; i < 3; i++) {
      y = top + 10 + ((i * 0.31 + t * 0.012) % 1) * (H - 14);
      x = ((i * 173 - cx * 0.85 + t * 6) % Wg + Wg) % Wg - 30;
      ctx.globalAlpha = k * 0.26 * (0.5 + 0.5 * Math.sin(t * 0.8 + i));
      ctx.fillRect(Math.round(x), Math.round(y), 34 + i * 12, 1);
    }
    ctx.globalAlpha = a0; ctx.globalCompositeOperation = op;
    frameMs += now() - t0;
  }

  // --- destello de luz al tumbar un zombi: envuelve ACH.fx.hit (no cambia nada de lo que hace) ---
  var FL = [];
  function flashAt(x, y) {
    if (!ON || !(P.hitFlash > 0) || calma()) return;
    var G = ACH.G; if (!G) return;
    if (ACH.render && ACH.render.addLight) ACH.render.addLight(x, y, P.hitFlashR, '#fff0d4', P.hitFlashT, P.hitFlashA * P.hitFlash);
    FL.push({ x: x, y: y, t: G.clock || 0 }); if (FL.length > 6) FL.shift();
  }
  function wrapFx() {
    var F = ACH.fx; if (!F || typeof F.hit !== 'function' || F.hit._vol) return;
    var o = F.hit;
    F.hit = function (G, z, nx, ny, kill) {
      var res = o.apply(this, arguments);
      try { if (kill && z) flashAt(z.x, z.y - 10); } catch (e) { /* nada */ }
      return res;
    };
    F.hit._vol = true;
  }

  function endFrame() {
    ST.frames++; ST.ms = frameMs; ST.msAvg = ST.msAvg ? ST.msAvg * 0.95 + frameMs * 0.05 : frameMs;
    ST.lastActors = ST.actors; ST.actors = 0; ST.lastNight = ST.night; ST.night = 0;
  }
  function vignetteMul() {
    var PF = ACH.postfx;
    try { if (ON && PF && typeof PF.on === 'function' && PF.on()) return P.vignetteFx; } catch (e) { /* nada */ }
    return 1;
  }

  ACH.volumen = {
    P: P,
    on: function () { return ON; },
    setOn: function (b) {
      b = !!b; if (b === ON) return ON; ON = b;
      try { localStorage.setItem('ach.vol', ON ? '1' : '0'); } catch (e) { /* nada */ }
      bakeMs = 0;
      if (ACH.render && ACH.render.rebake && ACH.world) { try { ACH.render.rebake(); } catch (e2) { console.warn('[ACHORADO] volumen.rebake', e2); } }
      return ON;
    },
    stats: function () {
      return { on: ON, msFrame: +ST.ms.toFixed(3), msAvg: +ST.msAvg.toFixed(3), actorsVol: ST.lastActors || 0, shadows: ST.shadows,
        nightShadows: ST.lastNight || 0, bakeLotsMs: Math.round(bakeMs), feet: ST.feet || 0, postfx: vignetteMul() !== 1 };
    },
    // ganchos internos (los llama render.js)
    lot: lot, buildingShadow: buildingShadow, ao: ao, softBlit: softBlit, shadows: shadows, bird: bird, actor: actor, rimPass: rimPass,
    frame: frame, endFrame: endFrame, vignetteMul: vignetteMul,
    // v0.14.1
    looseOk: looseOk, clouds: clouds, ambient: ambient, seaGlints: seaGlints, flashAt: flashAt
  };
})();
