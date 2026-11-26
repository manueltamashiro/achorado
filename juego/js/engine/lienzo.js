/* ACHORADO — js/engine/lienzo.js: menos lienzos en GPU + recuperación cuando el navegador bota los contextos 2D.
 * Se carga ANTES que cualquier script que cree canvas (antes de js/sprites/base.js).
 *
 * Causa de la pantalla negra: Chrome aguanta un número limitado de lienzos 2D acelerados por GPU vivos a la vez (aquí, entre 2000
 * y 2500; en un teléfono, menos). Al hornear se creaban ~3500 canvas de sprites, todos en GPU: al pasar el tope se resetea la GPU
 * y se pierden TODOS los contextos 2D de la página (sprites, #world, íconos del HUD), también los que estaban en memoria. Una página
 * mínima con 2500 canvas de 24x32 hace lo mismo; con willReadFrequently (lienzo en memoria, fuera de la GPU) aguanta 3500.
 *
 * 1) Prevención: todo lienzo 2D se crea en memoria (willReadFrequently: true) salvo #world y los búferes por cuadro que se marcan con
 *    ACH.lienzo.gpu(c). Quedan ~4 contextos en GPU en vez de ~3500.
 * 2) Recuperación (el teléfono igual puede botar la GPU al ir a segundo plano o por falta de memoria, y entonces los lienzos en
 *    memoria también vuelven en blanco):
 *    - cada lienzo 2D se registra; un barrido en ratos libres guarda una copia (ImageData) de los que ya están horneados
 *      (más de 1 s de vida). Los que se marcan con noSnap(c) no se copian (el suelo: lo rehace render.js).
 *    - contextlost en #world o en cualquier lienzo → el bucle se pausa (paused() = true) con el aviso «recargando…».
 *    - al volver (contextrestored, o el sondeo de isContextLost() cada cuadro) se devuelven las copias a los lienzos que se perdieron,
 *      se corren los pasos de onRebake (render.js: búferes de pantalla, suelo, lotes) y se sigue.
 *    - si #world no vuelve en LOST_GIVEUP_MS, se cambia por un canvas nuevo (bindWorld avisa a game.js).
 *    - al volver a la pestaña (visibilitychange / pageshow) se revisa todo.
 *
 * API: gpu(c), noSnap(c), bindWorld(c, fn), paused(), onRebake(fn), rebake(motivo), verify(), simulate('restored'|'never'|'blank'),
 *      stats(). Debug: ?lienzo=gpu desactiva la prevención (como antes: todo en GPU), para comparar.
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var L = ACH.lienzo = ACH.lienzo || {};
  var OFF = /[?&]lienzo=gpu\b/.test(location.search || '');
  var proto = window.HTMLCanvasElement && HTMLCanvasElement.prototype, origGet = proto && proto.getContext;
  var HAS_WR = typeof WeakRef === 'function';
  function ref(o) { return HAS_WR ? new WeakRef(o) : { deref: function () { return o; } }; }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  var GP = [];                  // v0.12: #world y búferes en GPU (referencias débiles), solo para medir
  var TR = [];                  // todos los lienzos 2D (referencias débiles): { r, t (creado), snap }
  var nCpu = 0, nGpu = 0;
  var world = null, onWorld = null, lostSince = 0, dirty = false, busy = false, rebakes = 0, replaced = 0, restoredN = 0, log = [];
  var hooks = [];
  var LOST_GIVEUP_MS = 1500;    // si #world no vuelve en este tiempo, se cambia el elemento
  var SIM = 0;                  // QA: cuadros simulados «perdido y nunca vuelve»
  function note(what) { log.push([what, Math.round(now())]); if (log.length > 40) log.shift(); }
  function isLost(g) { return !!(g && g.isContextLost && g.isContextLost()); }

  function onLost(e) {
    var c = e && e.target;
    if (c && c !== world && c.__lzTrack) c.__lzPending = true;    // al volver, devolverle su copia
    if (!dirty) note('lost:' + ((c && c.id) || (c && c.__lzGpu ? 'buf' : 'spr')));
    dirty = true; if (!lostSince) lostSince = now(); toast(true);
  }
  function onRestored(e) {
    var c = e && e.target;
    if (c === world) note('restored:world');
    if (c && c.__lzPending && !busy) putSnap(c);
    dirty = true;
  }
  function listen(c) {
    if (!c || c.__lzListen) return;
    c.__lzListen = true;
    // sin preventDefault: en 2D eso le diría al navegador que NO lo restaure
    c.addEventListener('contextlost', onLost);
    c.addEventListener('contextrestored', onRestored);
  }

  if (origGet && !proto.getContext.__lienzo) {
    var patched = function (type, opts) {
      if (type === '2d' && !OFF && !this.__lzGpu && this.id !== 'world' && !(opts && 'willReadFrequently' in opts)) {
        var o = { willReadFrequently: true };
        if (opts) for (var k in opts) o[k] = opts[k];
        opts = o;
      }
      var g = origGet.call(this, type, opts);
      if (g && type === '2d' && !this.__lzSeen) {
        this.__lzSeen = true;
        var cpu = !!(opts && opts.willReadFrequently);
        if (cpu) nCpu++; else nGpu++;
        listen(this);
        if (!this.__lzGpu && this.id !== 'world') { this.__lzTrack = true; TR.push({ r: ref(this), t: now() }); }
        else GP.push(ref(this));   // v0.12: también se cuentan (memoria de lienzos, stats().mb)
      }
      return g;
    };
    patched.__lienzo = true;
    proto.getContext = patched;
  }

  L.gpu = function (c) { if (c) c.__lzGpu = true; return c; };
  // v0.15 (E): suelta un lienzo que ya no se usa (búferes de pantalla al cambiar K o la vista): width=height=0 libera la memoria
  // (GPU o CPU) en el acto, sin esperar al GC, y se saca de los registros y de los contadores de stats().
  L.release = function (c) {
    if (!c || c.__lzFreed) return;
    c.__lzFreed = true;
    var i;
    for (i = GP.length - 1; i >= 0; i--) if (GP[i].deref() === c) GP.splice(i, 1);
    for (i = TR.length - 1; i >= 0; i--) if (TR[i].r.deref() === c) { if (c.__lzSnap) snapBytes -= c.__lzSnap.data.length; TR.splice(i, 1); }
    c.__lzSnap = null;
    if (c.__lzSeen) { if (c.__lzGpu || c.id === 'world') nGpu = Math.max(0, nGpu - 1); else nCpu = Math.max(0, nCpu - 1); }
    try { c.width = 0; c.height = 0; } catch (e) { /* nada */ }
  };
  L.noSnap = function (c) { if (c) { c.__lzNoSnap = true; c.__lzSnap = null; } return c; };
  L.watch = listen;

  /* ---------------- copias (snapshots) ---------------- */
  var snapBytes = 0, sweepAt = 0, sweepI = 0, sweeping = false;
  function snapOf(c) {
    if (c.__lzNoSnap || c.__lzSnap || !c.width || !c.height) return;
    var g = c.getContext('2d');
    if (isLost(g)) return;
    try { c.__lzSnap = g.getImageData(0, 0, c.width, c.height); snapBytes += c.width * c.height * 4; } catch (e) { c.__lzNoSnap = true; }
  }
  function putSnap(c) {
    c.__lzPending = false;
    var s = c.__lzSnap; if (!s) return;
    var g = c.getContext('2d');
    if (isLost(g)) { c.__lzPending = true; return; }
    if (s.width === c.width && s.height === c.height) { g.putImageData(s, 0, 0); restoredN++; }
  }
  // Barrido en ratos: copia los lienzos con más de 1 s de vida que aún no tienen copia; suelta los que el GC ya se llevó.
  function sweep() {
    if (sweeping || busy || dirty) return;
    sweeping = true; sweepI = TR.length - 1;
    (function slice() {
      var t0 = now(), tNow = t0;
      while (sweepI >= 0 && now() - t0 < 6) {
        var it = TR[sweepI], c = it.r.deref();
        if (!c) { TR.splice(sweepI, 1); if (c === undefined && it.snapBytes) snapBytes -= it.snapBytes; }
        else if (c.isConnected && !c.__lzNoSnap) { if (c.__lzSnap) snapBytes -= c.__lzSnap.data.length; c.__lzSnap = null; snapOf(c); }   // íconos del HUD: copia fresca
        else if (!it.done && tNow - it.t > 1000) { snapOf(c); it.done = true; if (c.__lzSnap) it.snapBytes = c.width * c.height * 4; }
        sweepI--;
      }
      if (sweepI >= 0 && !dirty) setTimeout(slice, 30); else { sweeping = false; sweepAt = now(); }
    })();
  }
  setInterval(function () { if (!document.hidden) sweep(); }, 2000);

  /* ---------------- aviso «recargando…» ---------------- */
  var toastEl = null, toastHide = 0;
  function toast(on) {
    if (on) {
      if (!toastEl && document.body) {
        toastEl = document.createElement('div');
        toastEl.textContent = 'recargando…';
        toastEl.setAttribute('aria-live', 'polite');
        toastEl.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:99999;padding:3px 9px;' +
          'font:12px/1.3 monospace;color:#f3efe2;background:rgba(20,18,22,.82);border:1px solid #5c5866;border-radius:3px;pointer-events:none';
        document.body.appendChild(toastEl);
      }
      if (toastEl) toastEl.style.display = '';
      clearTimeout(toastHide);
    } else if (toastEl) {
      clearTimeout(toastHide);
      toastHide = setTimeout(function () { if (toastEl) toastEl.style.display = 'none'; }, 500);
    }
  }
  L.toast = toast;

  /* ---------------- #world y bucle ---------------- */
  L.bindWorld = function (c, fn) { world = c; onWorld = fn; listen(c); };
  L.onRebake = function (fn) { hooks.push(fn); };

  // Cambia #world por un canvas nuevo (mismo id, clases, estilo y tamaño): para cuando el contexto no vuelve nunca.
  function replaceWorld() {
    if (!world || !world.parentNode) return;
    var n = document.createElement('canvas');
    for (var i = 0; i < world.attributes.length; i++) { var a = world.attributes[i]; if (a.name !== 'width' && a.name !== 'height') n.setAttribute(a.name, a.value); }
    n.width = world.width; n.height = world.height;
    world.parentNode.replaceChild(n, world);
    world = n; listen(n); replaced++; note('replaced');
    if (onWorld) onWorld(n);
  }

  // ¿Queda algún lienzo perdido? (de paso, devuelve la copia a los que ya volvieron)
  function stillLost() {
    var n = 0;
    for (var i = TR.length - 1; i >= 0; i--) {
      var c = TR[i].r.deref();
      if (!c) continue;
      if (isLost(c.getContext('2d'))) { c.__lzPending = true; n++; }
      else if (c.__lzPending) putSnap(c);
    }
    return n;
  }
  function runHooks() {
    for (var i = 0; i < hooks.length; i++) {
      try { hooks[i](); } catch (e) { console.warn('[ACHORADO] lienzo: rehorneado', e); }
    }
  }
  // Rehornea: aviso, un cuadro para que se pinte, y recién ahí el trabajo.
  L.rebake = function (why) {
    if (busy) return;
    busy = true; dirty = false; rebakes++; note('rebake:' + (why || ''));
    toast(true);
    var go = function () {
      stillLost();
      runHooks();
      busy = false; lostSince = 0; toast(false);
    };
    if (window.requestAnimationFrame && !document.hidden) requestAnimationFrame(function () { setTimeout(go, 0); }); else setTimeout(go, 0);
  };

  // El bucle de game.js pregunta cada cuadro. true = este cuadro no se dibuja (contexto perdido o rehorneando).
  L.paused = function () {
    if (busy) return true;
    var wl = (world && isLost(world.getContext('2d'))) || SIM > 0;
    if (SIM > 0) SIM--;
    if (!wl && !dirty) return false;
    if (!lostSince) { lostSince = now(); toast(true); }
    var waited = now() - lostSince;
    if (wl) {
      if (!dirty) note('lost:poll');
      dirty = true;
      if (waited > LOST_GIVEUP_MS) { SIM = 0; replaceWorld(); L.rebake('replaced'); }
      return true;
    }
    // #world ya volvió: se espera a que vuelvan los demás (o a que se acabe la paciencia) y se rehornea
    if (stillLost() && waited < LOST_GIVEUP_MS) return true;
    L.rebake('restored');
    return true;
  };

  // Al volver a la pestaña (o del bfcache): revisa todo y rehornea si hace falta.
  L.verify = function (why) {
    var bad = (world && isLost(world.getContext('2d'))) || stillLost() > 0;
    note('verify:' + (why || '') + (bad ? ':bad' : ':ok'));
    if (bad) { dirty = true; if (!lostSince) lostSince = now(); toast(true); }
    return !bad;
  };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) L.verify('visible'); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) L.verify('pageshow'); });

  // QA: 'restored' = perdido y devuelto; 'never' = #world perdido y no vuelve (se cambia el elemento);
  // 'blank' = como un reset real de GPU: borra todos los lienzos con copia y los marca para recuperar.
  L.simulate = function (kind) {
    if (kind === 'never') { SIM = 100000; onLost({ target: world }); return; }
    if (kind === 'blank') {
      for (var i = 0; i < TR.length; i++) { var c = TR[i].r.deref(); if (c && c.__lzSnap) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c.__lzPending = true; } }
    }
    onLost({ target: world }); onRestored({ target: world });
  };
  L.sweep = sweep;
  L.stats = function () {
    var live = 0, snaps = 0, lost = 0;
    for (var i = 0; i < TR.length; i++) { var c = TR[i].r.deref(); if (!c) continue; live++; if (c.__lzSnap) snaps++; if (isLost(c.getContext('2d'))) lost++; }
    var bT = 0, bG = 0, big = [];   // v0.12: memoria de lienzos vivos (w*h*4), para el tope de iOS Safari (~256-384 MB)
    for (i = 0; i < TR.length; i++) { var c2 = TR[i].r.deref(); if (c2) { var b = c2.width * c2.height * 4; bT += b; if (b > 4194304) big.push([c2.width, c2.height]); } }
    for (i = GP.length - 1; i >= 0; i--) { var c3 = GP[i].deref(); if (!c3) GP.splice(i, 1); else { bG += c3.width * c3.height * 4; if (c3.width * c3.height * 4 > 4194304) big.push([c3.width, c3.height, 'gpu']); } }
    var MB = function (x) { return Math.round(x / 1048576 * 10) / 10; };
    var mb = { canvas: MB(bT + bG), cpu: MB(bT), gpu: MB(bG), snaps: MB(snapBytes), total: MB(bT + bG + snapBytes), big: big };
    return { mb: mb, off: OFF, cpu: nCpu, gpu: nGpu, tracked: live, snaps: snaps, snapMB: Math.round(snapBytes / 1048576 * 10) / 10, lost: lost,
      worldLost: !!(world && isLost(world.getContext('2d'))), rebakes: rebakes, restored: restoredN, replaced: replaced, busy: busy, log: log.slice() };
  };
})();
