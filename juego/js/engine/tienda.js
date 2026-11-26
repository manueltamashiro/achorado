/* ACHORADO v0.11 — js/engine/tienda.js (B): la tienda genérica de todos los vendedores (V011.md §3.3).
   API: ACH.tienda = { open(vendorId, opts?) → bool, close(), isOpen(), buy(i) → bool, vendor() → id|null, rows() → [...] }
   - Datos: ACH.VENDEDORES_DATA[vendorId] (js/base/catalogo.js): { name, titulo, nivel, frase, stock: [{id, precio, n?}] }.
     id del stock = objeto de ACH.inv.defs (→ ACH.inv.add) o mueble de ACH.base.CATALOGO (→ ACH.base.give, «VA A TU CUARTO»).
   - Panel afiche chicha creado por JS dentro de #stage (estilos en css/tienda.css), lista que se desplaza y dos columnas si cabe.
   - Comprar: clic / toque, ↑↓ (←→) + Enter, o 1–9. ESC o E cierran. El juego queda en pausa: ACH.inv.isOpen() da true mientras está abierta
     (game.js congela la simulación con eso). opts = { x, y } (posición del vendedor, para los sonidos). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var NOMONEY = {
    cachinero: 'Sin billete no hay cachina, joven.',
    meche: 'Fiado ya no, hijito. Ya me deben medio cerro.'
  };
  var THANKS = {
    cachinero: '¡Buena compra, joven! Eso ya no lo fabrican.',
    meche: 'Gracias, hijito. Cuídate, que abajo está feo.',
    pintor: 'Gracias, joven. Cuélguelo con buena luz.',
    rosa: 'Gracias, caserito. Hecho con cariño.'
  };

  function sfx(n, d) { var a = ACH.audio; if (a && a.emit) { try { a.emit(n, d); } catch (e) { /* el audio nunca rompe el juego */ } } }
  function data(id) { var V = ACH.VENDEDORES_DATA; return V && V[id] ? V[id] : null; }
  function inv() { return ACH.inv || null; }
  function coins() { var I = inv(); return I && I.count ? I.count('sencillo') : 0; }
  function furn(id) { var I = inv(), B = ACH.base, C = B && B.CATALOGO; if (I && I.defs && I.defs[id]) return null; return C && C[id] ? C[id] : null; }
  function itemDef(id) { var I = inv(); return I && I.defs ? I.defs[id] : null; }
  function itemName(id) { var f = furn(id); if (f) return f.name; var I = inv(); return I && I.name ? I.name(id) : String(id).toUpperCase(); }
  function shortDesc(s) {
    s = String(s || '');
    var k = s.search(/[.!?…](\s|$)/);
    if (k > 20 && k < 110) s = s.slice(0, k + 1);
    if (s.length > 110) s = s.slice(0, 107).replace(/\s+\S*$/, '') + '…';
    return s;
  }
  // v0.13 T2 (P): mueble único (la mesa de luthier): si ya está en el cuarto o en el almacén, no se vende otra vez
  function tenido(id) { var f = furn(id), B = ACH.base; if (!f || !f.unico || !B || typeof B.owned !== "function") return false; try { return B.owned(id) > 0; } catch (e) { return false; } }
  function nomoney(id, d) { return NOMONEY[id] || (d && d.nivel === 'miraflores' ? 'Aquí es precio Miraflores, joven.' : 'No te alcanza, causa.'); }
  function getG() { return ACH.game && ACH.game.G || ACH.G || null; }

  /* ---------------- Íconos ---------------- */
  var phCache = {};
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function furnPH(id) {
    if (phCache[id]) return phCache[id];
    var c = mk(24, 24), g = c.getContext('2d'), f = furn(id), t = (f && f.tipo) || 'piso';
    g.fillStyle = '#131015'; g.fillRect(2, 3, 20, 19);
    g.fillStyle = t === 'pared' ? '#3a6ab8' : t === 'alfombra' ? '#c8402c' : '#8a5a32'; g.fillRect(3, 4, 18, 17);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(3, 4, 18, 3);
    g.fillStyle = '#ffe500'; g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(((f && f.name) || id).replace(/[^A-ZÁÉÍÓÚÑ]/g, '').slice(0, 2), 12, 13);
    phCache[id] = c; return c;
  }
  function iconFor(id) {
    if (furn(id)) {
      var B = ACH.base, c = null;
      if (B && typeof B.icon === 'function') { try { c = B.icon(id, 24); } catch (e) { c = null; } }
      return c && c.width ? c : furnPH(id);
    }
    var I = inv(), s = null;
    if (I && typeof I.iconBig === 'function') { try { s = I.iconBig(id); } catch (e2) { s = null; } }
    if (!s && I && I.icon) { try { s = I.icon(id); } catch (e3) { s = null; } }
    return s;
  }
  function paint(cv, src) {
    var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
    if (!src || !src.width) return;
    var k = Math.max(1, Math.floor(Math.min(cv.width / src.width, cv.height / src.height))), w = src.width * k, h = src.height * k;
    if (w > cv.width || h > cv.height) { k = Math.min(cv.width / src.width, cv.height / src.height); w = src.width * k; h = src.height * k; }
    g.drawImage(src, Math.round((cv.width - w) / 2), Math.round((cv.height - h) / 2), Math.round(w), Math.round(h));
  }

  /* ---------------- Panel ---------------- */
  var S = { open: false, id: null, d: null, rows: [], sel: 0, el: null, list: null, msg: null, coins: null, title: null, kick: null, frase: null, at: null };
  function build() {
    if (S.el) return S.el;
    var stage = document.getElementById('stage'); if (!stage) return null;
    var el = document.createElement('div'); el.id = 'tienda'; el.className = 'tienda'; el.setAttribute('data-ui', '');
    el.innerHTML = '<div class="tienda-poster"><p class="tienda-k"></p><h2 class="tienda-t"></h2><p class="tienda-frase"></p>' +
      '<div class="tienda-list"></div><p class="tienda-msg"></p>' +
      '<div class="tienda-foot"><span class="tienda-coins"></span><span><b>↑↓</b> + <b>ENTER</b> · <b>1-9</b> comprar · <b>E</b> / <b>ESC</b> cerrar</span>' +
      '<button type="button" tabindex="-1" class="tienda-close">CERRAR</button></div></div>';
    stage.appendChild(el);
    S.el = el; S.list = el.querySelector('.tienda-list'); S.msg = el.querySelector('.tienda-msg'); S.coins = el.querySelector('.tienda-coins');
    S.title = el.querySelector('.tienda-t'); S.kick = el.querySelector('.tienda-k'); S.frase = el.querySelector('.tienda-frase');
    var cl = el.querySelector('.tienda-close');
    cl.addEventListener('mousedown', function (e) { e.preventDefault(); });
    cl.addEventListener('click', function (e) { e.preventDefault(); close(); });
    // que los clics no lleguen a input.js (no dispara la resortera) y el fondo cierra
    el.addEventListener('mousedown', function (e) { e.stopPropagation(); if (e.target === el) close(); });
    el.addEventListener('mouseup', function (e) { e.stopPropagation(); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    el.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    return el;
  }
  function stockOf(d) {
    var out = [];
    (d && d.stock || []).forEach(function (s) {
      if (!s || !s.id) return;
      if (!furn(s.id) && !itemDef(s.id)) return;   // ni objeto ni mueble (otra página sin ese archivo): no se ofrece
      out.push({ id: s.id, precio: s.precio | 0, n: s.n || 1 });
    });
    return out;
  }
  function renderRows() {
    S.list.innerHTML = '';
    S.rows.forEach(function (r, i) {
      var b = document.createElement('button'); b.type = 'button'; b.tabIndex = -1; b.className = 'tienda-it';
      b.innerHTML = '<b class="k"></b><canvas width="24" height="24"></canvas><span class="n"></span><span class="p"></span><span class="d"></span><span class="tag">VA A TU CUARTO</span>';
      b.querySelector('.k').textContent = i < 9 ? String(i + 1) : '·';
      var f = furn(r.id), dd = itemDef(r.id);
      b.querySelector('.n').textContent = (r.n > 1 ? r.n + ' ' : '') + itemName(r.id);
      b.querySelector('.p').textContent = 'S/ ' + r.precio + (r.precio === 1 ? ' sencillo' : ' sencillos');
      b.querySelector('.d').textContent = shortDesc(f ? f.desc : (dd && dd.desc) || '');
      if (!f) b.querySelector('.tag').style.display = 'none'; else b.classList.add('mueble');
      if (tenido(r.id)) { b.querySelector(".tag").textContent = "YA LA TIENES"; b.classList.add("tenido"); }
      paint(b.querySelector('canvas'), iconFor(r.id));
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('mouseenter', function () { select(i, true); });
      b.addEventListener('click', function (e) { e.preventDefault(); select(i, true); buy(i); });
      S.list.appendChild(b);
      r.el = b;
    });
  }
  function refresh() {
    if (!S.el) return;
    var c = coins();
    S.rows.forEach(function (r, i) { if (r.el) { r.el.classList.toggle("poor", c < r.precio || tenido(r.id)); r.el.classList.toggle('sel', i === S.sel); } });
    S.coins.textContent = 'Tienes ' + c + (c === 1 ? ' sencillo' : ' sencillos');
  }
  function say(s, cls) {
    if (!S.msg) return;
    S.msg.textContent = s; S.msg.className = 'tienda-msg' + (cls ? ' ' + cls : '');
    void S.msg.offsetWidth; S.msg.classList.add('flash');
  }
  function select(i, quiet) {
    if (!S.rows.length) return;
    i = Math.max(0, Math.min(S.rows.length - 1, i));
    if (i === S.sel && !quiet) return;
    var ch = i !== S.sel; S.sel = i;
    if (ch && !quiet) sfx('ui.move');
    refresh();
    var r = S.rows[i]; if (r && r.el && !quiet && r.el.scrollIntoView) { try { r.el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* nada */ } }
  }

  /* ---------------- Abrir / cerrar / comprar ---------------- */
  function isOpen() { return S.open; }
  function open(id, opts) {
    var d = data(id); if (!d) return false;
    if (S.open) close(true);
    var I = inv(); if (I && I.isOpen && origIsOpen && origIsOpen.call(I)) return false;   // la mochila abierta manda
    if (ACH.base && typeof ACH.base.isOpen === 'function') { try { if (ACH.base.isOpen()) return false; } catch (e) { /* nada */ } }
    if (!build()) return false;
    wrapIsOpen();
    S.id = id; S.d = d; S.rows = stockOf(d); S.sel = 0; S.at = opts || null;
    S.kick.textContent = d.nivel === 'miraflores' && /INFLABLES/.test(d.titulo || '') ? 'PUESTO DE INFLABLES' : 'PUESTO · ' + (d.name || '');
    S.title.textContent = d.titulo || d.name || id;
    S.frase.textContent = d.frase ? '«' + d.frase + '»' : ''; S.frase.classList.remove('intro');
    S.el.classList.toggle('dos', S.rows.length > 5);
    renderRows(); refresh(); say('');
    S.open = true;
    S.el.classList.add('on');
    if (S.list) S.list.scrollTop = 0;
    if (ACH.input && ACH.input.reset) { try { ACH.input.reset(); } catch (e2) { /* nada */ } }
    sfx('shop.open', S.at ? { x: S.at.x, y: S.at.y, vendor: id } : { vendor: id });
    return true;
  }
  function close(silent) {
    if (!S.open) return false;
    S.open = false;
    if (S.el) S.el.classList.remove('on');
    if (ACH.input && ACH.input.reset) { try { ACH.input.reset(); } catch (e) { /* nada */ } }   // nada queda apretado al volver al juego
    if (!silent) sfx('ui.back');
    return true;
  }
  function buy(i) {
    if (!S.open) return false;
    if (i === undefined) i = S.sel;
    var r = S.rows[i], I = inv(); if (!r || !I) return false;
    select(i, true);
    var name = itemName(r.id), f = furn(r.id);
    if (tenido(r.id)) { say("Esa ya la tienes en tu cuarto, joven. Una sola, que no hay espacio.", "no"); sfx("shop.nomoney"); return false; }
    if (coins() < r.precio) { say(nomoney(S.id, S.d), 'no'); sfx('shop.nomoney'); return false; }
    if (f) {
      var B = ACH.base;
      if (!B || typeof B.give !== 'function') { say('Primero consigue un cuarto, joven.', 'no'); sfx('shop.nomoney'); return false; }
      I.take('sencillo', r.precio);
      var ok = false; try { ok = B.give(r.id, r.n) !== false; } catch (e) { ok = false; }
      if (!ok) { I.add('sencillo', r.precio); say('No se pudo llevar a tu cuarto, joven.', 'no'); refresh(); return false; }
      sfx('shop.buy', { id: r.id, mueble: true });
      say('¡' + name + ' va a tu cuarto (H)! ' + (THANKS[S.id] || '¡Gracias, joven, vuelva pronto!'));
    } else {
      I.take('sencillo', r.precio);
      var left = I.add(r.id, r.n);
      if (left > 0) {   // mochila llena: se devuelve la plata (y lo que sí entró)
        if (left < r.n) I.take(r.id, r.n - left);
        I.add('sencillo', r.precio);
        say('Tu mochila está llena, joven.', 'no'); sfx('shop.nomoney'); refresh(); return false;
      }
      sfx('shop.buy', { id: r.id });
      say((THANKS[S.id] || '¡Gracias, joven, vuelva pronto!') + ' (' + (r.n > 1 ? r.n + ' ' : '') + name.toLowerCase() + ' en la mochila)');
    }
    if (I.sync) { var G = getG(); if (G) { try { I.sync(G); } catch (e2) { /* nada */ } } }
    refresh();
    return true;
  }

  /* ---------------- Pausa: el juego se congela mientras ACH.inv.isOpen() ---------------- */
  var origIsOpen = null;
  function wrapIsOpen() {
    var I = inv(); if (!I || !I.isOpen || I.isOpen._tienda) return;
    var prev = I.isOpen; origIsOpen = origIsOpen || prev;
    I.isOpen = function () { return S.open || prev.apply(this, arguments); };
    I.isOpen._tienda = true;
  }
  wrapIsOpen();

  /* ---------------- Teclado (captura: antes que input.js, la pausa y el resto) ---------------- */
  var DIG = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8,
    Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad7: 6, Numpad8: 7, Numpad9: 8 };
  function cols() { return S.el && S.el.classList.contains('dos') && S.list && S.list.clientWidth > 360 ? 2 : 1; }
  function onKey(e) {
    if (!S.open) return;
    var c = e.code || e.key, stop = true, k = cols();
    if (DIG[c] !== undefined) { if (!e.repeat) buy(DIG[c]); }
    else if (c === 'Escape' || c === 'KeyE') { if (!e.repeat) close(); }
    else if (c === 'ArrowDown' || c === 'KeyS') select(S.sel + k);
    else if (c === 'ArrowUp' || c === 'KeyW') select(S.sel - k);
    else if (c === 'ArrowRight' || c === 'KeyD') select(S.sel + 1);
    else if (c === 'ArrowLeft' || c === 'KeyA') select(S.sel - 1);
    else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyF') { if (!e.repeat) buy(S.sel); }
    else if (c === 'PageDown') select(S.sel + 4 * k);
    else if (c === 'PageUp') select(S.sel - 4 * k);
    else stop = !/^(F\d+|MetaLeft|MetaRight|ControlLeft|ControlRight|AltLeft|AltRight)$/.test(c);   // todo lo demás no llega al juego
    if (stop) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', function (e) { if (S.open) e.stopImmediatePropagation(); }, true);
  // si el juego sale de 'playing' (muerte, cinemática, otro nivel) la tienda se cierra sola
  setInterval(function () {
    if (!S.open) return;
    var G = getG(); if (G && G.state !== 'playing' && G.state !== 'paused') close(true);
  }, 300);

  ACH.tienda = {
    open: open, close: close, isOpen: isOpen, buy: buy,
    // arreglos v0.11: la línea de presentación del vendedor va DENTRO del panel (en el lugar de la frase), no en un globo encima
    line: function (text, who) { if (!S.open || !S.frase || !text) return false; S.frase.textContent = (who ? who + ': ' : '') + '«' + text + '»'; S.frase.classList.add('intro'); return true; },
    vendor: function () { return S.open ? S.id : null; },
    rows: function () { return S.rows.map(function (r) { return { id: r.id, precio: r.precio, n: r.n, mueble: !!furn(r.id), name: itemName(r.id) }; }); },
    nomoney: nomoney
  };

  /* ---------------- Debug ---------------- */
  var D = ACH.debug = ACH.debug || {}, V = D.v011 = D.v011 || {};
  V.tienda = function (id) {
    if (id === false) { close(); return { open: false }; }
    id = id || 'cachinero';
    if (!data(id)) return { error: 'vendedores: ' + Object.keys(ACH.VENDEDORES_DATA || {}).join(', ') };
    var G = getG(); if (G && G.state !== 'playing' && D.start) { try { D.start(); } catch (e) { /* nada */ } }
    var ok = open(id);
    return { open: ok, vendor: id, coins: coins(), rows: ACH.tienda.rows() };
  };
  V.comprar = function (i) { return buy(i); };
})();
