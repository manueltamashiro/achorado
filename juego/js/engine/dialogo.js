/* ACHORADO — dialogo.js → ACH.dialogo (v0.10): diálogo importante con retrato que habla (regla permanente, ver V010.md).
     play(lines, opts)  lines: [{quien:'alexander'|'titina'|null, cara, texto}] o strings (= alexander, 'habla').
                        opts: {onDone(), voz: false (decir la línea con ACH.audio.say), pausaJuego: true}
                        v0.13: opts.id (p. ej. 'intro.gambetta'): la primera vez, línea por línea; si ya se vio entero, ESC o SALTAR lo
                        cierran todo (onDone igual). opts.saltable: true = saltable siempre. Línea {nombre: 'Doña Charo'} para el rótulo.
     skip() · seen(id) · markSeen(id) · canSkip()
     active() · advance() (= ENTER: completa la línea o pasa a la siguiente) · close()
   Retrato 96×96 a escala entera abajo a la izquierda (ACH.retratos.draw; si falta, un recuadro gris con iniciales), caja chicha,
   máquina de escribir a ~40 letras/s con pausas, boca según la letra, parpadeo cada 2–4 s y ▼ cuando la línea está completa.
   No hay «saltar todo» y ESC no cierra. Se carga antes que input.js: su oyente de teclado en captura corre antes que el del juego. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var CPS = 40, BLIP_EVERY = 2;
  var NAME = { alexander: 'ALEXANDER', titina: 'TITINA' };
  var INIT = { alexander: 'AX', titina: 'TI' };
  var TITINA_CARAS = { habla: 1, feliz: 1, sorpresa: 1, molesta: 1 };
  var REST = { risa: 2, sorpresa: 1, cansado: 1, asco: 1 };   // la boca de cada cara cuando no habla (si retratos.js no trae la suya)
  var VOW = /[aeiouáéíóúü]/i, LET = /[a-zñáéíóúü0-9]/i;

  var D = null;      // DOM
  var S = null;      // diálogo vivo
  var raf = 0, lastT = 0;

  function now() { return (window.performance || Date).now() / 1000; }
  function sfx(n, d) { try { var a = ACH.audio; if (a && a.emit) a.emit(n, d); } catch (e) { /* el sonido nunca rompe el juego */ } }
  function paused() { var G = ACH.G; return !!(G && G.state === 'paused'); }

  function norm(l) {
    if (l == null) return null;
    if (typeof l === 'string') return { quien: 'alexander', cara: 'habla', texto: l };
    var q = l.quien === undefined ? 'alexander' : l.quien;
    var c = l.cara || 'habla';
    if (q === 'titina' && !TITINA_CARAS[c]) c = 'habla';
    return { quien: q, cara: c, texto: String(l.texto == null ? '' : l.texto), nombre: l.nombre || null };
  }

  // v0.13: nombre de quien habla: línea {nombre}, los de siempre, ACH.retratos.NOMBRES (si un agente los pone) o el id en mayúsculas
  function nameOf(L) {
    if (!L || !L.quien) return '';
    if (L.nombre) return String(L.nombre).toUpperCase();
    if (NAME[L.quien]) return NAME[L.quien];
    var R = ACH.retratos, n = R && R.NOMBRES && R.NOMBRES[L.quien];
    return n ? String(n).toUpperCase() : String(L.quien).replace(/[_-]/g, ' ').toUpperCase();
  }
  /* v0.13 (G5): diálogos con id ya vistos → saltables (ESC o SALTAR). La primera vez, línea por línea sin «saltar todo» (regla del dueño). */
  var SEEN_KEY = 'achorado.dialogos.v1', seenMem = null;
  function seenAll() { if (seenMem) return seenMem; try { seenMem = JSON.parse(window.localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { seenMem = {}; }
    try { if (window.localStorage.getItem('achorado.cima.vista') === '1') { seenMem['intro.gambetta'] = seenMem['intro.cerro'] = seenMem['cima.llegada'] = 1; } } catch (e) { /* nada */ }   // quien ya vio la cima ya vio esas intros
    return seenMem; }
  function wasSeen(id) { return !!(id && seenAll()[id]); }
  function markSeen(id) { if (!id) return; var o = seenAll(); if (o[id]) return; o[id] = 1; try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(o)); } catch (e) { /* memoria */ } }

  function build() {
    if (D) return D;
    var parent = document.getElementById('stage') || document.body;
    var root = document.createElement('div');
    root.className = 'dlgx';
    root.setAttribute('data-ui', '');
    root.innerHTML =
      '<div class="dlgx-row">' +
      '<div class="dlgx-por"><div class="dlgx-frame"><canvas width="96" height="96"></canvas></div><div class="dlgx-name"></div></div>' +
      '<div class="chicha dlg dlgx-box"><p class="dlgx-txt" aria-hidden="true"><span class="dlgx-a"></span><span class="dlgx-b"></span></p>' +
      '<p class="dlgx-sr" aria-live="polite"></p><i class="dlgx-next" aria-hidden="true">▼</i>' +
      '<button type="button" tabindex="-1" class="dlgx-skip" data-ui="" aria-label="Saltar el diálogo">SALTAR ⏭</button></div>' +
      '</div>';
    parent.appendChild(root);
    var q = function (s) { return root.querySelector(s); };
    D = { root: root, por: q('.dlgx-por'), frame: q('.dlgx-frame'), cv: q('canvas'), name: q('.dlgx-name'), box: q('.dlgx-box'),
      a: q('.dlgx-a'), b: q('.dlgx-b'), sr: q('.dlgx-sr'), next: q('.dlgx-next'), skip: q('.dlgx-skip'), k: 0 };
    D.skip.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (S && !paused()) skip(); });
    D.ctx = D.cv.getContext('2d'); D.ctx.imageSmoothingEnabled = false;
    root.addEventListener('pointerdown', function (e) {
      if (!S || paused()) return;
      if (e.target && e.target.closest && e.target.closest('.dlgx-skip')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();   // sin stopPropagation: tactil.js y motor.js (desbloqueo de audio) también lo ven
      advance();
    });
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 300); });
    return D;
  }

  // escala entera del retrato: k = max(1, floor(alto del escenario × 0,36 / 96)); en un teléfono acostado (≈390 px) queda en 1× para no tapar media pantalla
  function layout() {
    if (!D) return;
    var st = document.getElementById('stage'), h = st ? st.clientHeight : (window.innerHeight || 540);
    var k = Math.max(1, Math.floor(h * 0.36 / 96));
    if (k !== D.k) { D.k = k; D.root.style.setProperty('--pk', k); D.cv.style.width = D.cv.style.height = (96 * k) + 'px'; }
  }

  /* ---- retrato ---- */
  function drawPlaceholder(g, L, boca, ojos) {
    g.fillStyle = '#4a4652'; g.fillRect(8, 8, 80, 80);
    g.fillStyle = '#6a6574'; g.fillRect(8, 8, 80, 3);
    g.fillStyle = '#d8d4de'; g.font = '20px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(INIT[L.quien] || '??', 48, 38);
    g.fillStyle = '#d8d4de';
    var eh = ojos === 'cerrados' ? 1 : ojos === 'medio' ? 2 : 4;
    g.fillRect(34, 56 - eh / 2, 6, eh); g.fillRect(56, 56 - eh / 2, 6, eh);
    g.fillStyle = '#231f28'; g.fillRect(40, 68, 16, 2 + boca * 4);
  }
  function drawPortrait(t) {
    var L = S.line, g = D.ctx, R = ACH.retratos;
    g.clearRect(0, 0, 96, 96);
    if (!L.quien) return;
    var boca = S.mouth, ojos = S.eyes, ok = false;
    if (R && typeof R.draw === 'function' && !S.badArt) {
      try { R.draw(g, L.quien, L.cara, boca, ojos, t); ok = true; }
      catch (e) { S.badArt = true; try { console.warn('[dialogo] retratos.draw', e); } catch (x) { /* nada */ } }
    }
    if (!ok) drawPlaceholder(g, L, boca, ojos);
  }
  function restMouth(L) {
    var R = ACH.retratos;
    if (R && R.REST && typeof R.REST[L.cara] === 'number') return R.REST[L.cara];
    return L.quien === 'titina' ? 0 : (REST[L.cara] || 0);
  }

  /* ---- líneas ---- */
  function startLine(i) {
    var L = S.lines[i];
    S.i = i; S.line = L; S.n = 0; S.acc = 0; S.wait = 0; S.done = false; S.t0 = now(); S.mouth = 0; S.letters = 0; S.mouthT = 0;
    D.root.setAttribute('data-quien', L.quien || 'nadie');
    D.root.setAttribute('data-cara', L.cara);
    D.por.style.display = L.quien ? '' : 'none';
    D.name.textContent = nameOf(L);
    D.a.textContent = ''; D.b.textContent = L.texto;   // b: lo que falta, invisible (la caja no cambia de alto mientras escribe)
    D.sr.textContent = (nameOf(L) ? nameOf(L) + ': ' : '') + L.texto;
    D.next.classList.remove('on');
    if (S.opts.voz && ACH.audio && ACH.audio.say) { try { ACH.audio.say(L.texto, { force: true }); } catch (e) { /* nada */ } }
    drawPortrait(0);
  }
  function finishLine() {
    if (!S) return;
    S.n = S.line.texto.length; S.done = true; S.mouth = restMouth(S.line);
    D.a.textContent = S.line.texto; D.b.textContent = '';
    D.next.classList.add('on');
  }
  function pauseAfter(txt, i) {   // pausa (s) después de la letra i
    var c = txt.charAt(i), nx = txt.charAt(i + 1);
    if (c === '…') return 0.3;
    if (c === '.') return nx === '.' ? 0.09 : 0.28;
    if (c === '!' || c === '?') return nx === '!' || nx === '?' ? 0.05 : 0.26;
    if (c === ',' || c === ';' || c === ':') return 0.13;
    return 0;
  }

  function tick() {
    raf = 0;
    if (!S) return;
    raf = requestAnimationFrame(tick);
    var t = now(), dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    if (paused()) { S.t0 += dt; S.blinkAt += dt; return; }
    layout();
    var L = S.line, txt = L.texto;
    if (!S.done) {
      if (S.wait > 0) { S.wait -= dt; S.mouth = 0; }
      else {
        S.acc += dt * CPS;
        var grew = false;
        while (S.acc >= 1 && S.n < txt.length && S.wait <= 0) {
          S.acc -= 1;
          var ch = txt.charAt(S.n); S.n++; grew = true;
          if (LET.test(ch)) { S.letters++; if (S.letters % BLIP_EVERY === 1) sfx('dlg.blip', { quien: L.quien, cara: L.cara }); }
          S.mouth = VOW.test(ch) ? 2 : LET.test(ch) ? 1 : 0;
          S.mouthT = 1.6 / CPS;
          var p = pauseAfter(txt, S.n - 1); if (p > 0) { S.wait = p; S.acc = 0; S.mouth = 0; }
        }
        if (grew) { D.a.textContent = txt.slice(0, S.n); D.b.textContent = txt.slice(S.n); }
        if (!grew) { S.mouthT -= dt; if (S.mouthT <= 0 && S.mouth === 2) S.mouth = 1; }
        if (S.n >= txt.length && S.wait <= 0) finishLine();
      }
    }
    // parpadeo cada 2–4 s: medio · cerrados · medio
    var bt = t - S.blinkAt;
    if (bt < 0) S.eyes = 'abiertos';
    else if (bt < 0.04) S.eyes = 'medio';
    else if (bt < 0.12) S.eyes = 'cerrados';
    else if (bt < 0.16) S.eyes = 'medio';
    else { S.eyes = 'abiertos'; S.blinkAt = t + 2 + Math.random() * 2; }
    drawPortrait(t - S.t0);
  }

  /* ---- API ---- */
  function play(lines, opts) {
    var list = (lines || []).map(norm).filter(function (l) { return l && l.texto; });
    if (S) close(true);
    opts = opts || {};
    if (!list.length) { if (typeof opts.onDone === 'function') { try { opts.onDone(); } catch (e) { console.warn('[dialogo] onDone', e); } } return false; }
    build(); layout();
    try { if (ACH.retratos && ACH.retratos.ready) ACH.retratos.ready(); } catch (e) { /* placeholder */ }
    var canSkip = !!opts.saltable || wasSeen(opts.id);
    S = { lines: list, opts: opts, i: 0, canSkip: canSkip, eyes: 'abiertos', blinkAt: now() + 1.5 + Math.random() * 1.5, badArt: false };
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    D.root.classList.add('on');
    D.root.classList.toggle('canskip', canSkip);
    document.body.classList.add('dlg-on');
    startLine(0);
    lastT = now();
    if (!raf) raf = requestAnimationFrame(tick);
    return true;
  }
  function advance() {
    if (!S) return;
    if (!S.done) { finishLine(); return; }
    sfx('dlg.next');
    if (S.i + 1 < S.lines.length) startLine(S.i + 1);
    else { markSeen(S.opts.id); close(false); }
  }
  function skip() { if (!S || !S.canSkip) return false; sfx('ui.back'); markSeen(S.opts.id); close(false); return true; }
  function close(silent) {
    if (!S) return;
    var o = S.opts; S = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (D) { D.root.classList.remove('on'); D.next.classList.remove('on'); D.sr.textContent = ''; }
    document.body.classList.remove('dlg-on');
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    if (!silent && o && typeof o.onDone === 'function') { try { o.onDone(); } catch (e) { console.warn('[dialogo] onDone', e); } }
  }

  // Teclado en captura (antes que input.js e inventario.js): ENTER/ESPACIO avanzan; ESC y TAB se tragan (no cierran ni saltan).
  window.addEventListener('keydown', function (e) {
    if (!S || paused() || e.ctrlKey || e.metaKey || e.altKey) return;
    var c = e.code || e.key;
    if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || e.key === ' ') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) advance();
    } else if (c === 'Escape' || c === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); if (c === 'Escape' && !e.repeat) { if (S.canSkip) skip(); else if (typeof S.opts.onEsc === 'function') { try { S.opts.onEsc(); } catch (x) { /* nada */ } } } }   // v0.13 fix M2: onEsc lo usa el prólogo (un solo ESC lo salta entero)
  }, true);

  ACH.dialogo = {
    play: play,
    active: function () { return !!S; },
    advance: advance,
    close: function () { close(false); },
    skip: skip, seen: wasSeen, markSeen: markSeen, canSkip: function () { return !!(S && S.canSkip); },
    state: function () { return S ? { i: S.i, n: S.n, len: S.line.texto.length, done: S.done, quien: S.line.quien, cara: S.line.cara, texto: S.line.texto, mouth: S.mouth, eyes: S.eyes, lines: S.lines.length, k: D ? D.k : 0, art: !!ACH.retratos && !S.badArt } : null; }
  };
})();
