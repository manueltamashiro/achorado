/* ACHORADO v0.14 — js/engine/ui-v014.js → ACH.ui (Agente C, «Capa C — UI AAA»; contrato juego/V014.md, notas diseno/v014-c.md).
   Solo VISUAL. La hoja css/pulido-v014.css hace casi todo; este archivo aporta lo que el CSS no puede:
     1. Íconos de canvas SUAVES: cada <canvas> pequeño de la UI (HUD, barra rápida, mochila, tienda, recetario, retrato del diálogo, piezas…)
        se ve con Scale2x (1 o 2 pasadas en CPU) + suavizado bilineal del navegador, en vez de píxeles duros. Cómo: junto a cada canvas original
        se inserta UN canvas hermano (.ui-sm, fijo, no por cuadro) que ocupa su lugar y se repinta solo cuando cambia el original (detección
        por comparación de Uint32 a ~20 Hz; el retrato mientras habla, cada cuadro). El original queda oculto (.ui-src) pero sigue siendo
        el que pintan los demás módulos: no se toca ningún id, ni su estructura. Un solo búfer compartido para leer y otros dos para escalar.
     2. Barras del HUD con «rastro» de daño: una barra fantasma (<s class="ui-gh">) baja con retraso tras el ancho real de #hp / #st / #gt
        (se observa su atributo style); destello al recibir daño y pulso cuando la vida está baja.
     3. Inclinación 3D: --ptx/--pty (puntero sobre el escenario, -1…1) para que los paneles abiertos se inclinen apenas hacia el mouse, y
        --tx/--ty por elemento (casillas, botones, tarjetas) para el hover con perspectiva.
     4. Títulos: copia el texto en data-t para que el CSS pinte el degradé de la «cara» de las letras (::after) sobre la extrusión 3D.
     5. Clase body.ui-calm = prefers-reduced-motion o la opción «SACUDIDA Y DESTELLOS: REDUCIDOS» (ACH.opciones.get('calma')): el CSS apaga
        inclinaciones y animaciones.
   Interruptores: ?ui=0 apaga la hoja pulido-v014.css (vuelve la UI v0.13); ACH.ui.smooth(false) apaga el escalador de íconos.
   API: ACH.ui = { smooth(on), on(), stats(), refresh() }. Nada de esto toca posiciones, ids, estructura ni lógica del juego. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var UI = ACH.ui = ACH.ui || {};
  var doc = document, root = doc.documentElement;

  /* ---------------- 0. interruptor ?ui=0 ---------------- */
  var OFF = /[?&]ui=0\b/.test(location.search || '');
  if (OFF) {
    var kill = function () {
      var ls = doc.querySelectorAll('link[href*="pulido-v014"]');
      for (var i = 0; i < ls.length; i++) ls[i].disabled = true;
    };
    kill(); if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', kill);
    UI.on = function () { return false; }; UI.smooth = function () { return false; }; UI.stats = function () { return { off: true }; }; UI.refresh = function () {};
    return;
  }
  root.classList.add('ui14');

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function body() { return doc.body; }

  /* ---------------- 1. calma / movimiento reducido ---------------- */
  var mq = null, calmOn = false;
  try { mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { mq = null; }
  function calmWanted() {
    var o = false; try { o = !!(ACH.opciones && ACH.opciones.get && ACH.opciones.get('calma')); } catch (e) { o = false; }
    return o || !!(mq && mq.matches);
  }
  function syncCalm() {
    var b = body(); if (!b) return;
    var w = calmWanted();
    if (w !== calmOn) { calmOn = w; b.classList.toggle('ui-calm', w); if (w) { setPtr(0, 0); } }
  }
  if (mq && mq.addEventListener) { try { mq.addEventListener('change', syncCalm); } catch (e) { /* nada */ } }

  /* ---------------- 2. parallax del puntero (--ptx/--pty) y tilt por elemento (--tx/--ty) ---------------- */
  var stage = null, ptrX = 0, ptrY = 0, ptrRaf = 0, ptrWantX = 0, ptrWantY = 0;
  // ¿hay un panel «de menú» abierto? (los del juego en vivo no se inclinan)
  var PANEL_STATES = { title: 1, paused: 1, won: 1, dead: 1 };
  function panelOpen() {
    var b = body(); if (!b) return false;
    if (PANEL_STATES[b.getAttribute('data-state')]) return true;
    var c = b.classList;
    if (c.contains('inv-on') || c.contains('hab-on') || c.contains('base-on')) return true;
    return !!(stage && stage.querySelector('.tienda.on, .mshop.on, .dlgx.on'));
  }
  function setPtr(x, y) {
    ptrWantX = x; ptrWantY = y;
    if (ptrRaf) return;
    ptrRaf = requestAnimationFrame(function () {
      ptrRaf = 0;
      // suavizado exponencial: la inclinación sigue al mouse sin saltos
      ptrX += (ptrWantX - ptrX) * 0.35; ptrY += (ptrWantY - ptrY) * 0.35;
      if (Math.abs(ptrWantX - ptrX) > 0.01 || Math.abs(ptrWantY - ptrY) > 0.01) { setPtr(ptrWantX, ptrWantY); } else { ptrX = ptrWantX; ptrY = ptrWantY; }
      if (stage) { stage.style.setProperty('--ptx', ptrX.toFixed(3)); stage.style.setProperty('--pty', ptrY.toFixed(3)); }
    });
  }
  var TILT_SEL = '.islot, .qs.qo, .tienda-it, .mshop-it, .rrow, .habnode.can, .ttl-btn, .pz-btn, .invbtns button, .invtabs button, .lvlbtn, .rgo, .tienda-close, .habfoot button, .bz-btn, .bz-slot, .bz-it, .cm-btn, .pvbtn, button.go, .pz-darr';
  var tiltEl = null;
  function tiltClear() { if (tiltEl) { tiltEl.style.removeProperty('--tx'); tiltEl.style.removeProperty('--ty'); tiltEl = null; } }
  function onMove(e) {
    if (calmOn || (e.pointerType && e.pointerType !== 'mouse')) return;
    var b = body(); if (!b || !stage) return;
    if (!panelOpen()) { if (ptrWantX || ptrWantY) setPtr(0, 0); tiltClear(); return; }
    var r = stage.getBoundingClientRect();
    if (r.width < 10) return;
    setPtr(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)), Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)));
    var t = e.target && e.target.closest ? e.target.closest(TILT_SEL) : null;
    if (t !== tiltEl) tiltClear();
    if (t) {
      var q = t.getBoundingClientRect();
      if (q.width > 4 && q.height > 4) {
        tiltEl = t;
        t.style.setProperty('--tx', (((e.clientX - q.left) / q.width - 0.5) * 2).toFixed(3));
        t.style.setProperty('--ty', (((e.clientY - q.top) / q.height - 0.5) * 2).toFixed(3));
      }
    }
  }
  function onLeave() { setPtr(0, 0); tiltClear(); }

  /* ---------------- 3. barras del HUD con rastro de daño ---------------- */
  var BARS = [['#hp', 'hp'], ['#st', 'st'], ['#gt', 'gt']];
  var ghosts = [];   // {fill, gh, bar, last (ancho real), kind, t}
  function barWidth(fill) { var w = parseFloat(fill.style.width); return isNaN(w) ? 100 : w; }
  function addGhost(fill, kind) {
    if (!fill || fill.__uiGh) return;
    var bar = fill.parentNode; if (!bar) return;
    var gh = doc.createElement('s'); gh.className = 'ui-gh ui-gh-' + kind; gh.setAttribute('aria-hidden', 'true');
    bar.insertBefore(gh, fill);
    var rec = { fill: fill, gh: gh, bar: bar, last: barWidth(fill), kind: kind, hitT: 0 };
    gh.style.width = rec.last + '%';
    fill.__uiGh = rec; ghosts.push(rec);
    var mo = new MutationObserver(function () { barChanged(rec); });
    mo.observe(fill, { attributes: true, attributeFilter: ['style'] });
  }
  function barChanged(rec) {
    var w = barWidth(rec.fill);
    if (w === rec.last) return;
    if (w < rec.last) {
      // daño / gasto: el fantasma se queda un instante y baja después (CSS: transition con retraso)
      rec.gh.classList.remove('up');
      rec.gh.style.width = w + '%';
      if (!calmOn) { rec.bar.classList.remove('ui-hit'); void rec.bar.offsetWidth; rec.bar.classList.add('ui-hit'); clearTimeout(rec.hitT); rec.hitT = setTimeout(function () { rec.bar.classList.remove('ui-hit'); }, 260); }
    } else {
      // curación / recuperación: el fantasma sube pegado a la barra
      rec.gh.classList.add('up');
      rec.gh.style.width = w + '%';
    }
    rec.last = w;
    if (rec.kind === 'hp') rec.bar.classList.toggle('ui-crit', w > 0 && w <= 25);
  }
  function scanBars() {
    for (var i = 0; i < BARS.length; i++) { var f = doc.querySelector(BARS[i][0]); if (f && !f.__uiGh) addGhost(f, BARS[i][1]); }
    // barras de jefa / chef / presidenta (HTML), cuando existan: .jb i
    var jb = doc.querySelectorAll('#jefaBar .jb i, #chefBar .jb i, .jb i');
    for (var j = 0; j < jb.length; j++) if (!jb[j].__uiGh) addGhost(jb[j], 'boss');
  }

  /* ---------------- 4. títulos: data-t para la «cara» degradé ---------------- */
  var TITLES = '.poster h1, .poster h2, .invhead h2, .tienda-t, .mshop-t, .habnvbig, h2.big, .cm-card h2, .bz-h2';   // solo bloques (el ::after se posiciona sobre ellos)
  var titleEls = [];
  function scanTitles(rootEl) {
    var l = (rootEl || doc).querySelectorAll(TITLES);
    for (var i = 0; i < l.length; i++) { if (!l[i].__uiT) { l[i].__uiT = 1; titleEls.push(l[i]); } syncTitle(l[i]); }
  }
  function syncTitle(el) { var t = el.textContent; if (el.getAttribute('data-t') !== t) el.setAttribute('data-t', t); }
  function syncTitles() {
    for (var i = titleEls.length - 1; i >= 0; i--) { var e = titleEls[i]; if (!e.isConnected) { titleEls.splice(i, 1); continue; } syncTitle(e); }
  }

  /* ---------------- 5. íconos suaves: Scale2x en CPU ---------------- */
  var SM = { on: true, max: 160, reg: [], map: (typeof Map === 'function' ? new Map() : null), S: null, sg: null, A: null, Bb: null, cap: 0,
    frame: 0, ms: 0, msMax: 0, nProc: 0, nDraw: 0, nTrack: 0, portMs: 0 };
  var SKIP = ':not(#world):not(#worldfx):not(.bz-cv):not(.cm-cv):not(.ui-sm):not(.pfx-att):not([id^="pfx"]):not([data-nosmooth])';   // .pfx-att / #worldfx = lente WebGL del Agente A: nunca se tocan
  function ensureBufs(n) {   // n = píxeles máximos de salida (4 bytes c/u); dos búferes de ping-pong
    if (SM.cap >= n) return;
    SM.cap = Math.max(n, 4096);
    SM.A = new Uint32Array(SM.cap); SM.Bb = new Uint32Array(SM.cap);
  }
  function scratch(w, h) {
    if (!SM.S) {
      SM.S = doc.createElement('canvas');
      try { SM.sg = SM.S.getContext('2d', { willReadFrequently: true }); } catch (e) { SM.sg = SM.S.getContext('2d'); }
    }
    if (SM.S.width !== w || SM.S.height !== h) { SM.S.width = w; SM.S.height = h; }
    return SM.sg;
  }
  // Scale2x (AdvMAME2x): bordes diagonales limpios sin inventar colores. src/dst: Uint32 RGBA (little-endian).
  function scale2x(src, w, h, dst) {
    var W = w * 2, y, x, i, P, B, Hh, D, F, e0, e1, e2, e3, o0, o1;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x; P = src[i];
        B = y > 0 ? src[i - w] : P; Hh = y < h - 1 ? src[i + w] : P;
        D = x > 0 ? src[i - 1] : P; F = x < w - 1 ? src[i + 1] : P;
        e0 = e1 = e2 = e3 = P;
        if (B !== Hh && D !== F) {
          if (D === B) e0 = D;
          if (B === F) e1 = F;
          if (D === Hh) e2 = D;
          if (Hh === F) e3 = F;
        }
        o0 = y * 2 * W + x * 2; o1 = o0 + W;
        dst[o0] = e0; dst[o0 + 1] = e1; dst[o1] = e2; dst[o1 + 1] = e3;
      }
    }
  }
  function makeOv(cv) {
    var ov = doc.createElement('canvas');
    ov.className = 'ui-sm'; ov.setAttribute('aria-hidden', 'true'); ov.setAttribute('role', 'presentation');
    ov.__uiOwner = cv;
    return ov;
  }
  // barrido anti-duplicados: todo .ui-sm debe ser el hermano vigente de su original; si no, se quita (nunca dos retratos apilados)
  function sweepOrphans() {
    var l = doc.querySelectorAll('canvas.ui-sm'), i, o, r;
    for (i = 0; i < l.length; i++) {
      o = l[i]; r = o.__uiOwner ? rec_of(o.__uiOwner) : null;
      if (!r || r.ov !== o || !o.__uiOwner.isConnected || o.previousSibling !== o.__uiOwner) { if (o.parentNode) o.parentNode.removeChild(o); }
    }
  }
  function rec_of(cv) { return SM.map ? SM.map.get(cv) : cv.__uiRec; }
  function track(cv) {
    if (!SM.on || !cv || cv.tagName !== 'CANVAS' || rec_of(cv)) return;
    if (cv.matches && !cv.matches('canvas' + SKIP)) return;
    if (cv.width > SM.max || cv.height > SM.max) return;   // lienzos grandes (mundo, cuarto, cinemática) no son íconos
    var r = { cv: cv, ov: null, last: null, w: 0, h: 0, cls: '', css: '', sw: 0, drawn: false, hid: false, tries: 0 };
    if (SM.map) SM.map.set(cv, r); else cv.__uiRec = r;
    SM.reg.push(r); SM.nTrack++;
  }
  function scanCanvases(rootEl) {
    var r = rootEl || doc.body; if (!r) return;
    if (r.tagName === 'CANVAS') { track(r); return; }
    if (r.querySelectorAll) { var l = r.querySelectorAll('canvas' + SKIP); for (var i = 0; i < l.length; i++) track(l[i]); }
  }
  function release(r) {
    try { if (r.ov && r.ov.parentNode) r.ov.parentNode.removeChild(r.ov); } catch (e) { /* nada */ }
    if (r.cv) r.cv.classList.remove('ui-src');
    if (SM.map) SM.map.delete(r.cv); else r.cv.__uiRec = null;
  }
  // Una pasada: ¿cambió el original? → reescalar y pintar el hermano. force = repintar aunque no cambie.
  function procRec(r, force, dpr) {
    var cv = r.cv, w = cv.width, h = cv.height;
    if (w < 1 || h < 1 || w > SM.max || h > SM.max) { if (r.hid) { cv.classList.remove('ui-src'); r.hid = false; if (r.ov) r.ov.style.display = 'none'; } return; }
    var g = scratch(w, h), id, px, n = w * h, i, same = !!r.last && r.last.length === n && !force;
    g.clearRect(0, 0, w, h);
    try { g.drawImage(cv, 0, 0); id = g.getImageData(0, 0, w, h); } catch (e) { return; }
    px = new Uint32Array(id.data.buffer);
    for (i = 0; i < n; i++) if ((px[i] >>> 24) === 0) px[i] = 0;   // transparentes iguales entre sí (el RGB no importa)
    if (same) { for (i = 0; i < n; i++) if (r.last[i] !== px[i]) { same = false; break; } }
    if (same && r.drawn) return;
    if (!r.last || r.last.length !== n) r.last = new Uint32Array(n);
    r.last.set(px);
    // pasadas: 2 si cada píxel lógico se ve ≥ ~3 px físicos (y el resultado no pasa de ~40 k px), si no 1
    var disp = (r.sw || w) * dpr / w, passes = disp >= 3 ? 2 : 1;
    if (passes === 2 && n * 16 > 40000 && !r.big) passes = 1;
    if (passes === 2 && n * 16 > 160000) passes = 1;
    var W = w * 2, H = h * 2, a, b;
    ensureBufs(n * 16);
    scale2x(px, w, h, SM.A); a = SM.A;
    if (passes === 2) { scale2x(SM.A, W, H, SM.Bb); a = SM.Bb; W *= 2; H *= 2; }
    var ov = r.ov;
    if (ov.width !== W || ov.height !== H) { ov.width = W; ov.height = H; }
    var og = ov.getContext('2d');
    og.putImageData(new ImageData(new Uint8ClampedArray(a.buffer, 0, W * H * 4), W, H), 0, 0);
    r.drawn = true; SM.nDraw++;
  }
  var RAW = [];
  function pollAll(force) {
    var t0 = now(), list = SM.reg, i, r, cv, dpr = window.devicePixelRatio || 1, vis = RAW; vis.length = 0;
    // fase 1: leer (sin escribir al DOM)
    for (i = list.length - 1; i >= 0; i--) {
      r = list[i]; cv = r.cv;
      if (!cv.isConnected) { if (!r.ov || !r.ov.isConnected) { release(r); list.splice(i, 1); } else { release(r); list.splice(i, 1); } continue; }
      r.sw = cv.offsetWidth;
      if (r.sw > 0) { r.cls = cv.className; r.css = cv.style.cssText; vis.push(r); }
    }
    // fase 2: escribir
    for (i = 0; i < vis.length; i++) {
      r = vis[i]; cv = r.cv;
      if (!r.ov) { r.ov = makeOv(cv); }
      // el hermano debe seguir inmediatamente después del original (si el módulo reordenó/limpió su contenedor, se vuelve a poner)
      if (r.ov.previousSibling !== cv && cv.parentNode) cv.parentNode.insertBefore(r.ov, cv.nextSibling);
      var cc = r.cls.replace(/\bui-src\b/g, '').trim();
      if (r.ovCls !== cc) { r.ov.className = 'ui-sm ' + cc; r.ovCls = cc; }
      if (r.ovCss !== r.css) { r.ov.style.cssText = r.css; r.ovCss = r.css; }
      if (r.ov.style.display === 'none') r.ov.style.display = '';
      procRec(r, force, dpr);
      if (r.drawn && !r.hid) { cv.classList.add('ui-src'); r.hid = true; }
      else if (r.hid && cv.className.indexOf('ui-src') < 0) cv.classList.add('ui-src');
    }
    var dt = now() - t0; SM.ms = SM.ms * 0.9 + dt * 0.1; if (dt > SM.msMax) SM.msMax = dt; SM.nProc = vis.length;
  }
  // el retrato del diálogo se repinta cada cuadro mientras habla
  var portRec = null;
  function portrait() {
    var cv = doc.querySelector('.dlgx-frame canvas:not(.ui-sm)'); if (!cv) return;
    var r = rec_of(cv); if (!r) { track(cv); r = rec_of(cv); if (!r) return; }
    if (!r.ov) return;   // aún no pasó por pollAll
    var t0 = now(); r.sw = cv.offsetWidth; r.big = true;
    if (r.sw > 0) procRec(r, false, window.devicePixelRatio || 1);
    var dt = now() - t0; SM.portMs = SM.portMs * 0.9 + dt * 0.1;
  }

  /* ---------------- 5b. v0.14.1: transición de pantalla (fundido con viñeta que se abre como iris) ----------------
     Se dispara al cambiar de nivel (ACH.world) y al volver a jugar desde título / intro / cinemática / muerte. Un solo <div class="ui-iris">
     dentro de #stage (pointer-events:none), animado por CSS; con calma o movimiento reducido es un fundido simple. UI.P.iris = 0 lo apaga. */
  UI.P = UI.P || { iris: 1, irisGap: 1200 };
  var TR = { s: null, w: null, el: null, last: 0, n: 0 };
  var TR_FROM = { title: 1, intro: 1, cine: 1, dead: 1, won: 1 };
  function transCheck() {
    var b = body(); if (!b) return;
    var s = b.getAttribute('data-state'), w = ACH.world || null;
    if (TR.s === null) { TR.s = s; TR.w = w; return; }
    var fire = (w !== TR.w && !!TR.w) || (s !== TR.s && ((s === 'playing' && TR_FROM[TR.s]) || (s === 'intro' && TR.s === 'title')));
    TR.s = s; TR.w = w;
    if (fire) iris();
  }
  function iris() {
    if (!(UI.P.iris > 0) || !stage) return;
    var t = now(); if (t - TR.last < UI.P.irisGap) return; TR.last = t;
    var el = TR.el;
    if (!el || !el.isConnected) { el = TR.el = doc.createElement('div'); el.className = 'ui-iris'; el.setAttribute('aria-hidden', 'true'); stage.appendChild(el); }
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); TR.n++;
  }
  UI.iris = iris; UI.transCheck = transCheck;   // QA: la llama el bucle propio (rAF); expuesta para probar con el panel oculto

  /* ---------------- 6. bucle propio y observadores ---------------- */
  var moTimer = 0, pend = [], started = false, lastTitles = 0;
  function frame() {
    requestAnimationFrame(frame);
    var b = body(); if (!b) return;
    SM.frame++;
    transCheck();   // v0.14.1
    if (SM.on) {
      if (pend.length) { for (var i = 0; i < pend.length; i++) scanCanvases(pend[i]); pend.length = 0; pollAll(false); }
      else {
        // jugando sin menús: solo el HUD (cambia poco) → ~6 Hz; con un panel abierto → ~20 Hz
        var busy = b.getAttribute('data-state') !== 'playing' || b.className.indexOf('-on') >= 0;
        if (SM.frame % (busy ? 3 : 10) === 0) pollAll(false);
      }
      if (b.classList.contains('dlg-on')) portrait();
    }
    if (SM.frame % 30 === 0) { syncCalm(); syncTitles(); }
    if (SM.frame % 60 === 0) { scanBars(); }
    if (SM.frame % 45 === 0) sweepOrphans();
  }
  function start() {
    if (started) return; started = true;
    stage = doc.getElementById('stage');
    var b = body();
    syncCalm();
    if (stage) {
      stage.addEventListener('pointermove', onMove, { passive: true });
      stage.addEventListener('pointerleave', onLeave, { passive: true });
      stage.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { setPtr(0, 0); tiltClear(); } }, { passive: true });
    }
    scanCanvases(b); scanBars(); scanTitles();
    // nodos nuevos: canvas (íconos) y títulos
    var mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var add = list[i].addedNodes;
        for (var j = 0; j < add.length; j++) {
          var n = add[j]; if (n.nodeType !== 1) continue;
          if (n.classList && (n.classList.contains('ft') || n.classList.contains('toast') || n.classList.contains('ui-sm') || n.classList.contains('ui-gh'))) continue;
          if (n.tagName === 'CANVAS' || (n.firstElementChild && n.querySelector('canvas'))) pend.push(n);
          if (n.matches && n.querySelector && (n.matches(TITLES) || n.querySelector(TITLES))) { scanTitles(n.parentNode || doc); }
          if (n.querySelector && (n.querySelector('.bar') || n.id === 'jefaBar' || n.id === 'chefBar')) scanBars();
        }
      }
    });
    mo.observe(b, { childList: true, subtree: true });
    // clase body.opt-calma cambiada desde OPCIONES → recalcular
    var mo2 = new MutationObserver(function () { syncCalm(); });
    mo2.observe(b, { attributes: true, attributeFilter: ['class'] });
    requestAnimationFrame(frame);
  }
  if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
  window.addEventListener('resize', function () { setTimeout(function () { if (SM.on) pollAll(true); }, 120); });

  UI.on = function () { return true; };
  UI.smooth = function (on) {
    if (on === undefined) return SM.on;
    SM.on = !!on;
    if (!SM.on) { for (var i = SM.reg.length - 1; i >= 0; i--) { var r = SM.reg[i]; if (r.cv) r.cv.classList.remove('ui-src'); if (r.ov && r.ov.parentNode) r.ov.parentNode.removeChild(r.ov); if (SM.map) SM.map.delete(r.cv); } SM.reg.length = 0; }
    else { scanCanvases(body()); pollAll(true); }
    return SM.on;
  };
  UI.refresh = function () { scanCanvases(body()); scanBars(); scanTitles(); pollAll(true); };
  UI.calma = function () { return calmOn; };
  UI.stats = function () { return { tracked: SM.reg.length, visible: SM.nProc, drawn: SM.nDraw, pollMs: +SM.ms.toFixed(3), pollMsMax: +SM.msMax.toFixed(2), iris: TR.n, portraitMs: +SM.portMs.toFixed(3), ghosts: ghosts.length, calma: calmOn }; };
})();
