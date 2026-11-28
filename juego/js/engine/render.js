/* ACHORADO — render.js: acceso a sprites (con placeholders), suelo pre-renderizado, y-sort, neblina, marcadores Q y overlay F3. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var VIEW = { w: 480, h: 270 };
  var DIRS = ['down', 'up', 'left', 'right'];

  /* ---------------- Sprites + placeholders ---------------- */
  var phCache = {};
  var missing = {};
  function note(path) { if (!missing[path]) { missing[path] = true; } }

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // Búfer de pantalla que se redibuja cada cuadro: va por GPU (ver js/engine/lienzo.js). Todo lo demás (sprites, suelo) queda en memoria.
  function mkGpu(w, h) { var c = document.createElement('canvas'); if (ACH.lienzo) ACH.lienzo.gpu(c); c.width = w; c.height = h; return c; }

  /* ---------------- v0.15 (A): motor en K× (contrato juego/V015-HD.md §1) ----------------
     #world y las capas de personajes (entC/flaC/npcC, y el búfer de rimPass de volumen.js) miden VIEW×KK y llevan setTransform(KK):
     todo se sigue dibujando en coordenadas LÓGICAS. Luz, niebla, viñeta, suelo y capa alta quedan a 1× y se dibujan escalados (vecino).
     Sustitución HD: drawImage de la INSTANCIA de esos contextos (no del prototipo) pregunta ACH.hd.src(img) → {img, sx, sy, k} y dibuja
     la HD con el MISMO rect destino lógico (formas de 3, 5 y 9 argumentos). Los derivados del motor (empacho, brillo de invisibilidad,
     silueta blanca) se derivan también desde la HD y quedan en c.__hdD = {img, sx:0, sy:0, k, gen}.
     KK = 1 (CLÁSICO, idéntico a v0.14) si: no hay ACH.hd, ?hd=0, localStorage['ach.hd']='0', ACH.hd.on() falso, o la auto-calidad bajó. */
  var HDQ = /[?&]hd=([01])\b/.exec(location.search || ''), hdForced = HDQ ? HDQ[1] : null, hdUser = null, hdAutoOff = false, hdDrops = [];
  try { var hdLS = window.localStorage.getItem('ach.hd'); if (hdLS === '0' || hdLS === '1') hdUser = hdLS; } catch (eHL) { /* sin almacenamiento */ }
  var KK = 1, GEN = 1, HDP = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.drawImage;
  var HST = { ms: 0, msAvg: 0, n: 0, hits: 0, frameHits: 0 };
  // Variante HD (0..2) del dibujo en curso: ACH.hd.src(img, hdVar). Zombis: id % 3 (o un número estable por zombi, WeakMap) para que dos del
  // mismo tipo no salgan idénticos. Se pone alrededor de cada dibujo de zombi y vuelve a 0. Los derivados se guardan por variante.
  // v0.15 (E, tras F): la variante es una «ranura» de hd.js = ACH.hd.slot(n, z.type) (0..SLOTS-1: 6 variantes × tipo cobrador/ciego/
  // escolar, para que las pieles zvar de esos tipos lleven su accesorio). Clave de derivados por ranura: '__hdD' + (hdVar || '').
  var hdVar = 0, ZVN = typeof WeakMap === 'function' ? new WeakMap() : null, zvN = 0;
  function hdVK(v) { return v ? '__hdD' + v : '__hdD'; }
  function zN(z) {   // número estable del zombi, sin módulo
    var n = typeof z.id === 'number' ? z.id : null;
    if (n === null && ZVN) { n = ZVN.get(z); if (n === undefined) { n = zvN++; ZVN.set(z, n); } }
    return n === null ? 0 : n;
  }
  function zVar(z) {
    if (!z) return 0;
    var H = ACH.hd, n = zN(z);
    if (H && typeof H.slot === 'function') { try { return H.slot(n, z.type) | 0; } catch (e) { /* cae abajo */ } }
    return ((n % 3) + 3) % 3;
  }
  function hdApi() { var H = ACH.hd; return H && typeof H.src === 'function' ? H : null; }
  function hdWanted() {
    var H = hdApi(); if (!H) return false;
    if (hdForced) return hdForced === '1';
    if (hdUser === '0') return false;
    if (hdAutoOff && hdUser !== '1') return false;
    try { if (typeof H.on === 'function' && !H.on()) return false; } catch (e) { return false; }
    return true;
  }
  function wantK() { if (!hdWanted()) return 1; var k = (ACH.hd.K | 0) || 2; return Math.max(1, Math.min(4, k)); }
  function hdOf(img) {
    var D = (hdVar && img[hdVK(hdVar)]) || img.__hdD;   // derivados: por variante (cae a la 0 si falta)
    if (D) return D.gen === GEN && D.img ? D : null;    // derivado del motor (si quedó viejo, se dibuja 1× hasta que se rehaga)
    var H = ACH.hd; if (!H || !H.src) return null;
    try { return H.src(img, hdVar) || null; } catch (e) { return null; }
  }
  function hdWrap(g) {
    if (!g || g.__hdW || !HDP) return g;
    g.__hdW = true;
    g.drawImage = function (img, a, b, c, d, e, f, h, i) {
      var s;
      if (KK > 1 && img && img.__hd && hdDefer(img)) return HDP.apply(this, arguments);   // v0.15 (E, F4): HD aún no lista → 1× este cuadro
      if (KK > 1 && img && (s = hdOf(img))) {
        var k = s.k || KK, n = arguments.length;
        HST.frameHits++;
        if (n === 3) return HDP.call(this, s.img, s.sx, s.sy, img.width * k, img.height * k, a, b, img.width, img.height);
        if (n === 5) return HDP.call(this, s.img, s.sx, s.sy, img.width * k, img.height * k, a, b, c, d);
        if (n >= 9) return HDP.call(this, s.img, s.sx + a * k, s.sy + b * k, c * k, d * k, e, f, h, i);
      }
      return HDP.apply(this, arguments);
    };
    return g;
  }
  // Derivado HD de un lienzo del motor: o = la copia 1× ya hecha (sick, shimmer, blanco); paint(g) aplica el mismo efecto en coordenadas
  // lógicas sobre un contexto que ya tiene la HD de c dibujada (con setTransform(k)). Cacheado en o.__hdD (por GEN).
  function hdDerive(c, o, paint) {
    if (KK < 2 || !o) return o;
    var vk = hdVK(hdVar), D = o[vk]; if (D && D.gen === GEN) return o;
    var s = hdOf(c);
    if (!s) { if (D) o[vk] = null; return o; }
    var k = s.k || KK, w = c.width * k, h = c.height * k, hc = (D && D.img && D.img.width === w && D.img.height === h) ? D.img : mk(w, h), g = hc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, w, h);
    HDP.call(g, s.img, s.sx, s.sy, w, h, 0, 0, w, h);
    g.setTransform(k, 0, 0, k, 0, 0);
    paint(g);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    o[vk] = { img: hc, sx: 0, sy: 0, k: k, gen: GEN };
    return o;
  }
  // v0.15 (E, F2): al cambiar K las capas K× (entC/flaC/npcC) se redimensionan EN SU LUGAR (antes se creaban nuevas y las viejas
  // quedaban vivas en GPU: +4 lienzos / +4,4 MB por cambio). Luz, viñeta y niebla son 1× y no dependen de K.
  function fitLayer(c, g) {
    if (!c || !g) return;
    var w = VIEW.w * KK, h = VIEW.h * KK;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    g.setTransform(KK, 0, 0, KK, 0, 0); g.imageSmoothingEnabled = false;
  }
  function setK(k) { if (k === KK) return; KK = k; GEN++; fitLayer(entC, entG); fitLayer(flaC, flaG); fitLayer(npcC, npcG); if (KK > 1) hwPlan('raise'); }
  function syncWorldSize(ctx) {
    var cv = ctx.canvas, k = wantK();
    if (k !== KK) setK(k);
    var w = VIEW.w * KK, h = VIEW.h * KK;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    if (!ctx.__hdW) hdWrap(ctx);
  }
  function hdSet(b) {   // fila «PERSONAJES: HD | CLÁSICO» de pausa.js
    hdUser = b ? '1' : '0'; hdAutoOff = false;
    try { window.localStorage.setItem('ach.hd', hdUser); } catch (e) { /* nada */ }
    var H = ACH.hd; if (H && typeof H.setOn === 'function') { try { H.setOn(!!b); } catch (e2) { /* nada */ } }
    return hdOn();
  }
  function hdOn() { return wantK() > 1; }
  // auto-calidad (postfx.autoDrop la llama primero; tactil.js pasa por ahí): solo si el jugador no eligió y no está forzado
  function hdCanDrop() { return !hdForced && hdUser === null && !hdAutoOff && KK > 1; }
  function hdAutoDrop(who, avg) {
    if (!hdCanDrop()) return false;
    hdAutoOff = true; hdDrops.push({ by: who || 'auto', avgMs: avg ? +(+avg).toFixed(1) : null, renderMs: +HST.msAvg.toFixed(2) });
    console.info('[ACHORADO] hd: cuadros lentos (' + (avg ? (+avg).toFixed(1) + ' ms' : '?') + ') → PERSONAJES CLÁSICO');
    return true;
  }
  // v0.15 (E, F1): vuelta atrás de la auto-calidad (postfx.js la pide cuando el costo baja de forma sostenida). Nunca pisa al jugador.
  /* v0.15 (E, F4): precalentado del atlas HD. El atlas se genera perezoso (primer src() de cada lienzo/variante): al cargar un nivel
     o tras onRebake el primer cuadro tardaba 47–54 ms, y 7–13 ms los cuadros con sprites nuevos. Ahora:
     - Plan (al primer cuadro HD, al cambiar de nivel, tras rehornear y al volver a HD): 1) lo que se dibujó en el último cuadro
       (= lo que está en pantalla), 2) todas las poses de Alexander de su juego actual, 3) las poses (grupo ACH.hd.seedKey) de los zombis
       vivos del nivel, del más cercano al más lejano, con su variante, 4) perros.
     - Cada lienzo marcado que se ve por primera vez encola también a sus hermanos de grupo (resto de su animación).
     - Se genera en ratos libres (requestIdleCallback; si no hay, setTimeout) con HW.budget ms por porción.
     - Si ACH.hd.has(img, v) existe: en el cuadro, lo que no está listo se genera solo hasta HW.frameBudget ms; lo demás sale 1× ese
       cuadro y se encola (sin tirón); Alexander nunca se difiere. Con ACH.hd.warm(lista, ms) (Agente F) la cola [[img, v], …]
       se le entrega a hd.js; sin él, se usa ACH.hd.src(img, v). */
  var HW = { budget: 3, frameBudget: 3, q: [], qi: 0, seen: null, idx: null, idxBusy: false, sched: false, plan: null, lastLevel: null, lastZ: null,
    cur: [], last: [], buildMs: 0, deferred: 0, warmed: 0, warmMs: 0, plans: 0, slices: 0, lastG: null };
  function hwNew() { var W = typeof WeakMap === 'function'; HW.seen = W ? new WeakMap() : null; HW.qd = W ? new WeakMap() : null; HW.q = []; HW.qi = 0; }
  hwNew();
  // al cargar la página (título, intro): ya se calienta lo del nivel inicial antes del primer cuadro de juego
  window.addEventListener('load', function () { setTimeout(function () { hwPlan('boot'); }, 300); });
  function hwHas(img, v) { var H = ACH.hd; if (H && typeof H.has === 'function') { try { return !!H.has(img, v); } catch (e) { return false; } } return null; }
  function hwPush(img, v) {
    if (!img || !img.__hd) return;
    var S = HW.qd, m = S ? (S.get(img) | 0) : 0, b = 1 << ((v | 0) & 31);
    if (S && (m & b)) return;   // ya encolado
    if (S) S.set(img, m | b);
    HW.q.push([img, v | 0]);
  }
  function hwGroup(img, v) {   // encola el resto de la animación del mismo personaje
    var I = HW.idx, H = ACH.hd; if (!I || !img.__hd || !H || !H.seedKey) return;
    var g; try { g = I[H.seedKey(img.__hd.key || '')]; } catch (e) { g = null; }
    if (g) for (var i = 0; i < g.length; i++) hwPush(g[i], v);
  }
  // en cada drawImage de un lienzo marcado (K>1): anota lo dibujado; true = dibujarlo 1× este cuadro (HD aún no lista y sin presupuesto)
  function hdDefer(img) {
    var v = hdVar, S = HW.seen, b = 1 << (v & 31);
    HW.cur.push(img, v);
    if (S) { var m = S.get(img) | 0; if (!(m & b)) { S.set(img, m | b); hwGroup(img, v); if (HW.qi < HW.q.length) hwKick(); } }
    var h = hwHas(img, v);
    if (h !== false) return false;               // lista, o sin has(): src() la genera como siempre
    if (HW.buildMs < HW.frameBudget || /^alex\./.test(img.__hd.key || '')) {
      var t0 = performance.now();
      try { ACH.hd.src(img, v); } catch (e) { /* nada */ }
      HW.buildMs += performance.now() - t0;
      return false;
    }
    HW.deferred++; hwPush(img, v); hwKick(); return true;
  }
  // índice grupo → lienzos marcados (se recorre ACH.sprites sin disparar propiedades perezosas), en porciones
  function hwIndex(done) {
    if (HW.idx) { done(); return; }
    if (HW.idxBusy) return;
    HW.idxBusy = true;
    var H = ACH.hd, idx = {}, stack = [[ACH.sprites, 0]], seenO = typeof WeakSet === 'function' ? new WeakSet() : null;
    (function slice() {
      var t0 = performance.now();
      while (stack.length && performance.now() - t0 < HW.budget) {
        var it = stack.pop(), o = it[0];
        if (!o || typeof o !== 'object' || it[1] > 8) continue;
        if (seenO) { if (seenO.has(o)) continue; seenO.add(o); }
        if (o.__hd && o.getContext) { var k = H.seedKey(o.__hd.key || ''); (idx[k] || (idx[k] = [])).push(o); continue; }
        if (o.getContext || o instanceof Element || ArrayBuffer.isView(o)) continue;
        var ks = Object.getOwnPropertyNames(o);
        for (var i = 0; i < ks.length; i++) {
          var d = Object.getOwnPropertyDescriptor(o, ks[i]);
          if (d && !d.get && d.value && typeof d.value === 'object') stack.push([d.value, it[1] + 1]);
        }
      }
      if (stack.length) setTimeout(slice, 16);
      else { HW.idx = idx; HW.idxBusy = false; done(); }
    })();
  }
  function hwPlan(why) { HW.plan = why || 'plan'; hwKick(); }
  function hwRunPlan(G) {
    var why = HW.plan; HW.plan = null; HW.plans++;
    var i, L = HW.last;
    if (why !== 'level') for (i = 0; i < L.length; i += 2) hwPush(L[i], L[i + 1]);   // 1) en pantalla
    var p = G && G.player, s;
    if (p) { try { s = playerSprite(p); } catch (e) { s = null; } if (s && s.__hd) { hwPush(s, 0); hwGroup(s, 0); } }   // 2) Alexander
    var Z = (G && G.zombies) || [], live = [];
    for (i = 0; i < Z.length; i++) if (Z[i] && Z[i].state !== 'muerto') live.push(Z[i]);
    if (p) live.sort(function (a, b) { return ((a.x - p.x) * (a.x - p.x) + (a.y - p.y) * (a.y - p.y)) - ((b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y)); });
    for (i = 0; i < live.length; i++) {   // 3) zombis vivos, del más cercano al más lejano
      try { s = zombieSprite(live[i]); } catch (e) { s = null; }
      if (s && s.__hd) { var v = zVar(live[i]); hwPush(s, v); hwGroup(s, v); }
    }
    var D = (G && G.dogs) || [];
    for (i = 0; i < D.length; i++) { try { s = dogSprite(D[i]); s = s && (s.spr || s); } catch (e) { s = null; } if (s && s.__hd) { hwPush(s, 0); hwGroup(s, 0); } }   // 4) perros
  }
  function hwKick() {
    if (HW.sched) return;
    HW.sched = true;
    var ric = window.requestIdleCallback;
    if (ric) ric(hwSlice, { timeout: 120 }); else setTimeout(function () { hwSlice(null); }, 16);
  }
  function hwSlice(dl) {
    HW.sched = false;
    if (wantK() < 2 || !hdApi()) return;
    var Gp = HW.lastG || (ACH.game && ACH.game.G);
    if (HW.plan) { if (!HW.idx) { hwIndex(hwKick); return; } if (Gp) hwRunPlan(Gp); }
    var budget = Math.min(HW.budget, dl && dl.timeRemaining ? Math.max(1, dl.timeRemaining() - 1) : HW.budget);
    var H = ACH.hd, t0 = performance.now(), q = HW.q, left = 0;
    HW.slices++;
    if (typeof H.warm === 'function' && typeof H.has === 'function') {   // hd.js (Agente F): warm(lista [[img, v]…], ms) → cuántos quedan
      try { left = H.warm(q, budget) | 0; } catch (e) { left = 0; }
      HW.qi = q.__hdWi | 0;
    } else {
      while (HW.qi < q.length && performance.now() - t0 < budget) {
        var it = q[HW.qi++];
        if (hwHas(it[0], it[1]) === true) continue;
        try { H.src(it[0], it[1]); HW.warmed++; } catch (e2) { /* nada */ }
      }
      left = q.length - HW.qi;
    }
    HW.warmMs += performance.now() - t0;
    if (left <= 0) { HW.q = []; HW.qi = 0; } else hwKick();
  }
  // al empezar cada cuadro HD: detectar nivel nuevo / primer cuadro; rotar la lista de lo dibujado
  function hwFrame(G) {
    var t = HW.last; HW.last = HW.cur; HW.cur = t; HW.cur.length = 0; HW.buildMs = 0;
    if (KK < 2) return;
    HW.lastG = G;
    var lv = (ACH.world && ACH.world.id) || '?';
    if (lv !== HW.lastLevel || ACH.world !== HW.lastZ) {
      var first = HW.lastLevel === null; HW.lastLevel = lv; HW.lastZ = ACH.world;
      if (!HW.idxBusy) HW.idx = null;   // las hojas de sprites del nivel nuevo entran al índice
      hwPlan(first ? 'first' : 'level');
    }
  }
  function hdCanRaise() { return !hdForced && hdUser === null && hdAutoOff; }
  function hdAutoRaise(who, avg) {
    if (!hdCanRaise()) return false;
    hdAutoOff = false; hdDrops.push({ by: who || 'auto', up: true, avgMs: avg ? +(+avg).toFixed(1) : null, renderMs: +HST.msAvg.toFixed(2) });
    console.info('[ACHORADO] hd: costo bajo (' + (avg ? (+avg).toFixed(1) + ' ms' : '?') + ') → PERSONAJES HD');
    return true;
  }
  function rectSprite(key, w, h, fill, extra, ax, ay) {
    if (phCache[key]) return phCache[key];
    var c = mk(w, h), g = c.getContext('2d');
    g.fillStyle = '#141216'; g.fillRect(0, 0, w, h);
    g.fillStyle = fill; g.fillRect(1, 1, w - 2, h - 2);
    if (extra) extra(g, w, h);
    c.ax = ax !== undefined ? ax : Math.floor(w / 2);
    c.ay = ay !== undefined ? ay : h - 1;
    c.placeholder = true;
    phCache[key] = c;
    return c;
  }
  function whiteOf(src, key) {
    if (phCache[key]) return phCache[key];
    var c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    c.ax = src.ax; c.ay = src.ay; c.placeholder = true;
    phCache[key] = c; return c;
  }

  // Lectura de píxeles de un sprite: siempre por un lienzo de trabajo con willReadFrequently (leer muchos canvas de la GPU uno por uno
  // llena la consola de avisos). Devuelve el arreglo RGBA del sprite.
  var scratch = null, scratchG = null;
  function readPixels(s) {
    if (!scratch) { scratch = document.createElement('canvas'); scratchG = scratch.getContext('2d', { willReadFrequently: true }); }
    if (scratch.width < s.width || scratch.height < s.height) { scratch.width = Math.max(scratch.width, s.width); scratch.height = Math.max(scratch.height, s.height); }
    scratchG.globalCompositeOperation = 'copy';
    scratchG.drawImage(s, 0, 0);
    scratchG.globalCompositeOperation = 'source-over';
    var d = scratchG.getImageData(0, 0, s.width, s.height).data;
    return d;
  }
  function dig(path) {
    var o = ACH.sprites, parts = path.split('.');
    for (var i = 0; i < parts.length && o != null; i++) o = o[parts[i]];
    return o;
  }
  function isCanvas(o) { return o && typeof o === 'object' && typeof o.width === 'number' && typeof o.height === 'number' && o.width > 0; }
  // Toma un frame: acepta canvas suelto o array.
  function frameOf(o, i) {
    if (Array.isArray(o)) { if (!o.length) return null; o = o[((i % o.length) + o.length) % o.length]; }
    return isCanvas(o) ? o : null;
  }
  function anchored(c) {
    if (c.ax === undefined) c.ax = Math.floor(c.width / 2);
    if (c.ay === undefined) c.ay = c.height - 1;
    return c;
  }
  function count(o) { return Array.isArray(o) ? o.length : (isCanvas(o) ? 1 : 0); }

  // Placeholders de Alexander
  function alexPH(set, anim, dir, f) {
    var key = 'alex.' + set + '.' + anim + '.' + dir + '.' + f;
    return rectSprite(key, 14, 24, '#c0562f', function (g, w, h) {
      g.fillStyle = '#e8b48a'; g.fillRect(3, 1, 8, 7);          // cabeza
      g.fillStyle = '#2b3a67'; g.fillRect(2, 15, 10, 8);        // jean
      if (anim === 'walk') { g.fillStyle = '#141216'; g.fillRect(f % 2 ? 3 : 8, 21, 3, 2); }
      var v = { down: [7, 6], up: [7, 1], left: [3, 4], right: [10, 4] }[dir];
      g.fillStyle = '#141216'; g.fillRect(v[0] - 1, v[1], 2, 2);  // "nariz" hacia donde mira
      if (set === 'bird') { g.fillStyle = '#9aa0a6'; g.fillRect(10, 7, 4, 3); }
      if (anim === 'attack') { g.fillStyle = '#8a4b1d'; var gx = { down: [5, 18], up: [5, 0], left: [0, 10], right: [9, 10] }[dir]; g.fillRect(gx[0], gx[1], f === 1 ? 5 : 3, f === 1 ? 6 : 4); }
    }, 7, 23);
  }
  function alex(set, anim, dir, f) {
    var base = 'alex.' + set + '.' + anim + '.' + dir;
    var o = dig(base), c = anim === 'idle' ? (isCanvas(o) ? o : frameOf(o, 0)) : frameOf(o, f);
    if (c) return anchored(c);
    note(base); return alexPH(set, anim, dir, f);
  }
  function alexFrames(set, anim, dir) {
    var n = count(dig('alex.' + set + '.' + anim + '.' + dir));
    return n || (anim === 'walk' ? 4 : anim === 'attack' ? 3 : 1);
  }

  var ZCOL = { caminante: '#6f7a5e', escolar: '#4d6487', ciego: '#7d6d80', cobrador: '#8a7a3a', senoraOlla: '#5f8a2e', senoraBalde: '#8a5a7a' };
  function zombiePH(type, anim, f) {
    var key = 'zombie.' + type + '.' + anim + '.' + f;
    if (anim === 'dead') return rectSprite(key, 24, 10, '#4b5243', function (g) { g.fillStyle = '#6b2222'; g.fillRect(16, 3, 5, 4); }, 12, 7);
    var small = type === 'escolar', w = small ? 12 : 14, h = small ? 20 : 24;
    var base = rectSprite('zombie.' + type + '.walk.' + f, w, h, ZCOL[type], function (g, w, h) {
      g.fillStyle = '#a9b39a'; g.fillRect(2, 1, w - 4, 6);
      if (type === 'ciego') { g.fillStyle = '#f2f2f2'; g.fillRect(2, 3, w - 4, 2); }
      else { g.fillStyle = '#c01818'; g.fillRect(4, 3, 1, 1); g.fillRect(w - 5, 3, 1, 1); }
      g.fillStyle = '#141216'; g.fillRect(f % 2 ? 2 : w - 5, h - 3, 3, 2);
    }, Math.floor(w / 2), h - 1);
    return anim === 'hurt' ? whiteOf(base, key) : base;
  }
  function zombie(type, anim, f) {
    var o = dig('zombie.' + type + '.' + anim);
    var c = anim === 'dead' ? (isCanvas(o) ? o : frameOf(o, 0)) : frameOf(o, f);
    if (c) return anchored(c);
    note('zombie.' + type + '.' + anim);
    return zombiePH(type, anim, f);
  }

  function titina(f) {
    var c = frameOf(dig('titina.fly'), f);
    if (c) return anchored(c);
    note('titina.fly');
    return rectSprite('titina.' + (f % 2), 9, 7, '#9aa0a6', function (g) {
      g.fillStyle = '#5b6066'; g.fillRect(f % 2 ? 1 : 2, f % 2 ? 1 : 3, 3, 2); g.fillRect(f % 2 ? 5 : 4, f % 2 ? 1 : 3, 3, 2);
      g.fillStyle = '#ff7a2e'; g.fillRect(7, 3, 1, 1);
    }, 4, 6);
  }

  var PROPPH = {
    combi:    [80, 34, '#c9b25a', 76, 22], car: [26, 40, '#7c8a96', 24, 30], mototaxi: [20, 24, '#b33a3a', 18, 14],
    trash:    [12, 14, '#3f4a3a', 10, 6], poste: [6, 44, '#6b6b6b', 4, 3], paradero: [42, 34, '#4f6b7a', 38, 6],
    bags:     [16, 10, '#222326', 14, 6]
  };
  // prop(k, v, dir, fallback): con dir 'W' busca primero props[k+'W'] (variante hacia el oeste, con texto sin voltear);
  // si falta el sprite k, prueba con `fallback` (p. ej. trailerLargo → trailer) antes del placeholder.
  var propCache = {};
  function prop(k, v, dir, fallback) {
    var ck = k + '|' + (v || 0) + '|' + (dir || '') + '|' + (fallback || '');
    var hit = propCache[ck];
    if (hit) return hit;
    return (propCache[ck] = propRaw(k, v, dir, fallback));
  }
  function propPick(k, v) {
    var c = dig('props.' + k);
    if (Array.isArray(c)) c = c.length ? c[((v || 0) % c.length + c.length) % c.length] : null;
    return isCanvas(c) ? c : null;
  }
  function propRaw(k, v, dir, fallback) {
    var c = (dir === 'W' && propPick(k + 'W', v)) || propPick(k, v) || (fallback && propPick(fallback, v));
    if (isCanvas(c)) {
      anchored(c);
      if (typeof c.fw !== 'number') c.fw = Math.round(c.width * 0.85);
      if (typeof c.fh !== 'number') c.fh = Math.max(4, Math.round(c.height * 0.4));
      return c;
    }
    note('props.' + k);
    var d = PROPPH[k] || [16, 16, '#888', 14, 6];
    var s = rectSprite('prop.' + k, d[0], d[1], d[2], function (g, w, h) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(1, h - 6, w - 2, 5);
    });
    s.fw = d[3]; s.fh = d[4];
    return s;
  }

  var TILEPH = {
    asphalt: '#3a3a3d', asphaltCrack: '#343436', laneDash: '#3a3a3d', sidewalk: '#8d8a82', curbW: '#a29f96', curbE: '#a29f96',
    berma: '#7a6548', alley: '#5d5850', roof: '#5b4a42', wallBrick: '#8a4f3a', wallPaint: '#7f8f86', door: '#3b2a20',
    window: '#2f3b45', stairs: '#9c9a92',
    // v0.9 (H1): suelo del Cerro mientras cerro-suelo.js no llegue
    tierra: '#a98a6c', tierraPiedras: '#96775a', roca: '#7b7870', arena: '#d2c2a8', trocha: '#cdbfa5', escaleraCerro: '#a8a09a', losa: '#bdb6ac',
    pircaFace: '#81776a', muroContencion: '#8a8479', muroLlantas: '#3a3a3a', bordeTerraza: '#9a8f80', bordeTerrazaCemento: '#9d9890', bordeTerrazaLlantas: '#4a4744',
    escaleraTierra: '#8f7350'
  };
  // Tiles con orientación nueva (avenida oeste → este): si calle.js todavía no los trae, se rota el tile viejo 90° horario
  // (izquierda → arriba): curbW → curbN, curbE → curbS, laneDash → laneDashH, zebra → zebraH, hump → humpV.
  var ROT = { laneDashH: 'laneDash', curbN: 'curbW', curbS: 'curbE', zebraH: 'zebra', humpV: 'hump',
    curbNYellow: 'curbWYellow', curbSYellow: 'curbEYellow' };
  function rot90(src) {
    var c = mk(src.height, src.width), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.translate(src.height, 0); g.rotate(Math.PI / 2); g.drawImage(src, 0, 0);
    return c;
  }
  function tile(name, v) {
    var o = dig('tiles.' + name), c = Array.isArray(o) ? frameOf(o, v) : (isCanvas(o) ? o : null);
    if (c) return c;
    if (ROT[name]) {
      var rk = 'rot.' + name + '.' + (v || 0);
      if (!phCache[rk]) phCache[rk] = rot90(tile(ROT[name], v || 0));
      return phCache[rk];
    }
    note('tiles.' + name);
    var key = 'tile.' + name + '.' + (v % 3);
    if (phCache[key]) return phCache[key];
    var t = mk(16, 16), g = t.getContext('2d');
    var col = TILEPH[name] || '#f0f';
    if (name === 'wallPaint') col = ['#7f8f86', '#9a7d8c', '#8f8a5c'][v % 3];
    g.fillStyle = col; g.fillRect(0, 0, 16, 16);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16);
    if (name === 'laneDash') { g.fillStyle = '#d8d2b8'; g.fillRect(7, 2, 2, 10); }
    if (name === 'asphaltCrack') { g.fillStyle = '#222'; g.fillRect(4, 6, 6, 1); g.fillRect(9, 7, 1, 4); }
    if (name === 'curbW') { g.fillStyle = '#d6d2c8'; g.fillRect(0, 0, 4, 16); }
    if (name === 'curbE') { g.fillStyle = '#d6d2c8'; g.fillRect(12, 0, 4, 16); }
    if (name === 'stairs') { g.fillStyle = '#6e6c66'; for (var y = 1; y < 16; y += 4) g.fillRect(0, y, 16, 1); }
    if (name === 'door') { g.fillStyle = '#7a5a3a'; g.fillRect(3, 2, 10, 14); }
    if (name === 'window') { g.fillStyle = '#8a4f3a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#2f3b45'; g.fillRect(3, 3, 10, 8); }
    if (name === 'wallBrick') { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 5, 16, 1); g.fillRect(0, 11, 16, 1); g.fillRect(8, 0, 1, 5); g.fillRect(4, 6, 1, 5); }
    phCache[key] = t; return t;
  }

  // Decals (ancla = centro inferior) y NPC (gallinazo, perro): con placeholder si falta el sprite.
  function decal(k, v) {
    var o = dig('decals.' + k), c = frameOf(o, v || 0);
    if (c) return anchored(c);
    note('decals.' + k);
    return rectSprite('decal.' + k, 12, 8, '#d98a9e');
  }
  function gallinazo(anim, i) {
    var c = frameOf(dig('npc.gallinazo.' + anim), i);
    if (c) return anchored(c);
    note('npc.gallinazo.' + anim);
    return rectSprite('gal.' + anim, anim === 'fly' ? 22 : 16, 14, '#222', null, anim === 'fly' ? 11 : 8, 13);
  }
  function perro(anim, dirn, i) { // idle y bark miran a la derecha (se voltean en el dibujo); walk trae left y right
    var o = dig('npc.perro.' + anim);
    if (anim === 'walk') o = o && o[dirn];
    var c = frameOf(o, i);
    if (c) return anchored(c);
    note('npc.perro.' + anim);
    return rectSprite('perro.' + anim, 18, 12, '#c9a77a', null, 9, 11);
  }

  // Caja de píxeles opacos (alfa ≥ thr) de un sprite, relativa al ancla: {x0, x1, y0, y1} inclusivos. rowA/rowB (opcionales, relativas al ancla)
  // limitan las filas que se miran. null si no hay píxeles. Lo usa world.js para huellas (barricadas, bultos).
  function opaqueBox(s, thr, rowA, rowB) {
    var w = s.width, h = s.height, d;
    try { d = readPixels(s); } catch (e) { return null; }
    var ya = rowA === undefined ? 0 : Math.max(0, s.ay + rowA), yb = rowB === undefined ? h - 1 : Math.min(h - 1, s.ay + rowB);
    var x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (var y = ya; y <= yb; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] >= thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x0: x0 - s.ax, x1: x1 - s.ax, y0: y0 - s.ay, y1: y1 - s.ay };
  }
  ACH.gfx = { opaqueBox: opaqueBox, alex: alex, alexFrames: alexFrames, zombie: zombie, titina: titina, prop: prop, tile: tile,
    decal: decal, gallinazo: gallinazo, perro: perro,
    missing: function () { return Object.keys(missing); } };

  /* ---------------- Suelo pre-renderizado y capa alta ---------------- */
  function hash(c, r) { var h = (c * 374761393 + r * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
  var ground = null, high = null, bakeMs = 0;
  var VARIANT = { zebraH: 1, curbNYellow: 1, curbSYellow: 1 };   // tiles de superpuesto que eligen variante por hash

  // Colores de muro de las fichas (revisión 3.3 y 2.4) para el bloque provisorio del motor.
  var LOTCOL = { celeste: '#8fb0bf', menta: '#9cbfa3', durazno: '#d4a084', ocre: '#bf9752', rosado: '#cf96a2', blanco: '#ddd6c8',
    ladrillo: '#93563d', cemento: '#8a877f', rojo: '#8f3a32', azul: '#2f4470', verde: '#2f5a52', gris: '#77767a', oxido: '#8a4a32', tierra: '#7d6449',
    turquesa: '#3f8f8a', naranja: '#c4703a', amarillo: '#c9a93a', morado: '#6a4a7a' };
  function shade(hex, k) { // k < 1 oscurece, > 1 aclara
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)))); }
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function speckle(g, x, y, w, h, seed, col, n) {
    g.fillStyle = col;
    for (var i = 0; i < n; i++) { var hh = hash(seed + i, i * 7 + 3); g.fillRect(x + hh % w, y + (hh >>> 8) % h, 1 + (hh >>> 20) % 2, 1); }
  }
  // Bloque provisorio con la altura correcta: azotea gris + cara sur (lado N), solo azotea con parapeto (lado S).
  function motorLot(f) {
    var w = (f.c1 - f.c0 + 1) * 16, h = (f.r1 - f.r0 + 1) * 16, cv = mk(w, h), g = cv.getContext('2d'), lights = [];
    var col = LOTCOL[f.color] || '#888', s = f.seed || 1, x, y, i;
    g.fillStyle = '#6c6965'; g.fillRect(0, 0, w, h);
    speckle(g, 0, 0, w, h, s, 'rgba(0,0,0,.16)', w * h / 40);
    if (f.arch === 'escalera') {
      for (y = 0; y < h; y += 8) {
        g.fillStyle = ['#b9877a', '#88a7a8', '#c9b06a', '#9a8fb5', '#a7b48a'][(y / 8) % 5]; g.fillRect(6, y, w - 12, 6);
        g.fillStyle = '#c9c4b8'; g.fillRect(6, y + 6, w - 12, 2);
      }
      g.fillStyle = '#2a2730'; g.fillRect(3, 0, 2, h); g.fillRect(w - 5, 0, 2, h);
      g.fillStyle = '#4f7a3f'; for (y = 10; y < h; y += 34) { g.fillRect(0, y, 4, 4); g.fillRect(w - 4, y + 14, 4, 4); }
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: [{ x: w / 2, y: 8, kind: 'foco' }] };
    }
    // v0.9 (H1): hitos caminables del Cerro mientras cerro-casas.js no los traiga
    if (f.arch === 'losaDeportiva') {
      g.fillStyle = '#bdb6ac'; g.fillRect(0, 0, w, h); speckle(g, 0, 0, w, h, s, 'rgba(0,0,0,.08)', w * h / 30);
      g.fillStyle = '#e8e2d2'; g.fillRect(8, 26, w - 16, 1); g.fillRect(8, h - 22, w - 16, 1); g.fillRect(Math.round(w / 2), 26, 1, h - 48);
      g.fillStyle = '#8a877f'; g.fillRect(0, 0, w, 20); g.fillStyle = '#6c6965'; for (y = 4; y < 20; y += 5) g.fillRect(0, y, w, 1);   // tribunita
      g.fillStyle = '#d9b21e'; g.fillRect(0, h - 14, w, 3); g.fillStyle = '#8a877f'; g.fillRect(0, h - 11, w, 11);                   // baranda amarilla y bordillo
      g.fillStyle = '#d9b21e'; g.fillRect(0, 20, 2, h - 34); g.fillRect(w - 2, 20, 2, h - 34);
      var gx = Math.round(w * (0.58 + (s % 3) * 0.08)); g.clearRect(gx, h - 14, 24, 14); g.fillStyle = '#bdb6ac'; g.fillRect(gx, h - 14, 24, 14);
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: [{ x: w / 2, y: 22, kind: 'foco' }] };
    }
    if (f.arch === 'cruzCima') {
      g.clearRect(0, 0, w, h);
      var bw = Math.min(48, w), bx = 16 * Math.max(0, Math.floor((w / 16 - 3) / 2));
      g.fillStyle = '#8d8a84'; g.fillRect(bx, h - 36, bw, 36); g.fillStyle = '#6c6965'; g.fillRect(bx, h - 8, bw, 8);
      var cxx = bx + Math.round(bw / 2);
      g.fillStyle = '#1c1a22'; g.fillRect(cxx - 4, 2, 8, h - 36); g.fillRect(cxx - 19, 22, 38, 8);
      g.fillStyle = '#eeeae0'; g.fillRect(cxx - 3, 3, 6, h - 38); g.fillRect(cxx - 18, 23, 36, 6);
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: [] };
    }
    if (f.arch === 'cerro') {
      g.fillStyle = '#7d6449'; g.fillRect(0, 0, w, h);
      speckle(g, 0, 0, w, h, s, '#5f4a37', w * h / 18);
      var hc = ['#c98f7d', '#86a9b8', '#cdb36d', '#9fbf9a', '#d0a3b5'];
      for (i = 0; i < Math.floor(w * h / 1400); i++) {
        var hh = hash(s, i * 13 + 1), hx = hh % Math.max(1, w - 24), hy = (hh >>> 9) % Math.max(1, h - 20);
        g.fillStyle = '#1c1a22'; g.fillRect(hx, hy, 24, 20);
        g.fillStyle = '#8c8a86'; g.fillRect(hx + 1, hy + 1, 22, 7);
        g.fillStyle = hc[i % hc.length]; g.fillRect(hx + 1, hy + 8, 22, 11);
        g.fillStyle = '#2a2730'; g.fillRect(hx + 9, hy + 11, 6, 8);
      }
      if (f.side === 'N') { // casas del pie del cerro: frente de 1 piso al sur
        g.fillStyle = '#1c1a22'; g.fillRect(0, h - 49, w, 1);
        g.fillStyle = col; g.fillRect(0, h - 48, w, 48);
        g.fillStyle = '#2a2730'; g.fillRect(8, h - 34, 16, 34); g.fillRect(w - 30, h - 30, 18, 16);
        lights.push({ x: 16, y: h - 20, kind: 'local' });
      }
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: lights };
    }
    if (f.arch === 'contenedores') {
      g.fillStyle = '#8b7a62'; g.fillRect(0, 0, w, h); speckle(g, 0, 0, w, h, s, '#6e5f4a', w * h / 20);
      var cc = ['#2f4470', '#8a4a32', '#2f5a52', '#b08a3a'];
      for (i = 0, x = 6; x + 98 <= w; x += 104, i++) for (y = 8; y + 40 <= h - 4; y += 46) {
        g.fillStyle = '#1c1a22'; g.fillRect(x, y, 98, 40);
        g.fillStyle = cc[(i + y) % 4]; g.fillRect(x + 1, y + 1, 96, 38);
        g.fillStyle = 'rgba(0,0,0,.25)'; for (var k = 4; k < 96; k += 6) g.fillRect(x + 1 + k, y + 1, 1, 38);
      }
      g.fillStyle = '#4a4a4e'; for (x = 0; x < w; x += 4) g.fillRect(x, 0, 2, 3);  // malla al norte
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: [] };
    }
    if (f.side === 'S') {
      // azotea vista desde atrás: parapeto en el borde norte, con la cara superior más clara
      g.fillStyle = shade(col, 0.72); g.fillRect(0, 0, w, 8);
      g.fillStyle = shade(col, 1.25); g.fillRect(0, 0, w, 2);
      g.fillStyle = '#1c1a22'; g.fillRect(0, 8, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
      decorOn(g, f, w, h, 12);
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: [] };
    }
    // lado N: azotea arriba, parapeto de 6 px, cara sur de `face` tiles abajo
    var v = f.face || 3, fy = h - v * 16;
    decorOn(g, f, w, fy - 6, 2);
    g.fillStyle = shade(col, 1.2); g.fillRect(0, fy - 6, w, 2);
    g.fillStyle = shade(col, 0.8); g.fillRect(0, fy - 4, w, 4);
    g.fillStyle = col; g.fillRect(0, fy, w, h - fy);
    if (f.arch === 'ladrillo') { g.fillStyle = 'rgba(0,0,0,.18)'; for (y = fy + 3; y < h; y += 4) g.fillRect(0, y, w, 1); g.fillStyle = '#8d8a84'; for (x = 0; x < w; x += 48) g.fillRect(x, fy, 4, h - fy); }
    speckle(g, 0, fy, w, h - fy, s + 5, 'rgba(255,255,255,.08)', (h - fy) * w / 30);
    g.fillStyle = shade(col, 0.7); g.fillRect(0, h - 6, w, 6);        // zócalo
    g.fillStyle = '#1c1a22'; g.fillRect(0, fy - 7, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
    if (f.mural) {
      var my = fy + 8, mh = h - fy - 18;
      g.fillStyle = '#2f4470'; g.fillRect(8, my, w - 16, mh);
      var md = dig('decals.muralCallao'); md = frameOf(md, 0);
      if (md) g.drawImage(md, Math.round((w - md.width) / 2), my + Math.round((mh - md.height) / 2));
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: [{ x: 12, y: fy + 4, kind: 'foco' }, { x: w - 12, y: fy + 4, kind: 'foco' }] };
    }
    if (f.arch === 'almacen') {
      g.fillStyle = '#4a4e55'; g.fillRect(Math.round(w / 2 - 40), h - 56, 80, 56);
      g.fillStyle = 'rgba(0,0,0,.25)'; for (x = 4; x < 80; x += 5) g.fillRect(Math.round(w / 2 - 40) + x, h - 56, 1, 56);
      return { canvas: cv, over: null, overX: 0, overY: 0, lights: [{ x: w / 2, y: h - 60, kind: 'foco' }] };
    }
    // planta baja: banda de letrero (10 px) + vanos; pisos altos: ventanas 18×16
    var shop = { bodega: 1, chifa: 1, polleria: 1, botica: 1, ferreteria: 1, taller: 1 }[f.arch];
    var by = h - 48 + 4;
    if (shop) {
      g.fillStyle = f.arch === 'botica' ? '#2f5a52' : (f.arch === 'chifa' ? '#8f3a32' : '#2f4470');
      g.fillRect(4, by, w - 8, 10); g.fillStyle = '#e6c85a'; for (x = 10; x < w - 12; x += 6) g.fillRect(x, by + 3, 4, 4);
      var sx = Math.round(w / 2 - 22);
      g.fillStyle = '#3a3a40'; g.fillRect(sx, h - 38, 44, 32);
      g.fillStyle = 'rgba(0,0,0,.3)'; for (y = h - 38; y < h - 6; y += 3) g.fillRect(sx, y, 44, 1);
      lights.push({ x: sx + 22, y: h - 16, kind: f.arch === 'botica' ? 'cruz' : 'local' });
    } else {
      g.fillStyle = '#3b2a20'; g.fillRect(10, h - 40, 16, 34);
      g.fillStyle = '#2f3b45'; g.fillRect(w - 32, h - 34, 18, 16);
    }
    for (var fl = 1; fl < Math.max(1, Math.round((v - 1) / 2)); fl++) {
      var wy = h - 48 - fl * 32 + 10;
      for (x = 8; x + 18 <= w - 6; x += 30) {
        var odd = hash(s + fl, x) % 5 === 0;
        g.fillStyle = '#1c1a22'; g.fillRect(x - 1, wy - 1, 20, 18);
        g.fillStyle = odd ? shade(col, 0.6) : '#33404a'; g.fillRect(x, wy, 18, 16);
      }
    }
    var over = null;
    if (f.front && f.front.indexOf('toldo') >= 0) { // toldo a rayas que vuela 10 px sobre la vereda
      over = mk(w - 8, 14); var og = over.getContext('2d');
      for (x = 0; x < w - 8; x += 6) { og.fillStyle = (x / 6) % 2 ? '#e8e0cf' : shade(col, 0.75); og.fillRect(x, 0, 6, 10); }
      og.fillStyle = 'rgba(20,16,24,.35)'; og.fillRect(0, 10, w - 8, 4);
    }
    return { canvas: cv, over: over, overX: 4, overY: h - 6, lights: lights };
  }
  function decorOn(g, f, w, h, y0) { // tanque y fierros sobre la azotea, según la ficha
    var roof = f.roof || [], k = 0;
    if (roof.indexOf('tanque') >= 0) { var t = prop('tank'); g.drawImage(t, 8 + (f.seed % Math.max(1, w - 34)), y0 + 2); k++; }
    if (roof.indexOf('fierros') >= 0 && h > 30) { var rb = prop('rebar'); g.drawImage(rb, w - 28 - (f.seed % 12), y0 + 2); }
  }

  // Ficha de lote horneado para lectura de otros módulos (fx.js): rectángulo en px de mundo, capa alta, toldos y tendales aproximados.
  function lotInfo(f, res, lx, ly) {
    var W = ACH.world, T = W.T, cv = res.canvas, info = { id: f.id, x: lx, y: ly, w: cv.width, h: cv.height, face: f.faceEff, side: f.side, arch: f.arch,
      over: null, awnings: [], cloth: [] };
    if (res.over && isCanvas(res.over)) {
      var ox = lx + (res.overX || 0), oy = ly + (res.overY || 0);
      info.over = { x: ox, y: oy, w: res.over.width, h: res.over.height };
      if (f.front && f.front.indexOf('toldo') >= 0) { // borde delantero del toldo: la fila más baja con tela, medida una vez en el horneado
        try {
          var og = { data: readPixels(res.over) }, wd = res.over.width, hh = res.over.height, yy, xx, n, x0, x1;
          for (yy = hh - 1; yy >= 0; yy--) {
            n = 0; x0 = wd; x1 = -1;
            for (xx = 0; xx < wd; xx++) if (og.data[(yy * wd + xx) * 4 + 3] > 200) { n++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; }
            if (n >= 24) { info.awnings.push({ x: ox + x0, y: oy + yy, w: x1 - x0 + 1 }); break; }
          }
        } catch (e) { /* lienzo contaminado: sin toldo medido */ }
        if (!info.awnings.length) info.awnings.push({ x: lx + 4, y: (f.r1 + 1) * T - 19, w: cv.width - 8 });
      }
    }
    if (f.roof && f.roof.indexOf('tendal') >= 0) info.cloth.push({ x: lx + 6, y: ly + (f.side === 'N' ? 14 : 30), w: Math.min(64, cv.width - 12) });
    return info;
  }
  function bakeLot(f) {
    var res = null, src = 'motor';
    try { if (ACH.sprites && typeof ACH.sprites.buildLot === 'function') { res = ACH.sprites.buildLot(f); if (res) src = 'buildLot'; } }
    catch (e) { res = null; f._err = String(e && e.message || e); }
    // la escalera es caminable: un bloque provisorio de edificio confundiría al jugador, así que ahí va el del motor
    if (!res && !f.walk && ACH.px && typeof ACH.px.placeholderLot === 'function') {
      try { res = ACH.px.placeholderLot(f); if (res) src = 'placeholderLot'; } catch (e2) { res = null; f._err = String(e2 && e2.message || e2); }
    }
    if (res && isCanvas(res)) res = { canvas: res };
    if (!res || !isCanvas(res.canvas)) { res = motorLot(f); src = 'motor'; }
    f._src = src;
    return res;
  }

  function buildGround() {
    var W = ACH.world, T = W.T, t0 = (window.performance || Date).now();
    ground = mk(W.W, W.H);
    high = mk(W.W, W.H);
    if (ACH.lienzo) { ACH.lienzo.noSnap(ground); ACH.lienzo.noSnap(high); }   // sin copia: si se pierden, el rehorneado los rehace
    var g = ground.getContext('2d'), hg = high.getContext('2d');
    g.imageSmoothingEnabled = false; hg.imageSmoothingEnabled = false;
    for (var r = 0; r < W.ROWS; r++) for (var c = 0; c < W.COLS; c++) {
      var ch = W.grid[r][c], h = hash(c, r), x = c * T, y = r * T;
      if (W.groundTile) { var gt = W.groundTile(c, r, h); g.drawImage(tile(gt[0], gt[1] | 0), x, y); continue; }   // v0.9: el Cerro elige su tile
      var ov = W.over[r * W.COLS + c];
      if (ov) {
        for (var li = 0; li < ov.length; li++) { var on = ov[li][0]; g.drawImage(tile(on, VARIANT[on] ? h : ov[li][1]), x, y); }
        continue;
      }
      switch (ch) {
        case 'L': g.drawImage(tile('roof', h % 7), x, y); break;   // se tapa con el lote horneado
        case 'X': drawBarricade(g, x, y, h); break;
        case 'a': g.drawImage(tile('alley', h), x, y); break;
        case 's': g.drawImage(tile('sidewalk', h), x, y); break;
        case 'n': g.drawImage(tile('curbN', h), x, y); break;
        case 'u': g.drawImage(tile('curbS', h), x, y); break;
        case 'b': g.drawImage(tile(r === W.ROW.berma[0] ? 'bermaN' : (r === W.ROW.berma[1] ? 'bermaS' : 'berma'), h), x, y); break;
        case 'S': g.drawImage(tile('stairs', 0), x, y); break;
        default: g.drawImage((h % 100) < 7 ? tile('asphaltCrack', h) : tile('asphalt', h), x, y);   // '.' y '-' (la raya se pinta aparte)
      }
    }
    // raya discontinua: una sola, centrada entre los dos carriles (el borde entre las dos filas de cada par), recortada del tile laneDashH
    var dash = W.ROW ? tile('laneDashH', 0) : null, dr, dc;
    if (W.bakeExtra) { try { W.bakeExtra(g, hg); } catch (eX) { console.warn('[ACHORADO] bakeExtra', eX); } }   // v0.9: lo que no es tile (la vista de la ciudad)
    (W.ROW ? [W.ROW.dashN, W.ROW.dashS] : []).forEach(function (pr) {
      for (dc = 0; dc < W.COLS; dc++) if (W.grid[pr[0]][dc] === '-' && !W.over[pr[0] * W.COLS + dc]) g.drawImage(dash, 0, 5, T, 6, dc * T, pr[1] * T - 3, T, 6);
    });
    // lotes: una sola vez, al cargar. canvas → suelo, over → capa alta, lights → ACH.world.lights
    W.lights.length = 0; W.lotsBaked.length = 0;
    for (var i = 0; i < W.LOTS.length; i++) {
      var f = W.LOTS[i], res = bakeLot(f), lx = f.c0 * T, ly = f.r0 * T;
      if (!(VOL() && ACH.volumen.lot(g, res, f, lx, ly))) g.drawImage(res.canvas, lx, ly);   // v0.14 (B): fachada con volumen
      if (res.over && isCanvas(res.over)) hg.drawImage(res.over, lx + (res.overX || 0), ly + (res.overY || 0));
      // x, y = centro del rectángulo de luz; w, h = tamaño de la ventana (el brillo la llena). Nunca se asume `face`: sale del lote.
      (res.lights || []).forEach(function (L) { W.lights.push({ x: lx + L.x, y: ly + L.y, kind: L.kind || 'local', lot: f.id, w: L.w, h: L.h, col: L.col }); });
      f.faceEff = W.effFace(f, res);
      W.lotsBaked.push(lotInfo(f, res, lx, ly));
    }
    // calcomanías y decoración de techo: al suelo, una sola vez
    var s, d;
    for (i = 0; i < W.decals.length; i++) {
      d = W.decals[i]; s = decal(d.k, d.v);
      if (d.rot === 2) { // 180°: la pintura vial del carril que va hacia el oeste se lee desde su sentido de marcha
        g.save(); g.translate(d.x - s.ax + s.width / 2, d.y - s.ay + s.height / 2); g.rotate(Math.PI); g.drawImage(s, -s.width / 2, -s.height / 2); g.restore();
      } else g.drawImage(s, d.x - s.ax, d.y - s.ay);
    }
    bakeShading(g);
    for (i = 0; i < W.decor.length; i++) { d = W.decor[i]; s = prop(d.k, d.v); g.drawImage(s, d.x - s.ax, d.y - s.ay); }
    buildCables(hg);
    collectLights();
    buildGroundFog();
    prewarmSilhouettes();
    bakeMs = Math.round((window.performance || Date).now() - t0);
  }
  function drawBarricade(g, x, y, h) { // tablas con franjas rojas y blancas + costales: fin del jirón
    g.drawImage(tile('asphalt', h % 5), x, y);
    g.fillStyle = '#1c1a22'; g.fillRect(x, y + 3, 16, 9);
    for (var i = 0; i < 16; i += 4) { g.fillStyle = (i / 4 + (h & 1)) % 2 ? '#c9c2b2' : '#9a3b30'; g.fillRect(x + i, y + 4, 4, 7); }
    g.fillStyle = '#7a6a4a'; g.fillRect(x + 2, y + 11, 5, 4); g.fillRect(x + 9, y + 11, 5, 4);
  }

  // Cables: de los aisladores (`tops` del sprite, no del viejo `top`) de cada poste a los del siguiente, de oeste a este por vereda.
  // 3–4 hilos por tramo con comba distinta (los dos de arriba gruesos, los de abajo finos), acometidas del poste a la fachada y un cruce
  // de avenida en cada jirón. Alturas y puntos salen del sprite: si los postes crecen, los cables suben con ellos. Capa alta horneada.
  function poleTops(pr) {
    var s = propSpr(pr), out = [];
    if (s.tops && s.tops.length) out = s.tops.map(function (t) { return { x: pr.x + t.x, y: pr.y + t.y }; });
    else if (pr.top) out = [{ x: pr.top.x, y: pr.top.y }];
    return out.sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
  }
  function buildCables(g) {
    var W = ACH.world, F = ACH.ent.CFG.fx, THICK = '#1c1a22', THIN = '#33303a', list = W.cables;
    list.length = 0;
    function wire(ax, ay, bx, by, sag, bow, col) {
      var mx = (ax + bx) / 2 + (bow || 0), my = (ay + by) / 2 + sag * 2;   // punto de control: la curva cuelga la mitad
      var n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.5) + 1;
      g.fillStyle = col;
      for (var i = 0; i <= n; i++) {
        var t = i / n, u = 1 - t;
        g.fillRect(Math.round(u * u * ax + 2 * u * t * mx + t * t * bx), Math.round(u * u * ay + 2 * u * t * my + t * t * by), 1, 1);
      }
      list.push({ ax: ax, ay: ay, bx: bx, by: by, sag: sag, bow: bow || 0, col: col });
    }
    g.save(); g.globalAlpha = F.cableAlpha === undefined ? 1 : F.cableAlpha;
    var lotAtPx = function (x, y) { var c = Math.floor(x / W.T), r = Math.floor(y / W.T); if (c < 0 || r < 0 || c >= W.COLS || r >= W.ROWS) return null; var i = W.lotAt[r][c]; return i < 0 ? null : W.LOTS[i]; };
    var tops = { N: [], S: [] };
    ['N', 'S'].forEach(function (side) {
      var ps = W.poles[side].filter(function (p) { return p.top; }).sort(function (a, b) { return a.x - b.x; });
      ps.forEach(function (p) { tops[side].push(poleTops(p)); });
      for (var i = 0; i + 1 < ps.length; i++) {
        var A = tops[side][i], Bt = poleTops(ps[i + 1]);
        var dx = ps[i + 1].x - ps[i].x, n = Math.min(A.length, Bt.length, 4);
        if (dx > 16 * W.T || !n) continue;
        var base = Math.max(3, F.cableSag * Math.min(1, dx / 128));
        for (var k = 0; k < n; k++) {
          var sag = k === 0 ? F.cableSag + (i % 2 ? 2 : 0) : base + k * 1.6 + ((i + k) % 2) * 1.2;   // el hilo 0 es el que dibujan las ropas de fx.js
          wire(A[k].x, A[k].y - (k === 0 ? F.cableWireDx / 2 : 0), Bt[k].x, Bt[k].y - (k === 0 ? F.cableWireDx / 2 : 0), sag, k === 3 ? F.cableBow / 2 : 0, k < 2 ? THICK : THIN);
        }
      }
      // acometidas: del hilo más bajo del poste a la fachada (norte) o a la azotea (sur) más cercana, en diagonal
      ps.forEach(function (p, i) {
        if ((i + (side === 'S' ? 1 : 0)) % 2) return;
        var T0 = tops[side][i]; if (!T0.length) return;
        var from = T0[T0.length - 1], dir = (i % 4 < 2) ? -1 : 1, tx = p.x + dir * (16 + (i * 7) % 10), f = lotAtPx(tx, side === 'N' ? 40 : 640);
        if (!f || f.walk || f.mural || f.side !== side) return;   // nunca un hilo sobre el mural
        var ty = side === 'N' ? (f.r1 + 1) * W.T - (f.faceEff || 3) * W.T + 10 + (i * 5) % 8 : f.r0 * W.T + 6;
        wire(from.x, from.y + 1, tx, ty, 3, 0, THIN);
        g.fillStyle = '#17151b'; g.fillRect(tx - 1, ty - 1, 3, 3);       // caja de empalme
      });
    });
    // v0.9: cadenas de postes del Cerro (W.poleChains: listas ordenadas de props poste). Cable entre consecutivos, más comba y 3 hilos.
    (W.poleChains || []).forEach(function (ch, ci) {
      for (var i = 0; i + 1 < ch.length; i++) {
        var A = poleTops(ch[i]), B = poleTops(ch[i + 1]), n = Math.min(A.length, B.length, 3);
        if (!n) { A = [{ x: ch[i].x, y: ch[i].top ? ch[i].top.y : ch[i].y - 50 }]; B = [{ x: ch[i + 1].x, y: ch[i + 1].top ? ch[i + 1].top.y : ch[i + 1].y - 50 }]; n = 1; }
        var d = Math.hypot(ch[i + 1].x - ch[i].x, ch[i + 1].y - ch[i].y), sag = Math.max(4, F.cableSag * 1.4 * Math.min(1.4, d / 128));
        for (var k = 0; k < n; k++) wire(A[k].x, A[k].y, B[k].x, B[k].y, sag + k * 2 + ((i + ci) % 2), k === 2 ? F.cableBow : 0, k < 2 ? THICK : THIN);
        if (n < 3) wire(A[0].x, A[0].y + 3, B[0].x, B[0].y + 3, sag + 5, -F.cableBow, THIN);   // un hilo suelto de más
      }
    });
    // cruce de avenida: donde un poste norte y uno sur quedan casi alineados (las bocacalles), dos hilos con comba lateral
    tops.N.forEach(function (tn, i) {
      var pn = W.poles.N.filter(function (p) { return p.top; })[i];
      W.poles.S.forEach(function (ps, j) {
        if (!ps.top || Math.abs(ps.x - pn.x) > 10 || !(W.JIRONES || []).some(function (J) { return Math.abs(pn.x - (J[0] * W.T - 6)) < 2; })) return;
        var ts = tops.S[W.poles.S.filter(function (p) { return p.top; }).indexOf(ps)];
        if (!ts) return;
        for (var k = 0; k < Math.min(2, tn.length, ts.length); k++) wire(tn[k].x, tn[k].y, ts[k].x, ts[k].y, 3 + k, k ? -6 : 7, k ? THIN : THICK);
      });
    });
    g.restore();
  }

  /* ---------------- Luz horneada: sombras de edificio, sombras proyectadas de props, AO (P1) ----------------
     Luz alta del noroeste: todo proyecta al sureste, 1 px a la derecha por cada 2 hacia abajo, en violeta #2a2440. */
  var SHADOW = '#2a2440';
  function lotById(id) { var L = ACH.world.LOTS; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function bakeShading(g) {
    var W = ACH.world, T = W.T, F = ACH.ent.CFG.fx, i, x, y;
    g.save();
    // 1. sombra de la manzana norte sobre su vereda: largo = mitad de la cara visible, borde en diente de 2 px
    if (F.buildingShadow > 0) {
      g.fillStyle = SHADOW;
      for (i = 0; i < W.LOTS.length; i++) {
        var f = W.LOTS[i];
        if (f.side !== 'N' || f.walk) continue;
        var face = (f.faceEff || f.face || Math.max(3, (f.floors || 1) * 2 + 1)) * T, L = Math.round(face / 2), yb = (f.r1 + 1) * T;
        var x0 = f.c0 * T, x1 = (f.c1 + 1) * T;
        if (VOL() && ACH.volumen.buildingShadow(g, x0, x1, yb, L, F.buildingShadow, SHADOW)) continue;   // v0.14 (B): borde suave
        g.globalAlpha = F.buildingShadow;
        for (y = 0; y < L; y++) {
          var sh = Math.floor(y / 2), tooth = (y >> 1) & 1;             // sesgo SE + diente de 2 px en el borde
          g.fillRect(x0 + sh + tooth * 2, yb + y, x1 - x0, 1);
        }
        // tramado en el borde inferior: media fila más
        g.globalAlpha = F.buildingShadow * 0.5;
        for (x = x0 + Math.floor(L / 2); x < x1 + Math.floor(L / 2); x += 2) g.fillRect(x + ((L >> 1) & 1), yb + L, 1, 1);
      }
    }
    // 2. AO: 2 px al 35 % + 2 px al 15 % al pie de cada borde sólido (lotes, barricadas) y bajo los sardineles
    if (F.ao > 0) {
      g.fillStyle = SHADOW;
      var cerro = !!W.groundTile;   // v0.9: en el Cerro cuentan los muros de terraza y la roca (isSolidTile), no solo lotes y barricadas
      var solid = cerro ? function (c, r) { return W.tileAt(c, r) !== null && W.isSolidTile(c, r); } : function (c, r) { var t = W.tileAt(c, r); return t === 'L' || t === 'X'; };
      var open = cerro ? function (c, r) { return W.tileAt(c, r) !== null && !W.isSolidTile(c, r); } : function (c, r) { var t = W.tileAt(c, r); return t !== null && t !== 'L' && t !== 'X' && t !== 'S'; };
      var VA = VOL() ? ACH.volumen.ao : null;   // v0.14 (B): AO en degradé continuo en vez de escalones de 2 px
      for (var r = 0; r < W.ROWS; r++) for (var c = 0; c < W.COLS; c++) {
        if (!solid(c, r)) continue;
        x = c * T; y = r * T;
        if (VA) {
          if (open(c, r + 1)) VA(g, x, y + T, T, 6, 0.42 * F.ao, 'S');
          if (open(c, r - 1)) VA(g, x, y - 3, T, 3, 0.25 * F.ao, 'N');
          if (open(c - 1, r)) VA(g, x - 4, y, 4, T, 0.25 * F.ao, 'W');
          if (open(c + 1, r)) VA(g, x + T, y, 4, T, 0.38 * F.ao, 'E');
          continue;
        }
        if (open(c, r + 1)) { g.globalAlpha = 0.35 * F.ao; g.fillRect(x, y + T, T, 2); g.globalAlpha = 0.15 * F.ao; g.fillRect(x, y + T + 2, T, 2); }
        if (open(c, r - 1)) { g.globalAlpha = 0.25 * F.ao; g.fillRect(x, y - 2, T, 2); }
        if (open(c - 1, r)) { g.globalAlpha = 0.25 * F.ao; g.fillRect(x - 2, y, 2, T); g.globalAlpha = 0.1 * F.ao; g.fillRect(x - 3, y, 1, T); }
        if (open(c + 1, r)) { g.globalAlpha = 0.35 * F.ao; g.fillRect(x + T, y, 2, T); g.globalAlpha = 0.15 * F.ao; g.fillRect(x + T + 2, y, 1, T); }
      }
      if (W.ROW) for (c = 0; c < W.COLS; c++) {
        if (VA) {
          if (W.tileAt(c, W.ROW.curbN) === 'n') VA(g, c * T, (W.ROW.curbN + 1) * T, T, 4, 0.4 * F.ao, 'S');
          if (W.tileAt(c, W.ROW.curbS) === 'u') VA(g, c * T, W.ROW.curbS * T - 3, T, 3, 0.3 * F.ao, 'N');
          continue;
        }
        if (W.tileAt(c, W.ROW.curbN) === 'n') { g.globalAlpha = 0.35 * F.ao; g.fillRect(c * T, (W.ROW.curbN + 1) * T, T, 2); g.globalAlpha = 0.15 * F.ao; g.fillRect(c * T, (W.ROW.curbN + 1) * T + 2, T, 1); }
        if (W.tileAt(c, W.ROW.curbS) === 'u') { g.globalAlpha = 0.3 * F.ao; g.fillRect(c * T, W.ROW.curbS * T - 2, T, 2); }
      }
    }
    // 3. sombra proyectada SE de cada prop sin sombra horneada (se calcula una vez por sprite y se reusa)
    if (F.castShadow > 0 && ACH.px && typeof ACH.px.shadowSE === 'function') {
      g.globalAlpha = 1;
      for (i = 0; i < W.props.length; i++) {
        var pr = W.props[i], s = propSpr(pr), shc = pr.lift ? null : castShadowOf(s);
        if (shc) { if (VOL()) ACH.volumen.softBlit(g, shc, pr.x - s.ax + (shc.ox || 0), pr.y - s.ay + (shc.oy || 0)); else g.drawImage(shc, pr.x - s.ax + (shc.ox || 0), pr.y - s.ay + (shc.oy || 0)); }
      }
    }
    g.restore();
  }
  // Contrato: un sprite con `shadowIn:true` (o `shadow:true`) ya trae su sombra (no se proyecta); con `shadow:<canvas con ox/oy>` se usa esa.
  function castShadowOf(s) {
    if (s._castSh !== undefined) return s._castSh;
    var F = ACH.ent.CFG.fx, out = null;
    if (isCanvas(s.shadow)) out = s.shadow;
    else if (s.shadow !== true && !s.shadowIn && !s.placeholder && s.height > 8) {
      try { out = ACH.px.shadowSE(s, F.castShadow, { base: Math.min(s.height - 1, s.ay) }); } catch (e) { out = null; }
    }
    s._castSh = out;
    return out;
  }

  /* ---------------- Luces del mundo: lista estática, armada al hornear ----------------
     LIGHTS: focos para el mapa de luz. EMIT: emisivos (se suman después del mapa de luz). Coordenadas de mundo. */
  var LIGHTS = [], EMIT = [];
  function collectLights() {
    var W = ACH.world, F = ACH.ent.CFG.fx, LS = (ACH.sprites && ACH.sprites.light) || null, i;
    LIGHTS.length = 0; EMIT.length = 0;
    if (!LS) return;
    var bad = {}; (F.lampBad || []).forEach(function (k) { bad[k] = 1; });
    // postes (o cualquier prop cuyo sprite traiga `lamp:{x,y}` relativo al ancla)
    var seen = [];
    function addLamp(pr, side, idx) {
      var s = propSpr(pr), lps = s.lamps && s.lamps.length ? s.lamps : [s.lamp || F.lampHead];
      var on = side ? ((idx + (side === 'S' ? 1 : 0)) % Math.max(1, F.lampEvery)) === 0 : true;
      var key = side ? side + idx : null, flick = key && bad[key] ? 1 + idx : 0;
      lps.forEach(function (lp) {
        var hx = pr.x + lp.x, hy = pr.y + lp.y;
        var gy = lp.gy !== undefined ? pr.y + lp.gy : pr.y + (side === 'S' ? -F.lampPoolDy : F.lampPoolDy);
        if (!on) {
          // v0.8 (G2): de noche se prende uno más de cada `lampEvery` postes apagados (entran con ACH.noche.t)
          var nightOn = side && ((idx + (side === 'S' ? 1 : 0)) % Math.max(1, F.lampEvery)) === 1;
          if (!nightOn) { EMIT.push({ x: hx, y: hy, spr: null, off: true }); return; }
          LIGHTS.push({ x: hx, y: gy, spr: LS.poste, k: 'lampLight', flick: flick, pr: pr, night: true });
          EMIT.push({ x: hx, y: hy, spr: LS.head, k: 'emissive', flick: flick, pr: pr, night: true });
          return;
        }
        LIGHTS.push({ x: hx, y: gy, spr: LS.poste, k: 'lampLight', flick: flick, pr: pr });
        EMIT.push({ x: hx, y: hy, spr: LS.head, k: 'emissive', flick: flick, pr: pr });
      });
    }
    ['N', 'S'].forEach(function (side) {
      var ps = W.poles[side].slice().sort(function (a, b) { return a.x - b.x; });
      for (var j = 0; j < ps.length; j++) { seen.push(ps[j]); addLamp(ps[j], side, j); }
    });
    // v0.9: postes del Cerro (cadenas): se prende 1 de cada lampEvery por cadena; de noche, uno más
    (W.poleChains || []).forEach(function (ch, ci) {
      ch.forEach(function (pr, j) { if (seen.indexOf(pr) >= 0) return; seen.push(pr); addLamp(pr, ci % 2 ? 'S' : 'N', j + ci); });
    });
    for (i = 0; i < W.props.length; i++) {
      var pr = W.props[i], s = propSpr(pr);
      if ((s.lamp || s.lamps) && pr.k !== 'semaforo' && seen.indexOf(pr) < 0) addLamp(pr, null, 0);
      // emisivos que trae el sprite: emit:[{x, y, kind:'semaforo'|'ventana'|'brasa'|..., r?, col?}]
      if (Array.isArray(s.emit)) s.emit.forEach(function (e) { pushEmit(pr.x + e.x, pr.y + e.y, e, pr); });
      else if (pr.k === 'semaforo') pushEmit(pr.x, pr.y - s.ay + 6, { kind: 'semaforo' }, pr);
      // brasas: debajo del humo de los anticuchos
      if (pr.smoke && /anticucho/.test(pr.k)) {
        LIGHTS.push({ x: pr.smoke.x, y: pr.y - 2, spr: LS.brasa, k: 'emberLight', flick: 50 + i, soft: true, pr: pr });
        EMIT.push({ x: pr.smoke.x, y: pr.smoke.y + 3, spr: LS.glow(5, '#ff7a1e'), k: 'emissive', flick: 50 + i, soft: true, pr: pr });
      }
    }
    // luces de lote (ACH.world.lights: local, cruz, foco; px de mundo)
    for (i = 0; i < W.lights.length; i++) {
      var L = W.lights[i], f = lotById(L.lot), base = f ? (f.r1 + 1) * W.T : L.y + 16;
      // un foco que manda por pantalla: luz de local a fuerza completa solo en los hitos; el resto a lotDim
      var sc = (F.lotLandmarks || []).indexOf(L.lot) >= 0 ? 1 : (F.lotDim === undefined ? 0.4 : F.lotDim);
      if (sc <= 0) continue;
      if (L.kind === 'cruz') {
        LIGHTS.push({ x: L.x, y: base - 2, spr: LS.cruz, k: 'lotLight', flick: 900 + i, soft: true, fan: false, s: sc });
        EMIT.push({ x: L.x, y: L.y, spr: LS.cross, k: 'emissive', flick: 900 + i, soft: true, s: sc });
      } else if (L.kind === 'foco') {
        LIGHTS.push({ x: L.x, y: L.y + 18, spr: LS.foco, k: 'lotLight', s: sc });
        EMIT.push({ x: L.x, y: L.y, spr: LS.glow(5, '#fff4d8'), k: 'emissive', s: sc });
      } else {
        if (f && f.side === 'N') LIGHTS.push({ x: L.x, y: base - 4, spr: LS.local, k: 'lotLight', fan: true, s: sc });
        LIGHTS.push({ x: L.x, y: L.y, spr: LS.ventana, k: 'lotLight', s: sc });
        if (L.w && L.h) EMIT.push({ x: L.x, y: L.y, rect: [L.w, L.h], col: L.col || '#5a3a14', k: 'emissive', s: sc });
        else EMIT.push({ x: L.x, y: L.y, spr: LS.glow(8, '#ffb45a'), k: 'emissive', a: 0.7, s: sc });
      }
    }
    function pushEmit(x, y, e, pr) {
      var kind = e.kind || 'ventana';
      if (kind === 'semaforo') EMIT.push({ x: x, y: y, spr: LS.glow(e.r || 4, e.col || '#ffb020'), k: 'emissive', blink: true, pr: pr });
      else if (kind === 'brasa') EMIT.push({ x: x, y: y, spr: LS.glow(e.r || 5, e.col || '#ff7a1e'), k: 'emissive', flick: Math.round(x), soft: true, pr: pr });
      else EMIT.push({ x: x, y: y, spr: LS.glow(e.r || 8, e.col || '#ffb45a'), k: 'emissive', a: 0.7, pr: pr });
    }
  }
  // v0.5: postes de sodio encendidos (pozo de luz en el suelo) y cruces de botica (neón), para el zumbido posicional del ambiente.
  function audioLamps() {
    var out = [], W = ACH.world, i, L;
    for (i = 0; i < LIGHTS.length; i++) if (LIGHTS[i].k === 'lampLight' && !LIGHTS[i].night && !(LIGHTS[i].pr && LIGHTS[i].pr.lampOut)) out.push({ x: LIGHTS[i].x, y: LIGHTS[i].y, sub: 'sodium' });
    for (i = 0; i < W.lights.length; i++) { L = W.lights[i]; if (L.kind === 'cruz') out.push({ x: L.x, y: L.y, sub: 'neon' }); }
    return out;
  }
  // Parpadeo: patrón irregular (ráfagas de cortes) para los postes malos; respiración suave para la cruz y las brasas.
  // v0.6: luz de un prop roto (poste golpeado, anticuchos rotos): parpadea hasta lampFlickUntil y luego se apaga.
  function brokenK(L, t) {
    var pr = L.pr;
    if (!pr || !pr.lampOut) return 1;
    if (t < (pr.lampFlickUntil || 0)) return (hash(Math.floor(t * 18), 7) % 3) === 0 ? 1 : 0.05;
    return 0;
  }
  function flickAt(L, t) {
    if (L.pr && L.pr.lampOut) return brokenK(L, t);
    if (!L.flick || !ACH.ent.CFG.fx.flicker) return 1;
    var slot = Math.floor(t * 14), h = hash(slot, L.flick) % 100;
    if (L.soft) return 0.82 + 0.18 * ((hash(Math.floor(t * 6), L.flick) % 4) / 3);
    var burst = Math.sin(t * 0.83 + L.flick * 1.7) + Math.sin(t * 2.1 + L.flick) * 0.5 > 0.9;
    return burst ? (h < 50 ? 0.08 : (h < 70 ? 0.5 : 1)) : (h < 2 ? 0.35 : 1);
  }

  /* ---------------- Mapa de luz por multiplicación ---------------- */
  var lm = null, lmg = null, zhalo = null;
  function zombieHaloSpr(A) { // el halo de Alexander a media escala (se calcula una vez)
    if (zhalo) return zhalo;
    zhalo = mk(Math.round(A.width / 2), Math.round(A.height / 2));
    var g = zhalo.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(A, 0, 0, zhalo.width, zhalo.height);
    zhalo.cx = Math.round(A.cx / 2); zhalo.cy = Math.round(A.cy / 2);
    return zhalo;
  }
  // v0.8 (G2): la noche. nightT() = ACH.noche.t (0 de día → 1 de noche). Fuerza de una luz: las `night` solo entran de noche;
  // las de local atenuadas (lotDim) suben hacia 1 (se prenden más ventanas y letreros).
  function nightT() { var N = ACH.noche; return N && N.t > 0 ? N.t : 0; }
  // v0.9: ACH.render.addLight(x, y, r, color, t): luz que entra al mapa de luz durante t s (r se redondea a pares: el brillo se cachea por tamaño).
  var TEMPL = [];
  function addLight(x, y, r, color, t, a) {
    var G = ACH.G; if (!G) return;
    r = Math.max(4, Math.min(120, Math.round((r || 24) / 2) * 2));
    TEMPL.push({ x: x, y: y, r: r, col: color || '#ff9a3a', until: (G.clock || 0) + (t === undefined ? 1 / 30 : t), a: a === undefined ? 1 : a });
    if (TEMPL.length > 64) TEMPL.shift();
  }
  // v0.9: ganchos de dibujo de otros módulos. ground/air/screen: fn(ctx, G, cx, cy). ysort: fn(G) → [{y, draw(ctx, cx, cy)}].
  var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'ysort', 'air', 'screen'].forEach(function (k) { if (!Array.isArray(DH[k])) DH[k] = []; });
  // v0.11 (B): ACH.extraDrawables = [fn(G) → [{y, draw(ctx, cx, cy)}]]: entran al orden por y (por el mismo camino que DH.ysort)
  if (!Array.isArray(ACH.extraDrawables)) ACH.extraDrawables = [];
  DH.ysort.push(function (G) {
    var XD = ACH.extraDrawables, out = null;
    if (!XD || !XD.length) return null;
    for (var i = 0; i < XD.length; i++) {
      var r = null; try { r = XD[i](G); } catch (e) { r = null; }
      if (r && r.length) { if (!out) out = []; for (var j = 0; j < r.length; j++) out.push(r[j]); }
    }
    return out;
  });
  var dhErr = {};
  function runHooks(k, ctx, G, cx, cy) {
    var L = DH[k];
    for (var i = 0; i < L.length; i++) {
      try { L[i](ctx, G, cx, cy); } catch (e) { if (!dhErr[k + i]) { dhErr[k + i] = 1; console.warn('[ACHORADO] drawHooks.' + k, e); } }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
  // v0.16: cada gancho recibe (G, list): además de devolver sus objetos puede ajustar el orden (y) de lo que ya está en la lista
  function ysortHooks(G, list) {
    var L = DH.ysort;
    for (var i = 0; i < L.length; i++) {
      var out = null;
      try { out = L[i](G, list); } catch (e) { if (!dhErr['y' + i]) { dhErr['y' + i] = 1; console.warn('[ACHORADO] drawHooks.ysort', e); } }
      if (out && out.length) for (var j = 0; j < out.length; j++) if (out[j] && typeof out[j].y === 'number' && typeof out[j].draw === 'function') list.push({ y: out[j].y, loose: out[j] });
    }
  }
  function lightS(L, nt) {
    var s = L.s === undefined ? 1 : L.s;
    if (L.night) return s * nt;
    if (nt > 0 && s < 1) s += (1 - s) * nt * 0.85;
    return s;
  }
  function drawLightMap(ctx, G, cx, cy) {
    var F = ACH.ent.CFG.fx, LS = ACH.sprites && ACH.sprites.light, nt = nightT();
    if (!(F.light > 0)) return;
    if (!lm) { lm = mkGpu(VIEW.w, VIEW.h); lmg = lm.getContext('2d'); lmg.imageSmoothingEnabled = false; }
    lmg.globalCompositeOperation = 'source-over'; lmg.globalAlpha = 1;
    lmg.fillStyle = nt > 0 && ACH.noche.ambient ? ACH.noche.ambient(F.lightAmbient) : F.lightAmbient; lmg.fillRect(0, 0, VIEW.w, VIEW.h);
    lmg.globalCompositeOperation = 'lighter';
    for (var i = 0; i < LIGHTS.length; i++) {
      var L = LIGHTS[i], s = L.spr, a = F[L.k] * lightS(L, nt);
      if (!(a > 0) || !s) continue;
      var x = Math.round(L.x - cx - s.cx), y = Math.round(L.y - cy - s.cy);
      if (x > VIEW.w || y > VIEW.h || x + s.width < 0 || y + s.height < 0) continue;
      lmg.globalAlpha = Math.min(1, a * flickAt(L, G.clock));
      lmg.drawImage(s, x, y);
    }
    if (LS && TEMPL.length) {   // v0.9: luces temporales (fuego, chispas) de ACH.render.addLight
      for (var tl = TEMPL.length - 1; tl >= 0; tl--) {
        var TL = TEMPL[tl];
        if (G.clock > TL.until) { TEMPL.splice(tl, 1); continue; }
        var gs = LS.glow(TL.r, TL.col), gx = Math.round(TL.x - cx - gs.cx), gyy = Math.round(TL.y - cy - gs.cy);
        if (gx > VIEW.w || gyy > VIEW.h || gx + gs.width < 0 || gyy + gs.height < 0) continue;
        lmg.globalAlpha = Math.min(1, TL.a * Math.min(1, (TL.until - G.clock) / 0.25 + 0.2));
        lmg.drawImage(gs, gx, gyy);
      }
    }
    if (LS && ACH.inter && ACH.inter.lightsInto) {   // v0.6: intermitentes de alarma de auto
      var AL = LS.glow(30, '#ffa23a');   // QA v0.6: más grande y fuerte para que el parpadeo se lea en pantalla
      lmg.globalAlpha = 1;
      ACH.inter.lightsInto(function (x, y) { lmg.drawImage(AL, Math.round(x - cx - AL.cx), Math.round(y - cy - AL.cy)); }, G.clock);
    }
    if (LS && F.alexLight > 0 && G.player) {
      var p = G.player, A = LS.alex;
      lmg.globalAlpha = Math.min(1, F.alexLight * (1 + 0.25 * nt));   // de noche el halo de Alexander pesa más: que se lea
      lmg.drawImage(A, Math.round(p.x - cx - A.cx), Math.round(p.y - 6 - cy - A.cy));
    }
    if (LS && F.zombieHalo > 0 && G.player && G.zombies) { // halo chico bajo cada zombie cercano a Alexander: que se ubiquen en un segundo
      var hz = zombieHaloSpr(LS.alex), pl = G.player, R = F.zombieHaloR || 140;
      for (var zi = 0; zi < G.zombies.length; zi++) {
        var zz = G.zombies[zi];
        if (zz.state === 'muerto' || zz.social) continue;   // la orquesta no lleva halo: ya la alumbra el foco de la tarima
        var zd = Math.sqrt((zz.x - pl.x) * (zz.x - pl.x) + (zz.y - pl.y) * (zz.y - pl.y));
        if (zd > R) continue;
        lmg.globalAlpha = Math.min(1, F.zombieHalo * (1 + 0.8 * nt) * Math.min(1, (R - zd) / 30));
        lmg.drawImage(hz, Math.round(zz.x - cx - hz.cx), Math.round(zz.y - 6 - cy - hz.cy));
      }
    }
    lmg.globalAlpha = 1; lmg.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lm, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawEmissive(ctx, G, cx, cy) {
    var F = ACH.ent.CFG.fx, nt = nightT();
    ctx.globalCompositeOperation = 'lighter';
    if (F.lampSheen > 0) for (var j = 0; j < LIGHTS.length; j++) { // brillo del sodio sobre la pista mojada
      var Lp = LIGHTS[j], ps = Lp.spr;
      if (Lp.k !== 'lampLight' || !(F.lampLight > 0) || (Lp.night && !(nt > 0))) continue;
      var px0 = Math.round(Lp.x - cx - ps.cx), py0 = Math.round(Lp.y - cy - ps.cy);
      if (px0 > VIEW.w || py0 > VIEW.h || px0 + ps.width < 0 || py0 + ps.height < 0) continue;
      ctx.globalAlpha = Math.min(1, F.lampSheen * (1 + nt) * (Lp.night ? nt : 1) * flickAt(Lp, G.clock));
      ctx.drawImage(ps, px0, py0);
    }
    if (!(F.emissive > 0)) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return; }
    if (ACH.inter && ACH.inter.lightsInto && ACH.sprites && ACH.sprites.light) {
      var AE = ACH.sprites.light.glow(4, '#ffc040');
      ctx.globalAlpha = 1;
      ACH.inter.lightsInto(function (x, y) { ctx.drawImage(AE, Math.round(x - cx - AE.cx), Math.round(y - cy - AE.cy)); }, G.clock);
    }
    if (ACH.social && ACH.social.drawEmissive) ACH.social.drawEmissive(ctx, cx, cy, G.clock);   // F7: brillo de la cantante y de las ventanas con siluetas
    for (var i = 0; i < EMIT.length; i++) {
      var E = EMIT[i];
      if (E.off) continue;
      var a = F.emissive * (E.a || 1) * lightS(E, nt) * flickAt(E, G.clock);
      if (E.blink) a *= (G.clock % 1) < 0.5 ? 1 : 0.08;
      if (a <= 0.02) continue;
      if (E.rect) {
        var rx = Math.round(E.x - cx - E.rect[0] / 2), ry = Math.round(E.y - cy - E.rect[1] / 2);
        if (rx > VIEW.w || ry > VIEW.h || rx + E.rect[0] < 0 || ry + E.rect[1] < 0) continue;
        ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = E.col; ctx.fillRect(rx, ry, E.rect[0], E.rect[1]);
        continue;
      }
      var s = E.spr, x = Math.round(E.x - cx - s.cx), y = Math.round(E.y - cy - s.cy);
      if (x > VIEW.w || y > VIEW.h || x + s.width < 0 || y + s.height < 0) continue;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(s, x, y);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------- Sombras de contacto (antes de props y entidades: van en el piso) ---------------- */
  function contactAt(ctx, spr, x, y) { ctx.drawImage(spr, x - spr.cx, y - spr.cy); }
  function drawContacts(ctx, G, cx, cy) {
    var F = ACH.ent.CFG.fx, C = ACH.sprites && ACH.sprites.light && ACH.sprites.light.contact;
    if (VOL() && ACH.volumen.shadows(ctx, G, cx, cy, volList)) return;   // v0.14 (B): sombras suaves proyectadas al SE (y del farol de noche)
    if (!C || !(F.contactShadow > 0)) return;
    ctx.globalAlpha = Math.min(1, F.contactShadow);
    var i, p = G.player;
    if (!invisible(p)) contactAt(ctx, C.std, Math.round(p.x) - cx, Math.round(p.y) - cy);
    for (i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state === 'muerto') continue;
      var zx = Math.round(z.x) - cx, zy = Math.round(z.y) - cy;
      if (zx < -12 || zx > VIEW.w + 12 || zy < -8 || zy > VIEW.h + 30) continue;
      contactAt(ctx, z.type === 'escolar' ? C.small : C.std, zx, zy);
    }
    if (G.npcs) for (i = 0; i < G.npcs.dogs.length; i++) {
      var d = G.npcs.dogs[i], dx = Math.round(d.x) - cx, dy = Math.round(d.y) - cy;
      if (dx > -16 && dx < VIEW.w + 16 && dy > -8 && dy < VIEW.h + 30) contactAt(ctx, C.dog, dx, dy);
    }
    ctx.globalAlpha = 1;
  }
  function birdShadow(ctx, x, y) { // gallinazos y Titina: elipse chica en el piso
    if (VOL() && ACH.volumen.bird(ctx, x, y)) return;   // v0.14 (B): mancha suave
    var F = ACH.ent.CFG.fx, C = ACH.sprites && ACH.sprites.light && ACH.sprites.light.contact;
    if (!C || !(F.contactShadow > 0)) return;
    ctx.globalAlpha = Math.min(1, F.contactShadow * 0.85); contactAt(ctx, C.bird, x, y); ctx.globalAlpha = 1;
  }

  /* ---------------- Atmósfera: niebla baja de callejón, niebla por profundidad, gotas, viñeta ---------------- */
  var gfogRegions = [], gfogBuf = null, gfogG = null, vign = null, dfog = null;
  function buildGroundFog() {
    var W = ACH.world, T = W.T, LS = ACH.sprites && ACH.sprites.light;
    gfogRegions = [];
    if (!LS) return;
    (W.PASAJES || []).forEach(function (p) { gfogRegions.push({ x: p.c0 * T, y: p.r0 * T, w: (p.c1 - p.c0 + 1) * T, h: (p.r1 - p.r0 + 1) * T + 8, mouth: 'S' }); });
    (W.JIRONES || []).forEach(function (J) { // tramos de jirón fuera de la avenida (tiles 'j'), al norte y al sur
      var r0 = -1;
      for (var r = 0; r <= W.ROWS; r++) {
        var isJ = r < W.ROWS && W.tileAt(J[0], r) === 'j';
        if (isJ && r0 < 0) r0 = r;
        if (!isJ && r0 >= 0) {
          var north = r0 < W.ROWS / 2;
          gfogRegions.push({ x: J[0] * T, y: r0 * T, w: (J[1] - J[0] + 1) * T, h: (r - r0) * T + (north ? 10 : 0), mouth: north ? 'S' : 'N' });
          r0 = -1;
        }
      }
    });
    var mw = 0, mh = 0;
    gfogRegions.forEach(function (R) { R.mask = LS.fogMask(R.w, R.h, R.mouth); mw = Math.max(mw, R.w); mh = Math.max(mh, R.h); });
    gfogBuf = mk(Math.max(1, mw), Math.max(1, mh)); gfogG = gfogBuf.getContext('2d');
  }
  function drawGroundFog(ctx, cx, cy, t, alpha) {
    if (!(alpha > 0) || !gfogG) return;
    for (var i = 0; i < gfogRegions.length; i++) {
      var R = gfogRegions[i], sx = R.x - cx, sy = R.y - cy;
      if (sx > VIEW.w || sy > VIEW.h || sx + R.w < 0 || sy + R.h < 0) continue;
      gfogG.globalCompositeOperation = 'source-over'; gfogG.globalAlpha = 1;
      gfogG.clearRect(0, 0, R.w, R.h);
      var gnt = nightT();
      gfogG.fillStyle = gnt > 0 ? 'rgba(' + Math.round(206 - 90 * gnt) + ',' + Math.round(210 - 66 * gnt) + ',' + Math.round(212 - 4 * gnt) + ',0.45)' : 'rgba(206,210,212,0.45)';   // v0.8: azulada de noche
      gfogG.fillRect(0, 0, R.w, R.h);
      var ox = -(Math.round(t * 4 + R.x * 0.3) % 256), oy = -(Math.round(t * 1.5 + R.y) % 256);
      for (var x = ox; x < R.w; x += 256) for (var y = oy; y < R.h; y += 256) gfogG.drawImage(fog, x, y);
      gfogG.globalCompositeOperation = 'destination-in';
      gfogG.drawImage(R.mask, 0, 0);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(gfogBuf, 0, 0, R.w, R.h, sx, sy, R.w, R.h);
    }
    gfogG.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  function drawScreenMask(ctx, which, a) {
    if (!(a > 0)) return;
    var LS = ACH.sprites && ACH.sprites.light;
    if (!LS) return;
    if (which === 'v') { if (!vign) vign = LS.vignette(VIEW.w, VIEW.h); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(vign, 0, 0); }
    else { if (!dfog) dfog = LS.depthFog(VIEW.w, VIEW.h); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(dfog, 0, 0); }
    ctx.globalAlpha = 1;
  }

  /* ---------------- Siluetas (entidades tapadas por props altos) ---------------- */
  // Alexander: silueta blanca de cada cuadro, generada al cargar. Zombies: su cuadro `hurt`, que ya es blanco.
  function silhouetteOf(c) {
    if (!c._white) { c._white = whiteOf(c, 'white.' + (silN++)); }
    return KK > 1 ? hdDerive(c, c._white, whitePaint) : c._white;   // v0.15: la silueta de la HD
  }
  function whitePaint(g) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, 4096, 4096); }
  var silN = 0;
  function prewarmSilhouettes() {
    var pw = ACH.world.props;
    for (var q = 0; q < pw.length; q++) { var ps = propSpr(pw[q]); if (pw[q].tall) { maskOf(ps); if (pw[q].pole || ps.poleKind) shaftMaskOf(ps); } }
    ['bird', 'nobird'].forEach(function (set) {
      DIRS.forEach(function (dir) {
        silhouetteOf(alex(set, 'idle', dir, 0));
        for (var f = 0; f < alexFrames(set, 'walk', dir); f++) silhouetteOf(alex(set, 'walk', dir, f));
        for (f = 0; f < alexFrames(set, 'attack', dir); f++) silhouetteOf(alex(set, 'attack', dir, f));
      });
    });
  }

  /* ---------------- Neblina ---------------- */
  var fog = null;
  function buildFog() {
    fog = mk(256, 256);
    var g = fog.getContext('2d');
    for (var i = 0; i < 26; i++) {
      var x = Math.random() * 256, y = Math.random() * 256, rad = 30 + Math.random() * 60;
      for (var ox = -256; ox <= 256; ox += 256) for (var oy = -256; oy <= 256; oy += 256) {
        var gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, 'rgba(214,214,206,0.55)'); gr.addColorStop(1, 'rgba(214,214,206,0)');
        g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
    // v0.8 (G2): la misma neblina con tinte azul de noche (se hornea una vez; drawFog funde entre las dos según ACH.noche.t)
    fogN = mk(256, 256);
    var gn = fogN.getContext('2d');
    gn.drawImage(fog, 0, 0);
    gn.globalCompositeOperation = 'source-atop'; gn.fillStyle = 'rgba(92,128,214,0.78)'; gn.fillRect(0, 0, 256, 256);
    gn.globalCompositeOperation = 'source-over';
  }
  var fogN = null;
  function drawFog(ctx, cam, t) {
    var FX = ACH.ent.CFG.fx, fa = FX.fogAlpha === undefined ? 1 : FX.fogAlpha;
    var layers = [[0.10 * fa, 6, 2, 0.6], [0.08 * fa, -9, 4, 0.85]];
    if (FX.fogLayers !== undefined) layers.length = Math.max(0, Math.min(2, FX.fogLayers));   // calidad baja (tactil.js): menos capas
    if (!(fa > 0)) layers.length = 0;
    var nt = nightT(), passes = nt <= 0 ? [[fog, 1]] : nt >= 1 ? [[fogN, 1.15]] : [[fog, 1 - nt], [fogN, nt * 1.15]];
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l];
      var ox = Math.round(-(cam.x * L[3] + t * L[1])) % 256, oy = Math.round(-(cam.y * L[3] + t * L[2])) % 256;
      if (ox > 0) ox -= 256; if (oy > 0) oy -= 256;
      for (var pq = 0; pq < passes.length; pq++) {
        var fimg = passes[pq][0] || fog;
        ctx.globalAlpha = Math.min(1, L[0] * 2.2 * passes[pq][1]);
        for (var x = ox; x < VIEW.w; x += 256) for (var y = oy; y < VIEW.h; y += 256) ctx.drawImage(fimg, x, y);
      }
    }
    ctx.globalAlpha = 1;
    // velo gris viejo (cielo panza de burro): apagado por defecto, lo reemplaza el ambiente del mapa de luz
    if (FX.veil > 0) { ctx.fillStyle = 'rgba(150,150,145,' + FX.veil + ')'; ctx.fillRect(0, 0, VIEW.w, VIEW.h); }
  }

  /* ---------------- Garúa: llovizna fina, muy sutil, sobre la neblina ---------------- */
  var drizzle = null;
  function buildDrizzle() {
    drizzle = mk(128, 128);
    var g = drizzle.getContext('2d');
    g.fillStyle = '#e6eaee';
    for (var i = 0; i < 46; i++) { // rayitas de 1×3 px inclinadas; el lienzo es periódico en ambos ejes
      var x = Math.floor(Math.random() * 128), y = Math.floor(Math.random() * 128);
      for (var k = 0; k < 3; k++) g.fillRect((x + (k >> 1)) % 128, (y + k) % 128, 1, 1);
    }
  }
  function drawDrizzle(ctx, t) {
    var F = ACH.ent.CFG.fx;
    if (!drizzle) buildDrizzle();
    var layers = [[1, 0], [0.7, 53]];
    for (var l = 0; l < layers.length; l++) {
      var sp = F.drizzleSpeed * layers[l][0];
      var oy = Math.round(t * sp + layers[l][1]) % 128, ox = -Math.round(t * sp * F.drizzleSlant + layers[l][1] * 0.5) % 128;
      ctx.globalAlpha = F.drizzleAlpha * (l ? 0.7 : 1);
      for (var x = ox - 128; x < VIEW.w; x += 128) for (var y = oy - 128; y < VIEW.h; y += 128) ctx.drawImage(drizzle, x, y);
    }
    // gotas grandes ocasionales: rachas de unos segundos, más rápidas y un poco más claras
    if (F.drops > 0) {
      if (!drops) buildDrops();
      var gust = Math.sin(t * 0.37) + Math.sin(t * 0.91 + 1.3) * 0.6;
      if (gust > 0.7) {
        var sp2 = F.drizzleSpeed * 2.6, dy = Math.round(t * sp2) % 256, dx = -Math.round(t * sp2 * F.drizzleSlant) % 256;
        ctx.globalAlpha = Math.min(1, F.drops * Math.min(1, (gust - 0.7) * 3));
        for (var x2 = dx - 256; x2 < VIEW.w; x2 += 256) for (var y2 = dy - 256; y2 < VIEW.h; y2 += 256) ctx.drawImage(drops, x2, y2);
      }
    }
    ctx.globalAlpha = 1;
  }
  var drops = null;
  function buildDrops() {
    drops = mk(256, 256);
    var g = drops.getContext('2d');
    for (var i = 0; i < 9; i++) {
      var x = Math.floor(Math.random() * 256), y = Math.floor(Math.random() * 256);
      g.fillStyle = '#f2f4f6'; for (var k = 0; k < 5; k++) g.fillRect((x + (k >> 1)) % 256, (y + k) % 256, 1, 1);
      g.fillStyle = '#9aa4b0'; g.fillRect((x + 3) % 256, (y + 5) % 256, 1, 1);
    }
  }

  /* ---------------- Dibujo ---------------- */
  // v0.14 (B): volE = la entidad que se está dibujando (drawEnt / drawZombieTo): con ACH.volumen activo pasa por volumen.actor
  // (rim, borde, degradé en el lienzo principal; inclinación y squash en todas las capas, para que calcen).
  var volE = null, volOn = false;
  function VOL() { return !!(ACH.volumen && ACH.volumen.on && ACH.volumen.on()); }
  function drawSpr(ctx, c, x, y, flip) {
    if (volE && volOn) { ACH.volumen.actor(ctx, c, x, y, flip, false, volE, ctx === mainCtx); return; }
    if (!flip) { ctx.drawImage(c, x - c.ax, y - c.ay); return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(c, -c.ax, -c.ay); ctx.restore();
  }

  // Aplastado del golpe: 1 px más bajo, 2 px más ancho, con los pies en el mismo lugar.
  function drawSquash(ctx, c, x, y, flip) {
    if (volE && volOn) { ACH.volumen.actor(ctx, c, x, y, flip, true, volE, ctx === mainCtx); return; }
    var w = c.width + 2, h = c.height - 1;
    ctx.save(); ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(c, 0, 0, c.width, c.height, -c.ax - 1, -c.ay + 1, w, h);
    ctx.restore();
  }

  function slingFrame(set, dir, f) {   // alex.<v>.sling[dir] = [estirar, soltar]; si falta, los cuadros del guitarrazo
    var c = frameOf(dig('alex.' + set + '.sling.' + dir), f);
    return c ? anchored(c) : alex(set, 'attack', dir, f ? 2 : 0);
  }
  // v0.8 (G2): juego de cuadros según la guitarra (ACH.armas.alexSet(v) → 'g1'|'g2'|'g3': alex.<v>.<gs>.idle/walk/attack, misma forma)
  // y poses de armas (ACH.armas.pose(p) → 'punch'|'skateHold'|'skateSwing'|'kick'|'sick'…: alex.<v>.<pose>[dir][f], o alex.<v>.sick[f]).
  // Si falta el arte, cae a los cuadros de siempre (sin anotar faltantes: el arte de G3 puede llegar después).
  function armasCall(fn, a, b) { var A = ACH.armas; if (!A || typeof A[fn] !== 'function') return null; try { return A[fn](a, b); } catch (e) { return null; } }
  function alexG(set, gs, anim, dir, f) {
    if (gs) {
      var o = dig('alex.' + set + '.' + gs + '.' + anim + '.' + dir), c = anim === 'idle' ? (isCanvas(o) ? o : frameOf(o, 0)) : frameOf(o, f);
      if (c) return anchored(c);
    }
    return alex(set, anim, dir, f);
  }
  var POSE_FALLBACK = { punch: 'attack', skateSwing: 'attack', kick: 'attack', skateHold: 'walk' };
  function poseSprite(set, gs, pose, p) {
    var f = armasCall('poseFrame', p) | 0, o = dig('alex.' + set + '.' + pose), c = null;
    if (o && !Array.isArray(o) && !isCanvas(o)) c = frameOf(o[p.dir], f);   // [pose][dir][f]
    if (!c) c = frameOf(o, f);                                                   // [pose][f] (sick)
    if (c) return anchored(c);
    var fb = POSE_FALLBACK[pose];
    if (fb === 'walk') return p.moving ? alexG(set, gs, 'walk', p.dir, Math.floor(p.animT)) : alexG(set, gs, 'idle', p.dir, 0);
    if (fb) return alexG(set, gs, 'attack', p.dir, Math.min(2, f));
    return null;
  }
  function playerSprite(p) {
    var set = p.bird ? 'bird' : 'nobird';
    var pose = p.atkT < 0 && ACH.inter && ACH.G && ACH.inter.slingPose(ACH.G);
    if (pose) return slingFrame(set, p.dir, pose === 'charge' ? 0 : 1);
    var gs = armasCall('alexSet', set, p);
    if (gs !== 'g1' && gs !== 'g2' && gs !== 'g3') gs = null;
    var ap = armasCall('pose', p), ps;
    if (!ap && !(ACH.armas && ACH.armas.pose) && p.sickT > 0 && !p.moving && p.atkT < 0) ap = 'sick';   // sin armas.js: el empacho igual se ve
    if (ap && typeof ap === 'string' && (ps = poseSprite(set, gs, ap, p))) return ps;
    if (p.atkT >= 0) return alexG(set, gs, 'attack', p.dir, Math.min(2, Math.floor(p.atkT / ACH.ent.CFG.atkFrame)));
    if (p.moving) return alexG(set, gs, 'walk', p.dir, Math.floor(p.animT));
    return alexG(set, gs, 'idle', p.dir, 0);
  }
  // Empacho: la cara verde (copia del cuadro con la franja de la cabeza teñida; se hace una vez por lienzo).
  function sickPaint(c) {
    return function (g) {
      g.globalCompositeOperation = 'source-atop';
      var y0 = Math.max(0, c.ay - 26), y1 = Math.max(y0 + 4, c.ay - 15);
      g.fillStyle = 'rgba(110,196,70,0.42)'; g.fillRect(0, y0, c.width, y1 - y0);
      g.fillStyle = 'rgba(110,196,70,0.16)'; g.fillRect(0, y1, c.width, 3);
    };
  }
  function sickOf(c) {
    if (c._sick) return KK > 1 ? hdDerive(c, c._sick, sickPaint(c)) : c._sick;
    var o = mk(c.width, c.height), g = o.getContext('2d');
    g.drawImage(c, 0, 0);
    sickPaint(c)(g);
    o.ax = c.ax; o.ay = c.ay; c._sick = o;
    return KK > 1 ? hdDerive(c, o, sickPaint(c)) : o;
  }
  // Invisibilidad (Cola Inglesa): contorno celeste que tiembla (cacheado por lienzo).
  function shimPaint(g) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#bfeaff'; g.fillRect(0, 0, 4096, 4096); }
  function shimmerOf(c) {
    if (c._shim) return KK > 1 ? hdDerive(c, c._shim, shimPaint) : c._shim;
    var o = mk(c.width, c.height), g = o.getContext('2d');
    g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#bfeaff'; g.fillRect(0, 0, c.width, c.height);
    o.ax = c.ax; o.ay = c.ay; c._shim = o;
    return KK > 1 ? hdDerive(c, o, shimPaint) : o;
  }
  function invisible(p) { return p && p.invisT > 0 && p.hp > 0; }
  var SHIM = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function drawInvisible(g, spr, x, y, clock, outline) {
    var a0 = g.globalAlpha;
    if (outline) {
      var sh = shimmerOf(spr), k = Math.floor(clock * 14);
      for (var i = 0; i < 4; i++) {
        var o = SHIM[(i + k) & 3], j = ((k + i) % 3 === 0) ? 1 : 0;
        g.globalAlpha = a0 * (0.16 + 0.14 * Math.abs(Math.sin(clock * 9 + i * 1.7)));
        g.drawImage(sh, x - sh.ax + o[0] + (i === 0 ? j : 0), y - sh.ay + o[1]);
      }
    }
    g.globalAlpha = a0 * 0.25;
    g.drawImage(spr, x - spr.ax + (Math.sin(clock * 23) > 0.85 ? 1 : 0), y - spr.ay);
    g.globalAlpha = a0;
  }

  // Perro: idle/bark miran a la derecha (se voltean si mira a la izquierda); walk trae left y right.
  function dogSprite(d) {
    var spr, flip = false;
    if (d.state === 'bark') spr = perro('bark', 'right', Math.floor(d.anim * 7)), flip = d.face < 0;
    else if (d.moving) spr = perro('walk', d.face < 0 ? 'left' : 'right', Math.floor(d.anim * (d.state === 'flee' ? 14 : 7)));
    else spr = perro('idle', 'right', Math.floor(d.anim * 2.2)), flip = d.face < 0;
    return { s: spr, flip: flip };
  }
  function drawDog(ctx, d, cx, cy) {
    var x = Math.round(d.x) - cx, y = Math.round(d.y) - cy, ds = dogSprite(d);
    drawSpr(ctx, ds.s, x, y, ds.flip);
  }
  // Gallinazos: posados (cabeza que gira de vez en cuando; miran a la izquierda) o en vuelo (miran a la izquierda; se voltean si van a la derecha).
  function drawBirds(ctx, G, cx, cy) {
    var birds = G.npcs.birds, CF = ACH.ent.CFG;
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      if (b.state === 'gone') continue;
      var x = Math.round(b.x) - cx, y = Math.round(b.y - b.z) - cy;
      if (x < -24 || x > VIEW.w + 24 || y < -24 || y > VIEW.h + 24) continue;
      if (b.state === 'perch') {
        if (b.z === 0) birdShadow(ctx, x, y);
        drawSpr(ctx, gallinazo('perch', (Math.floor((b.anim + i * 1.7) / 1.3) % 4) === 3 ? 1 : 0), x, y, false);
      } else {
        drawSpr(ctx, gallinazo('fly', Math.floor(b.anim * CF.gallFlapFps)), x, y, b.flip);
      }
    }
  }

  // v0.6: sprite según el daño. Vehículos: spr.dmg[estado-1]; basura y carretillas: spr.broken. Si el arte no llegó,
  // copia oscurecida/teñida (se hace una vez por sprite y estado, nunca por cuadro).
  function tinted(s, st, broken) {
    var key = broken ? '_phB' : '_ph' + st;
    if (s[key]) return s[key];
    var c = mk(s.width, s.height), g = c.getContext('2d');
    g.drawImage(s, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = broken ? 'rgba(40,30,20,.45)' : ['rgba(0,0,0,0)', 'rgba(30,22,18,.2)', 'rgba(30,22,18,.38)', 'rgba(18,14,12,.62)'][st];
    g.fillRect(0, 0, c.width, c.height);
    if (st >= 2 || broken) { g.fillStyle = 'rgba(10,8,8,.55)'; for (var i = 0; i < 6 * st + 4; i++) g.fillRect(hash(i, st) % c.width, (hash(st, i) % Math.max(1, c.height)), 2, 1); }
    c.ax = s.ax; c.ay = s.ay; c.fw = s.fw; c.fh = s.fh; c.tall = s.tall; c.placeholder = true;
    s[key] = c; return c;
  }
  function curSpr(pr) {
    var s = pr._spr, st = pr.dstate | 0, c = null;
    if (!st) return s;
    if (pr.broken) c = (s.broken && s.broken.width) ? s.broken : ((s.dark && s.dark.width) ? s.dark : tinted(s, 1, true));   // QA v0.6: postes apagados usan .dark
    else if (Array.isArray(s.dmg) && s.dmg[st - 1] && s.dmg[st - 1].width) c = s.dmg[st - 1];
    else c = tinted(s, Math.min(3, st), false);
    if (c.ax === undefined) { c.ax = s.ax; c.ay = s.ay; }
    return c;
  }

  // Sprite de un prop del mundo y su rectángulo en px de mundo (para siluetas y copas), cacheado en el prop.
  function propSpr(pr) {
    if (!pr._spr) {
      var s = prop(pr.k, pr.v, pr.dir, pr.fb);
      pr._spr = s; pr.rx0 = pr.x - s.ax; pr.ry0 = pr.y - s.ay - (pr.lift || 0); pr.rx1 = pr.rx0 + s.width; pr.ry1 = pr.ry0 + s.height;
    }
    return pr._spr;
  }
  // Máscara de píxeles opacos (alfa ≥ 128) de un sprite, calculada una vez (al hornear) y cacheada en el canvas.
  // Es lo que decide si un prop alto TAPA a un personaje: ya no se compara contra el rectángulo completo del sprite.
  function maskOf(s) {
    if (s._m) return s._m;
    var w = s.width, h = s.height, m = new Uint8Array(w * h), i;
    try { var d = readPixels(s); for (i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0; }
    catch (e) { for (i = 0; i < w * h; i++) m[i] = 1; }
    s._m = m; return m;
  }
  // Postes: solo el fuste (±3 px alrededor del ancla). Cables, crucetas y afiches colgados no cuentan como «tapar»: un personaje
  // al lado de un poste no debe marcarse como tapado por el rectángulo de 88 px de su sprite.
  function shaftMaskOf(s) {
    if (s._ms) return s._ms;
    var m = maskOf(s), w = s.width, h = s.height, out = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) for (var x = Math.max(0, s.ax - 3); x <= Math.min(w - 1, s.ax + 3); x++) out[y * w + x] = m[y * w + x];
    s._ms = out; return out;
  }
  // Puntos del cuerpo (relativos a los pies) que se prueban contra los píxeles opacos del prop.
  var BODY = [[0, -3], [0, -9], [0, -15], [0, -21], [-3, -11], [3, -11]];
  function behind(pr, x, y) { // ¿el prop alto tapa (con píxeles opacos) a la entidad con los pies en x,y? Hace falta que tape ≥ 2 puntos del cuerpo.
    if (!(y < pr.y + (pr.sortDy || 0))) return false;
    if (x < pr.rx0 - 4 || x > pr.rx1 + 4 || y - 26 > pr.ry1 || y < pr.ry0) return false;   // descarte rápido por el rectángulo
    var s = pr._spr, m = (pr.pole || s.poleKind) ? shaftMaskOf(s) : maskOf(s), w = s.width, h = s.height, n = 0;
    var bx = Math.round(x) - pr.rx0, by = Math.round(y) - pr.ry0;
    for (var i = 0; i < BODY.length; i++) {
      var sx = bx + BODY[i][0], sy = by + BODY[i][1];
      if (sx >= 0 && sy >= 0 && sx < w && sy < h && m[sy * w + sx] && ++n >= 2) return true;
    }
    return false;
  }

  /* ---------------- Capas de entidades ----------------
     entC: personajes y perros en orden de profundidad (los props que les pasan por delante los borran con destination-out); se
     redibuja después del mapa de luz con `entityLift` de opacidad (tinte propio: la luz ambiente no los oscurece igual que al piso).
     flaC: lo mismo solo para los zombies con destello de golpe; va al final, a opacidad 1, así el blanco es blanco puro y respeta
     la profundidad (un zombie detrás de un vehículo no se ve blanco delante). */
  var entC = null, entG = null, flaC = null, flaG = null;
  var npcC = null, npcG = null, npcFeet = [], volList = null;   // v0.14.1 (B): capa de drawables sueltos con cuerpo (NPC de otros módulos)
  function ensureNpc() { if (!npcC) { npcC = mkGpu(VIEW.w * KK, VIEW.h * KK); npcG = hdWrap(npcC.getContext('2d')); npcG.setTransform(KK, 0, 0, KK, 0, 0); npcG.imageSmoothingEnabled = false; } }   // v0.15: K×
  function ensureLayers() {
    if (entC) return;
    entC = mkGpu(VIEW.w * KK, VIEW.h * KK); entG = hdWrap(entC.getContext('2d')); entG.setTransform(KK, 0, 0, KK, 0, 0); entG.imageSmoothingEnabled = false;   // v0.15: K×
    flaC = mkGpu(VIEW.w * KK, VIEW.h * KK); flaG = hdWrap(flaC.getContext('2d')); flaG.setTransform(KK, 0, 0, KK, 0, 0); flaG.imageSmoothingEnabled = false;
  }
  function eraseProp(g, pr, cx, cy) {
    g.globalCompositeOperation = 'destination-out';
    if (pr.fade < 1) g.globalAlpha = pr.fade;
    drawSpr(g, curSpr(pr), pr.x - cx, pr.y - (pr.lift || 0) - cy, false);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function eraseHigh(g, cx, cy) {
    if (!high) return;
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(high, cx, cy, VIEW.w, VIEW.h, 0, 0, VIEW.w, VIEW.h);
    g.globalCompositeOperation = 'source-over';
  }

  // Alexander caído: el cuadro `dead` del artista si existe (alex.<variante>.dead, con ancla); si no, el cuadro de pie girado 90° sobre los pies.
  function fallenSprite(p) {
    var order = p.bird ? ['bird', 'nobird'] : ['nobird', 'bird'];
    for (var i = 0; i < order.length; i++) {
      var o = dig('alex.' + order[i] + '.dead'), c = isCanvas(o) ? o : frameOf(o, 0);
      if (c) return anchored(c);
    }
    return null;
  }
  function drawPlayerTo(g, p, G, cx, cy) {
    var x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
    if (p.hp <= 0) {
      var d = fallenSprite(p);
      if (d) { drawSpr(g, d, x, y, p.dir === 'left'); return; }
      var base = alex(p.bird ? 'bird' : 'nobird', 'idle', p.dir, 0), t = Math.min(1, (G.deadT || 0) / 0.18);
      g.save(); g.translate(x, y); g.rotate((p.dir === 'left' ? -1 : 1) * t * Math.PI / 2); g.drawImage(base, -base.ax, -base.ay); g.restore();
      return;
    }
    if (p.hurtT > 0 && Math.floor(p.hurtT * 20) % 2 === 0) g.globalAlpha = 0.45;
    var spr = playerSprite(p);
    if (p.jumpT >= 0 || p.z > 0) { spr = jumpSprite(p) || spr; y -= Math.round(p.z || 0); }   // v0.9: en el aire (la sombra se queda en el suelo)
    if (p.sickT > 0) spr = sickOf(spr);
    if (invisible(p)) drawInvisible(g, spr, x, y, G.clock || 0, g === mainCtx);
    else drawSpr(g, spr, x, y, false);
    g.globalAlpha = 1;
  }
  // v0.9: alex.<v>.jump[dir] = [agacharse, aire, caer]; sin el sprite, el cuadro idle levantado p.z px
  function jumpSprite(p) {
    var J = ACH.ent.JUMP || { dur: 0.55 }, t = Math.max(0, p.jumpT) / J.dur, set = p.bird ? 'bird' : 'nobird';
    var c = frameOf(dig('alex.' + set + '.jump.' + p.dir), t < 0.18 ? 0 : (t < 0.7 ? 1 : 2));
    return c ? anchored(c) : alex(set, 'idle', p.dir, 0);
  }
  var mainCtx = null;
  function drawZombieTo(g, z, ghost, cx, cy) {
    var zs = zombieSprite(z, ghost), zx = Math.round(z.x) - cx, zy = Math.round(z.y) - cy, ve = volE;
    if (!volE) volE = z;
    hdVar = KK > 1 ? zVar(z) : 0;   // v0.15: variante HD por zombi
    if (z.squash > 0 || ghost) drawSquash(g, zs, zx, zy, z.flip); // 1 px más bajo y 2 px más ancho
    else drawSpr(g, zs, zx, zy, z.flip);
    hdVar = 0;
    volE = ve;
  }
  function drawEnt(g, e, G, cx, cy) {
    volE = e;
    if (e.dog) drawDog(g, e.dog, cx, cy);
    else if (e.cat) ACH.inter.drawCat(g, e.cat, cx, cy);
    else if (e.player) drawPlayerTo(g, e.player, G, cx, cy);
    else drawZombieTo(g, e.z, e.ghost, cx, cy);
    volE = null;
  }
  function eraseEntity(g, e, G, cx, cy) {
    g.globalCompositeOperation = 'destination-out';
    drawEnt(g, e, G, cx, cy);
    g.globalCompositeOperation = 'source-over';
  }
  function isFlash(z, ghost) { return ghost || z.state === 'golpeado'; }

  var lastClock = 0;
  function render(ctx, G) {
    var W = ACH.world, cam = G.cam, cx = Math.round(cam.x) + (G.shakeX || 0), cy = Math.round(cam.y) + (G.shakeY || 0);
    var dt = Math.max(0, Math.min(0.1, G.clock - lastClock)); lastClock = G.clock;
    var FX7 = ACH.ent.CFG.fx;
    mainCtx = ctx;
    var hdT0 = performance.now();   // v0.15 (A): costo del render (ms/cuadro), para medir K=2 contra K=1
    syncWorldSize(ctx); HST.frameHits = 0; hdVar = 0; hwFrame(G);   // v0.15 (E): precalentado HD
    ctx.setTransform(KK, 0, 0, KK, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    volOn = VOL(); volE = null;
    if (volOn) ACH.volumen.frame(G);   // v0.14 (B): inclinación / squash de dibujo de Alexander
    if (ACH.noche && ACH.noche.update) { try { ACH.noche.update(G); } catch (eN) { if (!render.nocheErr) { render.nocheErr = 1; console.warn('[ACHORADO] noche.update', eN); } } }   // v0.8: la noche se maneja sola desde aquí (idempotente)
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101014'; ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    if (!ground) buildGround();
    if (!fog) buildFog();
    // 1. suelo horneado (tiles, calcomanías, lotes). La cámara puede salir del mapa por arriba (frente a la escalera): lo de afuera queda oscuro.
    var gy = Math.max(0, cy), gdy = gy - cy;
    if (VIEW.h - gdy > 0) ctx.drawImage(ground, cx, gy, VIEW.w, VIEW.h - gdy, 0, gdy, VIEW.w, VIEW.h - gdy);
    if (ACH.social && ACH.social.drawWindows) ACH.social.drawWindows(ctx, cx, cy, G.clock);   // F7: cantante y siluetas en ventanas
    if (ACH.fx && ACH.fx.drawAmbient) ACH.fx.drawAmbient(ctx, cx, cy, 'ground');   // ambiente a ras de suelo: ondas de charco, basura, moscas

    // 2. cadáveres (en el piso, debajo de todo)
    var i, z, list = [], flashAny = false;
    for (i = 0; i < G.zombies.length; i++) {
      z = G.zombies[i];
      if (z.state !== 'muerto') { list.push({ y: z.y, z: z }); if (z.state === 'golpeado') flashAny = true; continue; }
      // recién tumbado: un instante parado, blanco y aplastado (dura el hitstop) antes de caer
      if (z.deadT < FX7.killFlashT) { list.push({ y: z.y, z: z, ghost: true }); flashAny = true; continue; }
      ctx.globalAlpha = z.deadT > 9 ? Math.max(0, 10 - z.deadT) : 1;
      hdVar = KK > 1 ? zVar(z) : 0;
      drawSpr(ctx, (ACH.zvar && ACH.zvar.frame(z)) || zombie(skinType(z, 'dead'), 'dead', 0), Math.round(z.x) - cx, Math.round(z.y) - cy, z.flip);
      hdVar = 0; ctx.globalAlpha = 1;
    }
    drawGroundFog(ctx, cx, cy, G.clock, FX7.groundFog);   // niebla baja de callejón, pegada al piso
    // v0.6: vidrio de autos rotos y sombras de piedras (interaccion.js); botín en el suelo (inventario.js)
    if (ACH.inter && ACH.inter.drawGround) ACH.inter.drawGround(ctx, cx, cy);
    if (ACH.inv && ACH.inv.drawGround) { try { ACH.inv.drawGround(ctx, cx, cy); } catch (e2) { if (!render.invErr) { render.invErr = 1; console.warn('[ACHORADO] inv.drawGround', e2); } } }
    if (DH.ground.length) runHooks('ground', ctx, G, cx, cy);   // v0.9: fuego, charcos, sombras de aves
    // v0.8: objetos sueltos de armas.js (skate, bici, moto, carretilla). Con ysortItems() van en el orden por y; si no, drawLoose() sobre el suelo.
    var looseList = armasCall('ysortItems', G);
    if (!(looseList && looseList.length >= 0 && typeof looseList.length === 'number')) {
      looseList = null;
      if (ACH.armas && typeof ACH.armas.drawLoose === 'function') { try { ACH.armas.drawLoose(ctx, cx, cy, G); } catch (eL) { if (!render.looseErr) { render.looseErr = 1; console.warn('[ACHORADO] armas.drawLoose', eL); } } }
    }
    // 2b. sombras de contacto: v0.14.1 se dibujan más abajo, ya con la lista del orden por y (los drawables sueltos también proyectan)
    // 3. props y entidades ordenados por y
    var props = W.props, p = G.player, tallVis = [];
    for (i = 0; i < props.length; i++) {
      var pr = props[i];
      propSpr(pr);
      if (pr.rx1 < cx || pr.rx0 > cx + VIEW.w || pr.ry1 < cy || pr.ry0 > cy + VIEW.h) continue;
      list.push({ y: pr.y + (pr.sortDy || 0), prop: pr });
      if (pr.tall) tallVis.push(pr);
      if (pr.tree) { // copa sobre Alexander: baja a 0,55 en 0,15 s
        var want = behind(pr, p.x, p.y) ? 0.55 : 1, step = dt * (0.45 / 0.15);
        pr.fade = pr.fade < want ? Math.min(want, pr.fade + step) : Math.max(want, pr.fade - step);
      }
    }
    list.push({ y: p.y, player: p });
    if (looseList) for (i = 0; i < looseList.length; i++) { var li = looseList[i]; if (li && typeof li.y === 'number') list.push({ y: li.y + (li.sortDy || 0), loose: li }); }
    if (ACH.nivel && ACH.nivel.drawables) { var nvl = []; ACH.nivel.drawables(G, nvl); for (i = 0; i < nvl.length; i++) if (nvl[i] && typeof nvl[i].y === 'number') list.push({ y: nvl[i].y, loose: nvl[i] }); }   // Miraflores
    if (DH.ysort.length) ysortHooks(G, list);   // v0.9: carretillas, gallinas, zombies en llamas
    if (G.npcs) for (i = 0; i < G.npcs.dogs.length; i++) { var dg = G.npcs.dogs[i]; if (dg.x > cx - 24 && dg.x < cx + VIEW.w + 24 && dg.y > cy - 8 && dg.y < cy + VIEW.h + 24) list.push({ y: dg.y, dog: dg }); }
    if (G.cats && ACH.inter) for (i = 0; i < G.cats.length; i++) { var ct = G.cats[i]; if (ct.x > cx - 16 && ct.x < cx + VIEW.w + 16 && ct.y > cy - 8 && ct.y < cy + VIEW.h + 40) list.push({ y: ct.sortY !== undefined ? ct.sortY : ct.y, cat: ct }); }
    volList = volOn ? list : null; drawContacts(ctx, G, cx, cy); volList = null;   // 2b. sombras de contacto (en el piso, antes de props y entidades)
    list.sort(function (a, b) { return a.y - b.y; });

    var lift = FX7.entityLift > 0 && FX7.light > 0, flashSeen = false, npcSeen = false, npcVol = lift && volOn && ACH.volumen.looseOk;
    npcFeet.length = 0;
    if (lift || flashAny) { ensureLayers(); if (lift) entG.clearRect(0, 0, VIEW.w, VIEW.h); if (flashAny) flaG.clearRect(0, 0, VIEW.w, VIEW.h); }
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.prop) {
        if (e.prop.fade < 1) ctx.globalAlpha = e.prop.fade;
        drawSpr(ctx, curSpr(e.prop), e.prop.x - cx, e.prop.y - (e.prop.lift || 0) - cy, false);
        ctx.globalAlpha = 1;
        if (lift) eraseProp(entG, e.prop, cx, cy);
        if (flashSeen) eraseProp(flaG, e.prop, cx, cy);
        if (npcSeen) eraseProp(npcG, e.prop, cx, cy);   // v0.14.1
        continue;
      }
      if (e.loose) {   // objeto suelto: se dibuja como un prop (tapa a quien esté detrás en las capas de tinte y destello)
        drawLooseItem(ctx, e.loose, cx, cy, G);
        if (lift) { entG.globalCompositeOperation = 'destination-out'; drawLooseItem(entG, e.loose, cx, cy, G); entG.globalCompositeOperation = 'source-over'; }
        if (flashSeen) { flaG.globalCompositeOperation = 'destination-out'; drawLooseItem(flaG, e.loose, cx, cy, G); flaG.globalCompositeOperation = 'source-over'; }
        // v0.14.1 (B): los drawables sueltos «con cuerpo» van a su capa (npcC) para el rim/borde/pies de volumen.rimPass; los demás la tapan
        if (npcVol && ACH.volumen.looseOk(e.loose)) {
          if (!npcSeen) { ensureNpc(); npcG.clearRect(0, 0, VIEW.w, VIEW.h); npcSeen = true; }
          drawLooseItem(npcG, e.loose, cx, cy, G); npcG.globalAlpha = 1; npcG.globalCompositeOperation = 'source-over';
          npcFeet.push(Math.round(e.loose.x) - cx, Math.round(e.loose.y) - cy);
        } else if (npcSeen) { npcG.globalCompositeOperation = 'destination-out'; drawLooseItem(npcG, e.loose, cx, cy, G); npcG.globalAlpha = 1; npcG.globalCompositeOperation = 'source-over'; }
        continue;
      }
      drawEnt(ctx, e, G, cx, cy);
      if (lift) { if (e.z && e.z.social) entG.globalAlpha = 0.45; drawEnt(entG, e, G, cx, cy); entG.globalAlpha = 1; }   // la orquesta (ya bajo el foco de la tarima) entra a media fuerza: sin el tinte y el brillo extra no se quema a blanco
      // el personaje entra a la capa de tinte (encima de lo que ya hay: orden de profundidad)
      if (e.z && isFlash(e.z, e.ghost)) { drawZombieTo(flaG, e.z, e.ghost, cx, cy); flashSeen = true; }
      else if (flashSeen) eraseEntity(flaG, e, G, cx, cy);   // lo que está delante de un zombie con destello también lo tapa
      if (npcSeen) eraseEntity(npcG, e, G, cx, cy);   // v0.14.1: y lo que está delante de un NPC
    }
    if (lift) eraseHigh(entG, cx, cy);
    if (npcSeen) eraseHigh(npcG, cx, cy);
    if (lift && volOn) ACH.volumen.rimPass(ctx, entC, G, cx, cy, npcSeen ? npcC : null, npcFeet);   // v0.14 (B): rim, borde y pies sobre la capa de personajes (ya recortada)
    if (flashSeen) eraseHigh(flaG, cx, cy);

    // 4. siluetas (alfa 0,30) de entidades tapadas por props altos (píxeles opacos, no el rectángulo del sprite)
    if (tallVis.length) {
      ctx.globalAlpha = 0.30;
      var pSil = false;
      for (var t = 0; t < tallVis.length; t++) {
        var tp = tallVis[t];
        if (!pSil && p.hp > 0 && !invisible(p) && behind(tp, p.x, p.y)) { pSil = true; drawSpr(ctx, silhouetteOf(p.z > 0 ? jumpSprite(p) : playerSprite(p)), Math.round(p.x) - cx, Math.round(p.y - (p.z || 0)) - cy, false); }
      }
      for (i = 0; i < G.zombies.length; i++) {
        z = G.zombies[i];
        if (z.state === 'muerto') continue;
        for (t = 0; t < tallVis.length; t++) {
          if (!behind(tallVis[t], z.x, z.y)) continue;
          // el cuadro `hurt` ya es blanco; mismo cuadro de pose que el sprite normal (quieto = cuadro 0)
          var socs = z.soc && ACH.social ? ACH.social.sprite(z, true) : null;   // orquesta: su propia silueta, no la de un caminante
          hdVar = KK > 1 ? zVar(z) : 0;   // v0.15: la silueta (derivada) de su variante HD
          var zvf = ACH.zvar && ACH.zvar.frame(z);   // variante zvar: su mismo cuadro en blanco (cacheado por lienzo)
          drawSpr(ctx, socs ? socs : zvf ? silhouetteOf(anchored(zvf)) : zombie(skinType(z, 'hurt'), 'hurt', z.moving ? Math.floor(z.animT * ACH.ent.ZT[z.type].anim) : 0), Math.round(z.x) - cx, Math.round(z.y) - cy, z.flip);
          hdVar = 0; break;
        }
      }
      ctx.globalAlpha = 1;
    }

    // 5. capa alta horneada: over de lotes (toldos, letreros bandera) y cables
    if (high) ctx.drawImage(high, cx, cy, VIEW.w, VIEW.h, 0, 0, VIEW.w, VIEW.h);
    if (volOn && ACH.volumen.clouds) ACH.volumen.clouds(ctx, G, cx, cy);   // v0.14.1 (B): sombras de nubes de día
    if (ACH.fx && ACH.fx.drawAmbient) ACH.fx.drawAmbient(ctx, cx, cy, 'air');   // ambiente en el aire: cables que se mecen, ropa, goteo
    // 6. gallinazos, Titina volando y el humo de los anticuchos
    if (G.npcs) drawBirds(ctx, G, cx, cy);
    if (G.titina.state !== 'hombro') {
      var ti = G.titina;
      var tInv = invisible(p);   // v0.8: con la Cola Inglesa Titina también se vuelve casi transparente
      if (!tInv) birdShadow(ctx, Math.round(ti.x) - cx, Math.round(ti.y) - cy);
      if (tInv) ctx.globalAlpha = 0.25 + 0.1 * Math.abs(Math.sin(G.clock * 9));
      drawSpr(ctx, titina(Math.floor(ti.anim * 10)), Math.round(ti.x) - cx, Math.round(ti.y - ti.z) - cy, ti.state === 'volando' ? Math.sin(ti.ang) > 0 : (p.x < ti.x));
      ctx.globalAlpha = 1;
    }
    if (DH.air.length) runHooks('air', ctx, G, cx, cy);   // v0.9: gallinazos en vuelo, molotov en el aire
    ACH.fx.drawSmoke(ctx, cx, cy);
    if (ACH.nivel && ACH.nivel.drawTop) ACH.nivel.drawTop(ctx, G, cx, cy);   // Miraflores: abejas, burbujas, avisos

    // 7. atmósfera y luz: niebla baja, neblina móvil, niebla por profundidad, garúa → mapa de luz → emisivos → tinte de personajes → viñeta
    drawGroundFog(ctx, cx, cy, G.clock, FX7.groundFogOver);
    drawFog(ctx, cam, G.clock);
    drawScreenMask(ctx, 'd', FX7.depthFog);
    drawDrizzle(ctx, G.clock);
    drawLightMap(ctx, G, cx, cy);
    drawEmissive(ctx, G, cx, cy);
    if (lift) {
      ctx.globalAlpha = Math.min(1, FX7.entityLift); ctx.drawImage(entC, 0, 0, VIEW.w, VIEW.h);
      if (FX7.entityGlow > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, FX7.entityGlow); ctx.drawImage(entC, 0, 0, VIEW.w, VIEW.h); ctx.globalCompositeOperation = 'source-over'; }   // exposición extra: los claros del personaje (cara, camisa) se separan del piso
      ctx.globalAlpha = 1;
    }
    if (volOn && ACH.volumen.ambient) ACH.volumen.ambient(ctx, G, cx, cy);   // v0.14.1 (B): motas, garúa en los faroles, brisa, destello de golpe
    drawScreenMask(ctx, 'v', (FX7.vignette + 0.3 * nightT()) * (volOn ? ACH.volumen.vignetteMul() : 1));   // v0.14 (B): con la lente WebGL, la viñeta CPU baja   // v0.8: de noche la viñeta cierra un poco más
    // el destello blanco del golpe: capa propia, sin multiplicar y recortada por lo que tapa (profundidad correcta)
    if (flashSeen) ctx.drawImage(flaC, 0, 0, VIEW.w, VIEW.h);
    // v0.8: porciones que le quedan a las carretillas de comida (pips sobre la carretilla cercana; después de la luz, para leerse de noche)
    if (ACH.inv && ACH.inv.drawCarts) { try { ACH.inv.drawCarts(ctx, cx, cy, G); } catch (eC) { if (!render.cartErr) { render.cartErr = 1; console.warn('[ACHORADO] inv.drawCarts', eC); } } }
    // 8. efectos de golpe y marcadores (después de la luz: se leen igual que antes)
    ACH.fx.draw(ctx, G, cx, cy);
    if (ACH.inter) { ACH.inter.drawFx(ctx, G, cx, cy); ACH.inter.drawAim(ctx, G, cx, cy); }
    if (DH.screen.length) runHooks('screen', ctx, G, cx, cy);   // v0.9: avisos en pantalla (la flecha de la carretilla)
    if (G.qT > 0) drawQ(ctx, G, cx, cy);
    if (G.debugOn) drawDebug(ctx, G, cx, cy);
    if (volOn) ACH.volumen.endFrame();
    var hdMs = performance.now() - hdT0;
    HST.ms = hdMs; HST.n++; HST.msAvg = HST.msAvg ? HST.msAvg * 0.95 + hdMs * 0.05 : hdMs; HST.hits = HST.frameHits;
  }
  // v0.8: un objeto suelto de ACH.armas.ysortItems(): {x, y, z?, draw(g, cx, cy)?, spr?, flip?}; si no trae cómo dibujarse, ACH.armas.drawItem(g, it, cx, cy).
  function drawLooseItem(g, it, cx, cy, G) {
    try {
      if (typeof it.draw === 'function') { it.draw(g, cx, cy, G); return; }
      var spr = isCanvas(it.spr) ? it.spr : isCanvas(it.canvas) ? it.canvas : null;
      if (spr) { anchored(spr); if (it.rot) { g.save(); g.translate(Math.round(it.x) - cx, Math.round(it.y - (it.z || 0)) - cy); g.rotate(it.rot); g.drawImage(spr, -spr.ax, -spr.ay); g.restore(); } else drawSpr(g, spr, Math.round(it.x) - cx, Math.round(it.y - (it.z || 0)) - cy, !!it.flip); return; }
      if (ACH.armas && typeof ACH.armas.drawItem === 'function') ACH.armas.drawItem(g, it, cx, cy);
    } catch (e) { if (!render.looseErr) { render.looseErr = 1; console.warn('[ACHORADO] objeto suelto', e); } }
  }
  function zombieSprite(z, ghost) {
    var anim = z.state === 'golpeado' || ghost ? 'hurt' : 'walk';
    if (z.soc && ACH.social) { var ss = ACH.social.sprite(z, ghost); if (ss) return ss; }   // F7: músicos y bailarines
    var f =z.moving || anim === 'hurt' ? Math.floor(z.animT * ACH.ent.ZT[z.type].anim) : 0;
    return (ACH.zvar && ACH.zvar.frame(z)) || zombie(skinType(z, anim), anim, f);
  }
  // v0.6: el escolar con resortera usa zombie.escolarSling cuando existe
  function skinType(z, anim) { return z.sling && dig('zombie.escolarSling.' + anim) ? 'escolarSling' : z.type; }

  /* ---------------- Vista de paloma (Q) ---------------- */
  function arrow(ctx, x, y, ang, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = '#131015';
    ctx.beginPath(); ctx.moveTo(s + 2, 0); ctx.lineTo(-s, -s - 1); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s, s + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s + 1, -s + 1); ctx.lineTo(-s * 0.4 + 1, 0); ctx.lineTo(-s + 1, s - 1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Centro de las flechas: la flecha mide ~7 px de radio, así que el margen visible es 6 px (lados/arriba) y 22 px (abajo, por #hint).
  var QX = 13, QB = 29;
  function drawQ(ctx, G, cx, cy) {
    var p = G.player, R = ACH.ent.CFG.qRange, bob = Math.round(Math.sin(G.clock * 8) * 2);
    // la caja del HUD (arriba a la izquierda) tapa flechas: se mide una vez por cuadro de Q y las flechas se corren fuera de ella
    var hr = ACH.hud && ACH.hud.rect ? ACH.hud.rect(VIEW.w) : { x1: 0, y1: 0 }, hx = hr.x1 + 7, hy = hr.y1 + 7;
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state === 'muerto') continue;
      var dx = z.x - p.x, dy = z.y - p.y;
      if (dx * dx + dy * dy > R * R) continue;
      var sx = Math.round(z.x) - cx, sy = Math.round(z.y) - cy - 30;
      if (sx >= QX && sx <= VIEW.w - QX && sy >= QX && sy <= VIEW.h - QB) {
        // sobre la cabeza del zombie; si cae bajo el HUD, baja a su borde inferior (sigue apuntando hacia abajo)
        arrow(ctx, sx, (sx < hx && sy < hy ? hy : sy) + bob, Math.PI / 2, 5);
      } else {
        // en el borde de pantalla, apuntando hacia el zombie
        var pcx = Math.round(p.x) - cx, pcy = Math.round(p.y) - cy - 8;
        var vx = sx - pcx, vy = (sy + 22) - pcy, ang = Math.atan2(vy, vx);
        var tx = vx !== 0 ? ((vx > 0 ? VIEW.w - QX - pcx : QX - pcx) / vx) : Infinity,
          ty = vy !== 0 ? ((vy > 0 ? VIEW.h - QB - pcy : QX - pcy) / vy) : Infinity, k = Math.min(tx, ty);
        var ax = Math.round(pcx + vx * k), ay = Math.round(pcy + vy * k);
        if (ax < hx && ay < hy) { if (ax <= QX + 1) ay = hy; else ax = hx; }   // pegada al borde izquierdo: baja del HUD; pegada al superior: pasa a su derecha
        arrow(ctx, ax, ay, ang, 5);
      }
    }
  }

  /* ---------------- F3 ---------------- */
  function drawDebug(ctx, G, cx, cy) {
    var W = ACH.world, CFG = ACH.ent.CFG, i;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,229,0,.9)';
    // tiles sólidos: lotes y cerro (L, rojo), barricadas (X, naranja)
    var c0 = Math.max(0, Math.floor(cx / W.T)), c1 = Math.min(W.COLS - 1, Math.floor((cx + VIEW.w) / W.T)), r0 = Math.max(0, Math.floor(cy / W.T)), r1 = Math.min(W.ROWS - 1, Math.floor((cy + VIEW.h) / W.T));
    for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
      var tch = W.grid[rr][cc];
      if (W.groundTile && tch !== 'L' && W.isSolidTile(cc, rr)) { ctx.fillStyle = 'rgba(160,90,255,.22)'; ctx.fillRect(cc * W.T - cx, rr * W.T - cy, W.T, W.T); continue; }   // v0.9: muros y roca
      if (tch !== 'L' && tch !== 'X') continue;
      ctx.fillStyle = tch === 'X' ? 'rgba(255,140,0,.38)' : 'rgba(255,40,70,.14)';
      ctx.fillRect(cc * W.T - cx, rr * W.T - cy, W.T, W.T);
      if (tch === 'X' || !W.isSolidTile(cc, rr + 1) || !W.isSolidTile(cc + 1, rr)) {   // contorno solo en el borde del bloque
        ctx.strokeStyle = tch === 'X' ? 'rgba(255,140,0,.8)' : 'rgba(255,40,70,.5)';
        ctx.strokeRect(cc * W.T - cx + 0.5, rr * W.T - cy + 0.5, W.T - 1, W.T - 1);
      }
    }
    ctx.strokeStyle = 'rgba(160,90,255,.9)';
    (W.extraSolid || []).forEach(function (e) { ctx.strokeRect(Math.round(e.x0) - cx + 0.5, Math.round(e.y0) - cy + 0.5, Math.round(e.x1 - e.x0) - 1, Math.round(e.y1 - e.y0) - 1); });
    (W.lanes || []).forEach(function (L) { ctx.strokeStyle = 'rgba(255,210,30,.7)'; ctx.beginPath(); L.pts.forEach(function (q, k) { if (k) ctx.lineTo(q.x - cx + 0.5, q.y - cy + 0.5); else ctx.moveTo(q.x - cx + 0.5, q.y - cy + 0.5); }); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,229,0,.9)';
    for (i = 0; i < W.props.length; i++) {
      var pr = W.props[i];
      if (!(pr.fw > 0)) continue;
      ctx.strokeRect(Math.round(pr.x0) - cx + 0.5, Math.round(pr.y0) - cy + 0.5, Math.round(pr.fw) - 1, Math.round(pr.fh) - 1);
    }
    function circ(x, y, r, col) { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(Math.round(x) - cx + 0.5, Math.round(y) - cy + 0.5, r, 0, Math.PI * 2); ctx.stroke(); }
    var p = G.player;
    circ(p.x, p.y, CFG.radius, '#1fe07a');
    if (p.atkT >= 0) {
      var v = ACH.ent.DIRV[p.dir], f = Math.atan2(v[1], v[0]);
      ctx.strokeStyle = p.atkHit ? 'rgba(255,46,136,.9)' : 'rgba(255,46,136,.4)';
      ctx.beginPath(); ctx.moveTo(Math.round(p.x) - cx, Math.round(p.y) - cy);
      ctx.arc(Math.round(p.x) - cx, Math.round(p.y) - cy, CFG.atkRange, f - CFG.atkArc / 2, f + CFG.atkArc / 2); ctx.closePath(); ctx.stroke();
    }
    for (i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state === 'muerto') continue;
      circ(z.x, z.y, CFG.zRadius, z.state === 'perseguir' || z.state === 'atacar' ? '#ff2e88' : z.state === 'investigar' ? '#ffe500' : '#9ad');
      var sr = ACH.ent.ZT[z.type].sight * ((z.state === 'perseguir' || z.state === 'atacar') ? 1.8 : 1);
      circ(z.x, z.y, sr, 'rgba(150,170,220,.18)');
      if (z.state === 'investigar') { ctx.fillStyle = '#ffe500'; ctx.fillRect(Math.round(z.tx) - cx - 1, Math.round(z.ty) - cy - 1, 3, 3); }
    }
    for (i = 0; i < G.noises.length; i++) {
      var n = G.noises[i];
      circ(n.x, n.y, n.r, 'rgba(31,224,122,' + (0.8 * (1 - n.t / 0.6)).toFixed(2) + ')');
    }
    if (ACH.inter && ACH.inter.drawDebug) ACH.inter.drawDebug(ctx, G, cx, cy);   // v0.6: traza real vs prevista de la piedra, vida de props
  }

  // Tamaño lógico de la vista: game.js lo adapta a la proporción de la ventana (fit). VIEW se muta en su lugar (todos guardan la referencia);
  // los búferes de pantalla completa (luz, viñeta, niebla por profundidad, capas de personajes y destellos) se rehacen solo si cambia.
  function resize(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    if (w === VIEW.w && h === VIEW.h) return false;
    VIEW.w = w; VIEW.h = h;
    resetBuffers();
    return true;
  }
  function resetBuffers() {
    // v0.15 (E, F2): los búferes viejos se sueltan ya (width=height=0 y fuera del registro de lienzo.js), no al pasar el GC
    var rel = ACH.lienzo && ACH.lienzo.release;
    if (rel) { rel(lm); rel(vign); rel(dfog); rel(entC); rel(flaC); rel(npcC); }
    lm = lmg = null; vign = dfog = null; entC = entG = flaC = flaG = null; npcC = npcG = null;
  }
  // Contexto perdido y devuelto (lienzo.js): búferes de pantalla nuevos y el suelo horneado de nuevo; los cachés derivados de sprites
  // (placeholders, props elegidos) se vacían por si los sprites se volvieron a hornear.
  if (ACH.lienzo) ACH.lienzo.onRebake(function () {
    resetBuffers(); zhalo = null; GEN++; hwNew(); HW.idx = null; hwPlan('rebake');   // v0.15 (E): re-precalentar // v0.15: los derivados HD (__hdD) quedan viejos y se rehacen
    if (ACH.hd && typeof ACH.hd.flush === 'function') { try { ACH.hd.flush('rebake'); } catch (eF) { console.warn('[ACHORADO] hd.flush', eF); } }
    phCache = {}; propCache = {};
    buildGround();
  });
  ACH.render = { VIEW: VIEW, resize: resize, render: render, buildGround: buildGround, DIRS: DIRS, rot90: rot90,
    // v0.15 (A): motor en K× (ver arriba). K() = píxeles de #world por píxel lógico ahora; wrap(g) envuelve drawImage de otro contexto del mundo
    K: function () { return KK; }, wantK: wantK, hdWrap: hdWrap, hdDerive: hdDerive,
    hd: { on: hdOn, set: hdSet, user: function () { return hdUser; }, forced: function () { return hdForced; }, available: function () { return !!hdApi(); },
      canDrop: hdCanDrop, autoDrop: hdAutoDrop, canRaise: hdCanRaise, autoRaise: hdAutoRaise, gen: function () { return GEN; },
      stats: function () { return { K: KK, want: wantK(), api: !!hdApi(), user: hdUser, forced: hdForced, autoOff: hdAutoOff, drops: hdDrops.slice(), gen: GEN,
        renderMs: +HST.ms.toFixed(2), renderMsAvg: +HST.msAvg.toFixed(2), hdDraws: HST.hits, frames: HST.n }; } },
    hdWarm: { stats: function () { return { queued: HW.q.length - HW.qi, warmed: HW.warmed, warmMs: +HW.warmMs.toFixed(1), deferred: HW.deferred, plans: HW.plans, slices: HW.slices, index: HW.idx ? Object.keys(HW.idx).length : 0, has: !!(ACH.hd && ACH.hd.has), warmApi: !!(ACH.hd && ACH.hd.warm) }; }, plan: hwPlan, P: HW },   // v0.15 (E, F4)
    bakeMs: function () { return bakeMs; }, rebake: function () { buildGround(); }, addLight: addLight, drawHooks: DH, lights: function () { return { lights: LIGHTS.length, emit: EMIT.length }; }, audioLamps: audioLamps, layers: function () { return { ground: ground, high: high }; },
    // v0.14 (B): internos de solo lectura para js/engine/volumen.js
    vol: { VIEW: VIEW, playerSprite: playerSprite, jumpSprite: jumpSprite, zombieSprite: zombieSprite, dogSprite: dogSprite, invisible: invisible,
      lights: function () { return LIGHTS; }, drawLoose: drawLooseItem } };
})();
