/* ACHORADO — js/cine/cima.js → ACH.cima
   Motor de la cima del cerro: cinemática de 18 s (4 tomas) y mapa de distritos. Ver CIMA.md.
     ACH.cima.play({parent, onChoose(id), onDone(), skipIntro, t, freeze, unlock})   cinemática + mapa
     ACH.cima.showMap(opts)  mapa directo (v0.11: opts.desdePausa + opts.here → Callao escogible: [LA GAMBETTA] [EL CERRO]; onChoose(id) === false deja el mapa abierto) · close() · progress() · markVisited(id) · ORDEN · debug{unlockAll, reset, at, freeze, state}
   Dibuja con ACH.cine (arte) y suena con ACH.audio.himno (música); si faltan usa reemplazos y silencio.
   Todo el estado de la línea de tiempo sale de curT(); render(t) solo depende de t (por eso ?t= y ?freeze=1 sirven para capturas). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var KEY = 'achorado.distritos.v1';
  var W = 960, H = 540;
  var ORDEN = ['miraflores', 'barranco', 'chorrillos', 'surquillo', 'san-isidro', 'lince', 'magdalena', 'san-miguel', 'jesus-maria', 'pueblo-libre', 'brena', 'la-victoria', 'cercado', 'rimac'];
  var NAMES = {
    callao: 'Callao', 'san-miguel': 'San Miguel', magdalena: 'Magdalena', 'pueblo-libre': 'Pueblo Libre', 'jesus-maria': 'Jesús María', lince: 'Lince',
    'san-isidro': 'San Isidro', miraflores: 'Miraflores', barranco: 'Barranco', chorrillos: 'Chorrillos', surquillo: 'Surquillo', 'la-victoria': 'La Victoria',
    brena: 'Breña', cercado: 'Cercado de Lima', rimac: 'Rímac', 'san-cristobal': 'San Cristóbal', 'morro-solar': 'Morro Solar', 'san-lorenzo': 'Isla San Lorenzo'
  };
  var SHORT = { cercado: 'Cercado', 'pueblo-libre': 'P. Libre', 'jesus-maria': 'Jesús María', 'la-victoria': 'La Victoria' };
  var DESC = {
    miraflores: 'Distrito pituco. Dicen que ahí está la cura.',
    barranco: 'Casonas, bohemios y un puente con leyenda.',
    chorrillos: 'Allá abajo, el Morro Solar vigila a todos.'
  };
  var ADJ = { miraflores: [10, 9] };   // ajuste de la etiqueta HTML del mapa por id (px lógicos), para no tapar los íconos que dibuja el arte
  var NIVELES = { miraflores: ['miraflores', 'costaverde'], barranco: ['barranco'] };   // v0.10: distritos con nivel jugable (los demás desbloqueados dicen «Próximamente»); v0.12: lista de niveles (onChoose(id) con cada uno)
  // v0.12: distrito con varios niveles: el siguiente de ORDEN se abre recién al ganar el último (Miraflores → Costa Verde → Barranco y Chorrillos)
  var ULTIMO = { miraflores: 'costaverde', barranco: 'barranco' }, TRAS = { costaverde: ['barranco'], barranco: ['chorrillos'] };   // BARRANCO.md §7.3: Costa Verde abre Barranco; Chorrillos se abre recién al ganar Barranco
  var LVLABEL = { miraflores: 'PARQUE KENNEDY', costaverde: 'COSTA VERDE' };
  var SEEN_KEY = 'achorado.cima.vista';   // v0.10: la primera vez la cinemática no se puede saltar
  var seenMem = false;
  function seen() { if (seenMem) return true; try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { seenMem = true; try { window.localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* en memoria */ } }
  var WARN = ['Ahí todavía no, causa.', 'Primero lo primero, compare.', 'Tranquilo, que Lima no se acaba hoy.'];

  /* ---- tiempos de la línea de tiempo ---- */
  var T = { t2: 3, t3: 9, flash: 16.5, flashPeak: 16.75, end: 18, fade: 0.15, cps: 28 };
  var BAR = 54;   // alto de las bandas de cine
  var THOUGHTS = [
    { t: 9.3, end: 12.0, text: 'Creo que escuché que en un distrito pituco... hay una cura.', cls: '' },
    { t: 12.0, end: 13.5, text: 'MIRAFLORES.', cls: 'big' },
    { t: 13.5, end: 16.5, text: 'Aguanta, Lima. Ahí voy, causa.', cls: '' }
  ];

  /* ---------- utilidades ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ramp(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eio(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function warn(msg, e) { try { console.warn('[cima] ' + msg, e || ''); } catch (x) { /* nada */ } }
  function nameOf(id) { return NAMES[id] || String(id).replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function pip(poly, x, y) {
    var ins = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  function centroid(poly) { var x = 0, y = 0; for (var i = 0; i < poly.length; i++) { x += poly[i][0]; y += poly[i][1]; } return [x / poly.length, y / poly.length]; }

  /* ---------- progreso (localStorage con try/catch; sin almacenamiento, en memoria) ---------- */
  var mem = null, forceAll = false;
  function validId(id) { return ORDEN.indexOf(id) >= 0; }
  function load() {
    if (mem) return mem;
    var d = null;
    try { var s = window.localStorage.getItem(KEY); if (s) d = JSON.parse(s); } catch (e) { d = null; }
    mem = { visited: [], unlocked: ['miraflores'] };
    if (d && typeof d === 'object') {
      if (Array.isArray(d.visited)) mem.visited = d.visited.filter(validId);
      if (Array.isArray(d.unlocked)) d.unlocked.forEach(function (id) { if (validId(id) && mem.unlocked.indexOf(id) < 0) mem.unlocked.push(id); });
    }
    mem.visited.forEach(function (id) { if (mem.unlocked.indexOf(id) < 0) mem.unlocked.push(id); });
    return mem;
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* sin almacenamiento: queda en memoria */ } }
  // v0.12: lo que dice ACH.viaje.progress() (va en el #hash de cada viaje) manda sobre lo guardado: Miraflores ganado = visitado; Costa Verde = Barranco y Chorrillos
  function derive(m) {
    var p = vprog(), ch = false;
    function add(a, id) { if (validId(id) && a.indexOf(id) < 0) { a.push(id); ch = true; } }
    if (p.miraflores || p.costaverde) { add(m.visited, 'miraflores'); add(m.unlocked, 'miraflores'); }
    if (p.barranco) { add(m.visited, 'barranco'); add(m.unlocked, 'barranco'); }   // BARRANCO.md: ganar Barranco lo marca visitado
    for (var lv in TRAS) if (p[lv]) TRAS[lv].forEach(function (id) { add(m.unlocked, id); });
    return ch;
  }
  function progress(raw) { var m = load(); if (derive(m)) save(); return { visited: m.visited.slice(), unlocked: (forceAll && !raw) ? ORDEN.slice() : m.unlocked.slice() }; }
  // v0.12: une el progreso que llegó por ACH.viaje (sin almacenamiento, el #hash es lo único que sobrevive al salto de página)
  function merge(d) {
    if (!d || typeof d !== 'object') return progress();
    var m = load();
    (Array.isArray(d.visited) ? d.visited : []).forEach(function (id) { if (validId(id) && m.visited.indexOf(id) < 0) m.visited.push(id); if (validId(id) && m.unlocked.indexOf(id) < 0) m.unlocked.push(id); });
    (Array.isArray(d.unlocked) ? d.unlocked : []).forEach(function (id) { if (validId(id) && m.unlocked.indexOf(id) < 0) m.unlocked.push(id); });
    derive(m); save(); if (L) refreshMapUI();
    return progress();
  }
  function complete(id) { var lv = ULTIMO[id]; return lv ? !!vprog()[lv] : load().visited.indexOf(id) >= 0; }
  function markVisited(id) {
    var m = load();
    if (!validId(id)) return progress();
    if (m.visited.indexOf(id) < 0) m.visited.push(id);
    if (m.unlocked.indexOf(id) < 0) m.unlocked.push(id);
    var nx = ORDEN[ORDEN.indexOf(id) + 1];
    if (nx && m.unlocked.indexOf(nx) < 0 && (!ULTIMO[id] || vprog()[ULTIMO[id]])) m.unlocked.push(nx);
    derive(m); save();
    if (L) refreshMapUI();
    return progress();
  }
  // v0.11: desde la pausa (opts.desdePausa) el Callao se puede escoger (La Gambetta / El Cerro) y Miraflores pide haber vencido el Cerro.
  function vprog() { try { return (ACH.viaje && ACH.viaje.progress) ? ACH.viaje.progress() || {} : {}; } catch (e) { return {}; } }
  function pausaMode() { return !!(L && L.opts && L.opts.desdePausa); }
  function here() { return (L && L.opts && L.opts.here) || null; }
  function callaoLv() { var p = vprog(), g = !!(p.gambetta || p.cerro || p.miraflores), h = here(); return { gambetta: g || h === 'gambetta', cerro: g || !!p.cerro || h === 'cerro' }; }
  function callaoOn() { if (!pausaMode()) return false; var c = callaoLv(); return c.gambetta || c.cerro; }
  function stateOf(id) {
    if (id === 'callao') return 'home';
    var m = load(); derive(m);
    if (id === 'miraflores' && pausaMode()) { var pp = vprog(); if (!(pp.cerro || pp.miraflores || here() === 'miraflores' || here() === 'costaverde')) return 'locked'; }
    if (m.visited.indexOf(id) >= 0) return 'visited';
    if (forceAll || m.unlocked.indexOf(id) >= 0) return 'open';
    return 'locked';
  }

  /* ---------- reemplazos del arte (se usan solo si falta ACH.cine o parte de él) ---------- */
  function poly(x0, y0, x1, y1, seed) {
    var h = hash(seed), j = function (n) { return ((h >> (n * 3)) & 7) - 3; };
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return [[x0 + 4 + j(0), y0 + j(1)], [mx + j(2), y0 - 3 + j(3)], [x1 + j(4), y0 + 5 + j(5)], [x1 - 3 + j(6), y1 + j(7)], [mx + j(1), y1 + 3 + j(2)], [x0 + j(3), y1 - 4 + j(4)]];
  }
  var FB_RECT = {
    'san-miguel': [250, 160, 340, 225], magdalena: [260, 228, 350, 288], 'pueblo-libre': [354, 228, 444, 288], 'san-isidro': [270, 291, 352, 348],
    'jesus-maria': [356, 291, 444, 348], lince: [448, 291, 536, 348], 'la-victoria': [540, 262, 640, 348], brena: [450, 170, 540, 288],
    cercado: [500, 90, 612, 166], rimac: [512, 20, 622, 86], miraflores: [285, 351, 385, 414], surquillo: [389, 351, 479, 414],
    barranco: [300, 418, 392, 472], chorrillos: [320, 476, 432, 534], callao: [110, 36, 296, 156]
  };
  var FB = (function () {
    var districts = {};
    Object.keys(FB_RECT).forEach(function (id) {
      var r = FB_RECT[id], p = poly(r[0], r[1], r[2], r[3], id);
      districts[id] = { name: nameOf(id), poly: p, label: centroid(p).map(Math.round) };
    });
    var fb = {
      W: W, H: H, fallback: true,
      pano: {
        w: 2400,
        labels: [
          { id: 'rimac', x: 160, y: 300 }, { id: 'cercado', x: 400, y: 330 }, { id: 'brena', x: 640, y: 350 }, { id: 'pueblo-libre', x: 840, y: 340 },
          { id: 'jesus-maria', x: 1040, y: 330 }, { id: 'lince', x: 1250, y: 340 }, { id: 'san-isidro', x: 1480, y: 300 }, { id: 'miraflores', x: 1760, y: 280 },
          { id: 'barranco', x: 1960, y: 320 }, { id: 'chorrillos', x: 2170, y: 340 }
        ],
        cure: { x: 1760, y: 140 }
      },
      ready: function () { },
      drawBack: function (ctx, t, climb) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8d8b93'); g.addColorStop(1, '#4b4a52'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#34323a'; ctx.fillRect(0, 440, W, 100);
        ctx.fillStyle = '#26242b'; ctx.fillRect(400, 540 - 40 - 220 * (.8 + .2 * climb), 120, 220 * (.8 + .2 * climb));   // Alexander (reemplazo)
        ctx.fillStyle = '#c9c5cf'; ctx.font = '16px monospace'; ctx.fillText('[reemplazo] TOMA 1 — LA CIMA  climb=' + climb.toFixed(2), 24, 90);
      },
      drawPano: function (ctx, camX, t) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8d8b93'); g.addColorStop(.6, '#6c6b74'); g.addColorStop(1, '#3d3c44'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#585660';
        for (var k = 0; k < 14; k++) { var bx = k * 220 - camX * .35; ctx.fillRect(bx % 3000, 250 - (k % 3) * 25, 160, 120); }
        fb.pano.labels.forEach(function (l, i) { ctx.fillStyle = i % 2 ? '#4a4952' : '#3f3e46'; ctx.fillRect(l.x - camX - 90, l.y + 4, 180, 240); });
        var cx = fb.pano.cure.x - camX, on = Math.floor(t * 2.5) % 2 === 0;
        ctx.fillStyle = '#2a2830'; ctx.fillRect(cx - 5, fb.pano.cure.y, 10, 150); if (on) { ctx.fillStyle = '#1fe07a'; ctx.beginPath(); ctx.arc(cx, fb.pano.cure.y, 7, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#2a2830'; ctx.fillRect(0, 470, W, 70);
        ctx.fillStyle = '#c9c5cf'; ctx.font = '16px monospace'; ctx.fillText('[reemplazo] TOMA 2 — EL PANORAMA  camX=' + Math.round(camX), 24, 90);
      },
      drawHero: function (ctx, t, s) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9a98a2'); g.addColorStop(1, '#5a5962'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (s.ray > 0) { ctx.fillStyle = 'rgba(255,240,170,' + (.35 * s.ray) + ')'; ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(300, 0); ctx.lineTo(560, 540); ctx.lineTo(420, 540); ctx.fill(); }
        var k = 1 + .08 * s.push;
        ctx.save(); ctx.translate(480, 330); ctx.scale(k, k);
        ctx.fillStyle = '#7a4e38'; ctx.beginPath(); ctx.ellipse(0, -20, 110, 140, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#16141a'; ctx.fillRect(-110, -170, 220, 60);
        ctx.fillStyle = '#fff'; ctx.fillRect(-70, -50, 40, s.eyes === 'blink' ? 4 : 18); ctx.fillRect(30, -50, 40, s.eyes === 'blink' ? 4 : 18);
        ctx.fillStyle = '#3a2418'; ctx.fillRect(-40, 40, 80, s.mouth === 'serious' ? 6 : 14);
        ctx.restore();
        ctx.fillStyle = '#9aa3a0'; ctx.fillRect(690, 250 - (s.titina === 'puff' ? 8 : 0), 48, 40);   // Titina
        if (s.bag > 0) { ctx.fillStyle = '#ddd'; ctx.fillRect(960 - s.bag * 1100, 120 + Math.sin(t * 6) * 20, 46, 36); }
        if (s.drop > 0 && s.drop < 1) { ctx.fillStyle = '#9ad'; ctx.fillRect(472, 140 + s.drop * 180, 6, 12); }
        ctx.fillStyle = '#c9c5cf'; ctx.font = '16px monospace'; ctx.fillText('[reemplazo] TOMA 3 — EL HÉROE  push=' + s.push.toFixed(2) + ' eyes=' + s.eyes + ' mouth=' + s.mouth + ' titina=' + s.titina, 24, 90);
      },
      map: { districts: districts, start: [200, 130] },
      drawMap: function (ctx, t, states, hoverId) {
        var D = fb.map.districts, st = fb.map.start, pulse = .5 + .5 * Math.sin(t * 4);
        ctx.fillStyle = '#131015'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#0c3347'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(230, 0); ctx.lineTo(230, 200); ctx.lineTo(290, 330); ctx.lineTo(300, 540); ctx.lineTo(0, 540); ctx.fill();
        ctx.strokeStyle = '#1b6a8a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#1b6a8a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(560, 0); ctx.bezierCurveTo(520, 100, 400, 160, 232, 190); ctx.stroke();
        var open = null;
        Object.keys(D).forEach(function (id) {
          var s = id === 'callao' ? 'visited' : (states[id] || 'locked'), p = D[id].poly;
          ctx.beginPath(); p.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath();
          ctx.fillStyle = s === 'open' ? (pulse > .5 ? '#ffe500' : '#e6cf00') : s === 'visited' ? '#1fa860' : '#2a2630'; ctx.fill();
          ctx.lineWidth = id === hoverId ? 5 : 3; ctx.strokeStyle = s === 'open' ? '#ff2e88' : s === 'visited' ? '#1fe07a' : '#4a4452'; ctx.stroke();
          if (s === 'open' && !open) open = id;
        });
        var tg = D[hoverId] ? hoverId : open;
        if (tg) { ctx.strokeStyle = '#ffe500'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.moveTo(st[0], st[1]); var lb = D[tg].label; ctx.lineTo(lb[0], lb[1]); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = '#2b6ab0'; ctx.fillRect(st[0] - 8, st[1] - 22, 16, 24); ctx.fillStyle = '#9aa3a0'; ctx.fillRect(st[0] + 8, st[1] - 24, 10, 8);
      }
    };
    return fb;
  })();

  /* ---------- acceso al arte (con reemplazo por método y por datos, y sin romper si algo lanza) ---------- */
  var bad = {};
  function artCall(name, a, b, c) {
    var A = ACH.cine, fn = A && typeof A[name] === 'function' ? A[name] : null;
    if (fn && !bad[name]) {
      try { return fn.call(A, a, b, c); } catch (e) { bad[name] = 1; warn('ACH.cine.' + name + ' lanzó un error; uso el reemplazo', e); }
    }
    return FB[name](a, b, c);
  }
  function pano() { var A = ACH.cine; return (A && A.pano && A.pano.w && Array.isArray(A.pano.labels) && !bad.pano) ? A.pano : FB.pano; }
  function mapData() { var A = ACH.cine; return (A && A.map && A.map.districts && A.map.start && !bad.drawMap) ? A.map : FB.map; }
  function readyArt() { try { if (ACH.cine && ACH.cine.ready) ACH.cine.ready(); } catch (e) { bad.drawMap = bad.drawPano = bad.drawHero = bad.drawBack = 1; warn('ACH.cine.ready falló; uso reemplazos', e); } }

  /* ---------- audio ---------- */
  var ownCtx = null;
  function himno() { var A = ACH.audio; return A && A.himno ? A.himno : null; }
  function hm(fn, a) { try { var h = himno(); if (h && typeof h[fn] === 'function') return h[fn](a); } catch (e) { warn('himno.' + fn + ' falló', e); } }
  function actx() { var A = ACH.audio; return (A && A.ctx) || ownCtx; }
  function ensureAudio() {   // solo dentro de un gesto del usuario
    try {
      hm('unlock');
      var A = ACH.audio;
      if (!(A && A.ctx) && !ownCtx) { var C = window.AudioContext || window.webkitAudioContext; if (C) ownCtx = new C(); }
      var c = actx(); if (c && c.state === 'suspended') c.resume();
    } catch (e) { /* sin audio */ }
  }
  function sfxOut(c) { var A = ACH.audio; return (A && A.bus && A.bus.sfx) || c.destination; }
  function tunc() {
    var c = actx(); if (!c || c.state !== 'running') return;
    try {
      var t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(170, t0); o.frequency.exponentialRampToValueAtTime(52, t0 + .16);
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.5, t0 + .008); g.gain.exponentialRampToValueAtTime(.0001, t0 + .2);
      o.connect(g); g.connect(sfxOut(c)); o.start(t0); o.stop(t0 + .22);
      var o2 = c.createOscillator(), g2 = c.createGain(); o2.type = 'square'; o2.frequency.setValueAtTime(95, t0);
      g2.gain.setValueAtTime(.12, t0); g2.gain.exponentialRampToValueAtTime(.0001, t0 + .05); o2.connect(g2); g2.connect(sfxOut(c)); o2.start(t0); o2.stop(t0 + .06);
    } catch (e) { /* nada */ }
  }
  function tick() {
    var c = actx(); if (!c || c.state !== 'running') return;
    try {
      var t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = 1250 + Math.random() * 300;
      g.gain.setValueAtTime(.02, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .022);
      o.connect(g); g.connect(sfxOut(c)); o.start(t0); o.stop(t0 + .03);
    } catch (e) { /* nada */ }
  }

  /* ---------- instancia viva ---------- */
  var L = null;

  function el(tag, cls, parent, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function sty(e, prop, v) { var c = e._c || (e._c = {}); if (c[prop] === v) return; c[prop] = v; e.style[prop] = v; }
  function cls(e, name, on) { var c = e._k || (e._k = {}); on = !!on; if (c[name] === on) return; c[name] = on; e.classList.toggle(name, on); }

  function build(opts) {
    var parent = opts.parent || document.getElementById('stage') || document.body;
    var root = el('div', 'cm-root', null);
    root.innerHTML =
      '<div class="cm-stage">' +
      '<canvas class="cm-cv" width="960" height="540"></canvas>' +
      '<div class="cm-layer cm-cine">' +
      '<div class="cm-labs"></div>' +
      '<div class="cm-bar t"></div><div class="cm-bar b"></div>' +
      '<div class="cm-thinks"></div><div class="cm-grru">¡Grrú!</div>' +
      '</div>' +
      '<div class="cm-layer cm-mapui"><div class="cm-dns"></div><div class="cm-warn"></div>' +
      '<div class="cm-mhint"></div></div>' +
      '<h1 class="cm-title">¿A DÓNDE, CAUSA?</h1>' +
      '<div class="cm-fade"></div><div class="cm-flash"></div>' +
      '<div class="cm-skip"><b>ENTER</b> / CLIC PARA SALTAR</div>' +
      '<button type="button" class="cm-back" data-ui>◀ VOLVER</button>' +
      '<div class="cm-dim"><div class="cm-card"><p class="kick">DISTRITO</p><h2></h2><p class="desc"></p>' +
      '<div class="cm-btns"></div></div></div>' +
      '<div class="cm-rotate">Gira el teléfono<br>(horizontal, causa)</div>' +
      '</div>';
    parent.appendChild(root);
    var q = function (s) { return root.querySelector(s); };
    var I = {
      opts: opts, root: root, stage: q('.cm-stage'), cv: q('.cm-cv'), labs: q('.cm-labs'), barT: q('.cm-bar.t'), barB: q('.cm-bar.b'),
      thinks: q('.cm-thinks'), grru: q('.cm-grru'), cine: q('.cm-cine'), mapui: q('.cm-mapui'), dns: q('.cm-dns'), warn: q('.cm-warn'), mhint: q('.cm-mhint'),
      title: q('.cm-title'), fade: q('.cm-fade'), flash: q('.cm-flash'), skip: q('.cm-skip'), dim: q('.cm-dim'), card: q('.cm-card'),
      back: q('.cm-back'), cardH: q('.cm-card h2'), cardP: q('.cm-card .desc'), btns: q('.cm-btns'), acts: [],
      ctx: null, S: 1, mode: 'cine', sel: null, cardId: null, cardFocus: 0, shakeId: null, shakeT0: 0, lastWarn: -1, ls: [],
      frozen: false, ft: 0, clk: { base: 0, p0: 0 }, useAudio: false, src: 'wait', lastA: -1, lastAch: 0, mb: 0, mp: 0,
      th: [], labels: [], dn: {}, born: performance.now(), skipFx: null, raf: 0, alive: true, lastN: [0, 0, 0], p: null, dists: null
    };
    I.ctx = I.cv.getContext('2d'); I.ctx.imageSmoothingEnabled = false;
    I.touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (I.touch) I.skip.innerHTML = 'TOCA PARA SALTAR';
    // v0.10: la primera vez no se puede saltar (cinemática importante); después sí. opts.skippable fuerza uno u otro (QA).
    I.skippable = opts.skippable != null ? !!opts.skippable : seen();
    return I;
  }

  function listen(target, type, fn, opt) { target.addEventListener(type, fn, opt); L.ls.push([target, type, fn, opt]); }

  function layout() {
    if (!L) return;
    var w = window.innerWidth || document.documentElement.clientWidth, h = window.innerHeight || document.documentElement.clientHeight;
    var s = Math.min(w / W, h / H);
    L.S = s;
    L.root.style.setProperty('--cs', s);
    L.stage.style.left = Math.round((w - W * s) / 2) + 'px';
    L.stage.style.top = Math.round((h - H * s) / 2) + 'px';
    cls(L.root, 'portrait', L.touch && h > w * 1.1);
  }

  /* ---- DOM de etiquetas, pensamientos y mapa ---- */
  function setupCine() {
    var P = L.p = pano();
    L.mapD = mapData(); L.dists = L.mapD.districts;
    L.labs.innerHTML = '';
    L.labels = P.labels.map(function (lb) {
      var d = el('div', 'cm-lab', L.labs, '<div class="cm-labtag">' + nameOf(lb.id).toUpperCase() + '</div>');
      d.firstChild.style.setProperty('--r', ((hash(lb.id) % 5) - 2) + 'deg');
      if (lb.id === 'miraflores') d.classList.add('hot');
      return { id: lb.id, x: lb.x, y: lb.y, e: d, seen: false };
    });
    L.thinks.innerHTML = '';
    L.th = THOUGHTS.map(function (th) {
      var d = el('div', 'cm-think' + (th.cls ? ' ' + th.cls : ''), L.thinks, '<span></span><i></i>');
      return { e: d, a: d.firstChild, b: d.lastChild, n: -1 };
    });
    var cm = null;
    L.labels.forEach(function (l) { if (l.id === 'miraflores') cm = l; });
    var target = cm ? cm.x : (P.cure ? P.cure.x : P.w / 2);
    L.camEnd = clamp(target - .58 * W, 0, Math.max(0, P.w - W));
  }

  function setupMap() {
    var M = L.mapD = mapData();
    L.dists = M.districts;
    L.dns.innerHTML = '';
    L.dn = {};
    Object.keys(L.dists).forEach(function (id) {
      var d = L.dists[id], lb = d.label || centroid(d.poly), aj = ADJ[id] || [0, 0]; lb = [lb[0] + aj[0], lb[1] + aj[1]];
      var e = el('div', 'cm-dn', L.dns, '<div class="cm-dname"></div>');
      e.style.transform = 'translate(' + Math.round(lb[0]) + 'px,' + Math.round(lb[1]) + 'px)';
      e.firstChild.style.setProperty('--r', ((hash(id) % 5) - 2) + 'deg');
      e.firstChild.textContent = (id === 'callao' ? 'CALLAO' : (SHORT[id] || d.name || nameOf(id))).toUpperCase();
      if (id === 'callao') e.classList.add('home');
      L.dn[id] = e;
    });
    var first = null;
    ORDEN.forEach(function (id) { if (!first && L.dists[id] && stateOf(id) === 'open') first = id; });
    if (!first) ORDEN.forEach(function (id) { if (!first && L.dists[id] && stateOf(id) !== 'locked') first = id; });
    if (callaoOn() && L.dists.callao && (!first || here() === 'gambetta' || here() === 'cerro')) first = 'callao';   // v0.11: desde la pausa, en el Callao arranca en el Callao
    if (L.sel == null || !L.dists[L.sel]) L.sel = first || (L.dists.miraflores ? 'miraflores' : null);
    L.mhint.innerHTML = L.touch ? 'TOCA UN DISTRITO' : '<b>FLECHAS</b> / <b>WASD</b> moverse &nbsp; <b>ENTER</b> escoger &nbsp; o clic';
    refreshMapUI();
  }

  function statesObj() {
    var s = {};
    Object.keys(L.dists).forEach(function (id) { if (id !== 'callao') s[id] = stateOf(id); });   // el arte dibuja Callao siempre como «casa»
    return s;
  }
  function refreshMapUI() {
    if (!L || !L.dists) return;
    Object.keys(L.dn).forEach(function (id) {
      var e = L.dn[id], s = stateOf(id);
      if (e.getAttribute('data-s') !== s) e.setAttribute('data-s', s);
      cls(e, 'sel', L.sel === id && selectable(id));
      if (id === 'callao') cls(e, 'on', callaoOn());
      if (id !== 'callao' && NIVELES[id]) {   // v0.12: ✓ en el nombre cuando ya se ganaron todos sus niveles
        var dn = e.firstChild, ok = s === 'visited' && complete(id), base = (SHORT[id] || (L.dists[id] && L.dists[id].name) || nameOf(id)).toUpperCase();
        if (dn && dn.textContent !== (ok ? base + ' ✓' : base)) dn.textContent = ok ? base + ' ✓' : base;
        cls(e, 'done', ok);
      }
    });
  }
  function selectable(id) { return (id !== 'callao' || callaoOn()) && !!L.dists[id]; }
  function centerOf(id) { var d = L.dists[id]; return d.label || centroid(d.poly); }

  /* ---- reloj ---- */
  function curT() {
    if (L.frozen) return L.ft;
    var now = performance.now();
    if (L.mode !== 'cine') return L.mb + (now - L.mp) / 1000;
    if (L.useAudio) {   // reloj de la música solo si suena de verdad (playing() y t() >= 0); si no, performance.now() sin saltos hacia atrás
      var a = -1, h = himno(), ok = false;
      try {
        if (h && typeof h.t === 'function') { a = h.t(); ok = typeof a === 'number' && isFinite(a) && a >= 0 && (typeof h.playing === 'function' ? !!h.playing() : a > .02); }
      } catch (e) { ok = false; }
      if (L.src === 'audio') {
        if (ok) { L.clk.base = a; L.clk.p0 = now; L.lastA = a; return a; }
        L.src = 'perf';   // el audio se paró: sigue con el reloj normal desde donde iba
      } else if (L.src === 'wait') {
        if (ok) { L.src = 'audio'; L.clk.base = a; L.clk.p0 = now; return a; }
        if (now - L.born > 600) L.src = 'perf';   // el navegador bloqueó el audio: no se espera más (y si se desbloquea tarde, la música queda fuera de sincronía)
      }
    }
    return L.clk.base + (now - L.clk.p0) / 1000;
  }
  function rebase(t) {
    var now = performance.now();
    L.clk.base = t; L.clk.p0 = now; L.mb = t; L.mp = now; L.ft = t;
  }

  /* ---- fotograma ---- */
  function titinaPos(push) {   // sobre la cabeza de Titina (960×540): el arte da titinaPosAt(push) o titinaPos
    var A = ACH.cine;
    try { if (A && typeof A.titinaPosAt === 'function') { var q = A.titinaPosAt(push); if (q && typeof q.x === 'number') return q; } } catch (e) { /* nada */ }
    return (A && A.titinaPos && typeof A.titinaPos.x === 'number') ? A.titinaPos : { x: 420, y: 272 };
  }

  function renderCine(t) {
    var ctx = L.ctx, sc = t < T.t2 ? 1 : t < T.t3 ? 2 : t < T.flashPeak ? 3 : 4;
    if (sc === 1) {
      artCall('drawBack', ctx, t, eio(ramp(t, .2, 2.4)));
    } else if (sc === 2) {
      L.camX = L.camEnd * eio(ramp(t, T.t2, T.t3));
      artCall('drawPano', ctx, L.camX, t);
    } else if (sc === 3) {
      var s = {
        push: ramp(t, 9, 16.5), eyes: 'heroic', mouth: 'serious', drop: ramp(t, 14.4, 14.8), bag: ramp(t, 13, 14.6),
        titina: t >= 15.6 ? 'look' : t >= 10 ? 'puff' : 'blink', ray: ramp(t, 9, 11)
      };
      if (t >= 14.8 && t < 15.3) { s.eyes = 'blink'; s.mouth = 'scrunch'; }
      else if (t >= 12 && t < 12.6) { s.eyes = 'wide'; s.mouth = 'smirk'; }
      else if ((t >= 12.6 && t < 13.5) || t >= 15.3) s.mouth = 'smirk';
      artCall('drawHero', ctx, t, s);
    } else {
      artCall('drawMap', ctx, t, statesObj(), L.sel);
    }
    var inT2 = sc === 2;

    /* bandas */
    var bh = BAR * eio(ramp(t, 0, .8)) * (1 - eio(ramp(t, T.flashPeak, T.flashPeak + .4)));
    sty(L.barT, 'height', bh.toFixed(1) + 'px'); sty(L.barB, 'height', bh.toFixed(1) + 'px');

    /* etiquetas del paneo */
    for (var i = 0; i < L.labels.length; i++) {
      var lb = L.labels[i], sx = lb.x - (L.camX || 0), vis = inT2 && t > T.t2 + .15 && sx > 70 && sx < W - 70;
      cls(lb.e, 'on', vis);
      if (inT2 || lb.e._c) sty(lb.e, 'transform', 'translate(' + Math.round(sx) + 'px,' + Math.round(lb.y) + 'px)');
    }

    /* pensamientos escritos letra a letra */
    for (var k = 0; k < THOUGHTS.length; k++) {
      var th = THOUGHTS[k], D = L.th[k], on = t >= th.t && t < th.end;
      if (!on) { sty(D.e, 'opacity', '0'); sty(D.e, 'visibility', 'hidden'); D.n = -1; continue; }
      var n = clamp(Math.floor((t - th.t) * T.cps) + 1, 0, th.text.length);
      if (n !== D.n) {
        if (D.n >= 0 && n > D.n && !L.frozen && n % 2 === 0 && L.mode === 'cine') tick();
        D.n = n; D.a.textContent = th.text.slice(0, n); D.b.textContent = th.text.slice(n);
      }
      sty(D.e, 'visibility', 'visible');
      var fo = clamp((th.end - t) / .25, 0, 1), fi = clamp((t - th.t) / .12, 0, 1);
      sty(D.e, 'opacity', Math.min(fo, fi).toFixed(2));
      if (th.cls === 'big') sty(D.e, 'transform', 'scale(' + (1 + .25 * (1 - eio(ramp(t, th.t, th.t + .25)))).toFixed(3) + ')');
    }

    /* ¡Grrú! */
    var tp = titinaPos(ramp(t, 9, 16.5)), gu = t >= 15.6 && t < 16.5;
    if (gu) {
      var pop = 1 + .35 * (1 - ramp(t, 15.6, 15.78)), op = ramp(t, 15.6, 15.66) * (1 - ramp(t, 16.25, 16.5));
      sty(L.grru, 'transform', 'translate(' + Math.round(tp.x) + 'px,' + Math.round(tp.y) + 'px) translate(-50%, -115%) rotate(-7deg) scale(' + pop.toFixed(3) + ')');
      sty(L.grru, 'opacity', op.toFixed(2));
    } else sty(L.grru, 'opacity', '0');

    /* fundido (negro entre tomas y al inicio) y destello */
    var fa = 1 - clamp(t / 1.0, 0, 1);
    fa = fa * fa;
    [T.t2, T.t3].forEach(function (b) { var d = Math.abs(t - b); if (d < T.fade) fa = Math.max(fa, 1 - d / T.fade); });
    var fl = t < T.flash ? 0 : t < T.flashPeak ? ramp(t, T.flash, T.flashPeak) : 1 - eio(ramp(t, T.flashPeak, T.flashPeak + .65));
    var sk = 0;
    if (L.skipFx) { var q = (performance.now() - L.skipFx.p0) / 200; if (L.skipFx.phase === 'out') sk = clamp(q, 0, 1); else sk = 1 - clamp(q, 0, 1); }
    sty(L.fade, 'opacity', Math.max(fa, sk).toFixed(3));
    sty(L.flash, 'opacity', fl.toFixed(3));

    /* título: grande al centro en el destello, luego arriba */
    cls(L.title, 'big', t >= 16.85 && t < 17.85);
    cls(L.title, 'top', t >= 17.85);
    cls(L.root, 'mapon', t >= 17.6);
    cls(L.skip, 'on', L.skippable && t > 1 && t < 17.9);
    if (L.dists) { /* las etiquetas del mapa se ven desde 17,6 s */ }
  }

  function renderMap(t) {
    artCall('drawMap', L.ctx, t, statesObj(), L.sel);
    /* un distrito bloqueado que tiembla: se vuelve a pintar su recorte con un desplazamiento y se resalta */
    if (L.shakeId && L.dists[L.shakeId]) {
      var el_ = (performance.now() - L.shakeT0) / 1000;
      if (el_ > .42) L.shakeId = null;
      else {
        var p = L.dists[L.shakeId].poly, ctx = L.ctx, amp = 5 * (1 - el_ / .42), dx = Math.round(Math.sin(el_ * 70) * amp), dy = Math.round(Math.cos(el_ * 53) * amp * .4);
        var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
        p.forEach(function (q) { minx = Math.min(minx, q[0]); miny = Math.min(miny, q[1]); maxx = Math.max(maxx, q[0]); maxy = Math.max(maxy, q[1]); });
        minx = Math.max(0, Math.floor(minx) - 6); miny = Math.max(0, Math.floor(miny) - 6); maxx = Math.min(W, Math.ceil(maxx) + 6); maxy = Math.min(H, Math.ceil(maxy) + 6);
        var bw = maxx - minx, bh = maxy - miny;
        if (bw > 0 && bh > 0) {
          var tmp = L.tmp || (L.tmp = document.createElement('canvas'));
          tmp.width = bw; tmp.height = bh; var tc = tmp.getContext('2d'); tc.drawImage(L.cv, minx, miny, bw, bh, 0, 0, bw, bh);
          ctx.save(); ctx.beginPath(); p.forEach(function (q, i) { i ? ctx.lineTo(q[0] + dx, q[1] + dy) : ctx.moveTo(q[0] + dx, q[1] + dy); }); ctx.closePath(); ctx.clip();
          ctx.drawImage(tmp, minx + dx, miny + dy); ctx.restore();
          ctx.beginPath(); p.forEach(function (q, i) { i ? ctx.lineTo(q[0] + dx, q[1] + dy) : ctx.moveTo(q[0] + dx, q[1] + dy); }); ctx.closePath();
          ctx.lineWidth = 3; ctx.strokeStyle = '#ff2e88'; ctx.stroke();
        }
      }
    }
    var sk = 0;
    if (L.skipFx) { var q2 = (performance.now() - L.skipFx.p0) / 200; sk = L.skipFx.phase === 'in' ? 1 - clamp(q2, 0, 1) : clamp(q2, 0, 1); if (L.skipFx.phase === 'in' && q2 >= 1) L.skipFx = null; }
    sty(L.fade, 'opacity', sk.toFixed(3)); sty(L.flash, 'opacity', '0');
  }

  function frame() {
    if (!L || !L.alive) return;
    L.raf = requestAnimationFrame(frame);
    var t = curT();
    if (L.mode === 'cine') {
      if (L.skipFx && L.skipFx.phase === 'out' && performance.now() - L.skipFx.p0 >= 200) { enterMap({ fromSkip: true }); renderMap(curT()); return; }
      if (t >= T.end) { enterMap({}); renderMap(curT()); return; }
      renderCine(t);
    } else renderMap(t);
  }

  /* ---- modos ---- */
  function hideCineUI() {
    sty(L.barT, 'height', '0px'); sty(L.barB, 'height', '0px');
    L.labels.forEach(function (l) { cls(l.e, 'on', false); });
    L.th.forEach(function (d) { sty(d.e, 'opacity', '0'); sty(d.e, 'visibility', 'hidden'); d.n = -1; });
    sty(L.grru, 'opacity', '0'); cls(L.skip, 'on', false); sty(L.flash, 'opacity', '0');
  }
  function enterMap(o) {
    o = o || {};
    var now = performance.now(), wasCine = L.mode === 'cine';
    if (o.fromSkip) { L.skipFx = { p0: now, phase: 'in' }; }
    else if (!wasCine) L.skipFx = null;
    if (wasCine && !o.fromSkip && !L.frozen) markSeen();
    var t0 = wasCine ? T.end : (o.t || 0);
    L.mode = 'map'; L.mb = t0; L.mp = now; L.ft = L.frozen ? (o.t != null ? o.t : t0) : L.ft;
    if (wasCine) { if (L.frozen && o.t == null) L.ft = Math.max(L.ft, T.end); }
    hideCineUI();
    setupMap();
    cls(L.root, 'mapon', true);
    cls(L.title, 'big', false); cls(L.title, 'top', true);
    L.cardId = null; cls(L.dim, 'on', false);
    if (!o.silent) hm('toMap', o.fromSkip ? .4 : (wasCine && L.audioStarted ? 1.2 : .05));
  }
  function backToCine(t) {
    L.mode = 'cine'; L.skipFx = null; L.cardId = null; cls(L.dim, 'on', false);
    cls(L.root, 'mapon', false); cls(L.title, 'top', false); cls(L.title, 'big', false);
    L.useAudio = false; rebase(t);
    if (!L.labels.length) setupCine();
  }

  function skipCine() {
    if (!L || L.mode !== 'cine' || L.skipFx || !L.skippable) return;
    if (performance.now() - L.born < 300) return;
    L.skipFx = { p0: performance.now(), phase: 'out' };
  }

  /* ---- mapa interactivo ---- */
  function hit(clientX, clientY) {
    var r = L.stage.getBoundingClientRect(), x = (clientX - r.left) / L.S, y = (clientY - r.top) / L.S, id, best = null, bd = 28;
    for (id in L.dists) if (selectable(id) && pip(L.dists[id].poly, x, y)) return id;
    for (id in L.dists) if (selectable(id)) { var c = centerOf(id), d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = id; } }
    return best;
  }
  function select(id) { if (L.sel === id) return; L.sel = id; refreshMapUI(); }
  function neighbor(dx, dy) {
    var cur = L.sel;
    if (!cur || !selectable(cur)) { var f = ORDEN.filter(function (i) { return L.dists[i] && stateOf(i) !== 'locked'; })[0]; if (f) select(f); return; }
    var c = centerOf(cur), best = null, bs = 1e9, id;
    for (id in L.dists) {
      if (id === cur || !selectable(id)) continue;
      var p = centerOf(id), ex = p[0] - c[0], ey = p[1] - c[1], along = dx * ex + dy * ey, perp = Math.abs(dx * ey - dy * ex);
      if (along < 6 || perp > along * 2) continue;   // solo dentro de un cono de ~63° hacia esa dirección
      var sc = along + 1.8 * perp;
      if (sc < bs) { bs = sc; best = id; }
    }
    if (best) select(best);
  }
  function showWarn() {
    var i; do { i = Math.floor(Math.random() * WARN.length); } while (i === L.lastWarn && WARN.length > 1);
    L.lastWarn = i;
    L.warn.textContent = WARN[i];
    L.warn.classList.remove('go'); void L.warn.offsetWidth; L.warn.classList.add('go');
  }
  function doShake(id) {
    L.shakeId = id; L.shakeT0 = performance.now();
    var e = L.dn[id]; if (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
    tunc(); showWarn();
  }
  function choose(id) {
    if (!L || L.mode !== 'map' || !id || !selectable(id)) return;
    select(id);
    var s = stateOf(id);
    if (s === 'locked') { doShake(id); return; }
    openCard(id, s);
  }
  // La tarjeta lleva una lista de botones: L.acts = [{b, fn}] (fn = elegir id o cerrar). v0.11: el Callao trae [LA GAMBETTA] [EL CERRO] [Todavía no].
  var LVNAME = { gambetta: 'LA GAMBETTA', cerro: 'EL CERRO' };
  function cardBtn(label, alt, off, fn) {
    var b = el('button', 'cm-btn' + (alt ? ' alt' : '') + (off ? ' off' : ''), L.btns, null);
    b.type = 'button'; b.tabIndex = -1; b.textContent = label; if (off) b.setAttribute('aria-disabled', 'true');
    var i = L.acts.length; L.acts.push({ b: b, fn: off ? null : fn });
    // v0.13 (F4): un botón apagado tiembla pero no se queda con el foco (si no, ENTER se quedaba atrapado en él)
    b.addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); if (!off) focusCard(i); runAct(i); b.blur(); });
    b.addEventListener('pointerenter', function () { if (!off) focusCard(i); });
  }
  function openCard(id, s) {
    L.mode = 'card'; L.cardId = id; L.cardFocus = 0; L.acts = []; L.btns.innerHTML = '';
    L.cardH.textContent = (id === 'callao' ? 'CALLAO' : (L.dists[id].name || nameOf(id))).toUpperCase();
    L.cardSoon = id !== 'callao' && !NIVELES[id];
    if (id === 'callao') {
      var c = callaoLv();
      L.cardP.textContent = 'Tu barrio. ¿A dónde vamos?';
      ['gambetta', 'cerro'].forEach(function (lv) { cardBtn(LVNAME[lv] + (here() === lv ? ' (AQUÍ)' : ''), false, !c[lv], function () { pick(lv); }); if (here() === lv) L.acts[L.acts.length - 1].here = true; });
      cardBtn('Todavía no', true, false, closeCard);
    } else if (L.cardSoon) {
      L.cardP.textContent = 'Todavía no llegamos hasta ahí, causa. (Próximamente)';
      cardBtn('OK', false, false, closeCard);
    } else if (Array.isArray(NIVELES[id]) && NIVELES[id].length > 1) {   // v0.12: Miraflores → [PARQUE KENNEDY] [COSTA VERDE] [Todavía no]
      var lvOn = levelsOn(id), isHere = NIVELES[id].indexOf(here()) >= 0;
      L.cardP.textContent = isHere ? 'Ya estás aquí, causa. ¿A cuál vamos?' : lvOn.costaverde === false ? 'Primero chápate a la picaronera del Kennedy, causa. Después bajamos al malecón.' :
        complete(id) ? 'Ya la hiciste aquí, causa. ¿Volvemos?' : s === 'visited' ? 'Ya pasaste por aquí, causa. ¿Volvemos?' : (DESC[id] || '');
      NIVELES[id].forEach(function (lv) {
        cardBtn((LVLABEL[lv] || lv.toUpperCase()) + (here() === lv ? ' (AQUÍ)' : ''), false, !lvOn[lv], function () { pick(lv); });
        if (here() === lv) L.acts[L.acts.length - 1].here = true;
      });
      cardBtn('Todavía no', true, false, closeCard);
    } else {
      L.cardP.textContent = here() === id ? 'Ya estás aquí, causa.' : s === 'visited' ? 'Ya pasaste por aquí, causa. ¿Volvemos?' : (DESC[id] || 'Un distrito más de Lima. Aquí también puede haber algo.');
      cardBtn('¡VAMOS!', false, false, function () { pick(id); });
      cardBtn('Todavía no', true, false, closeCard);
    }
    L.dim.classList.add('on'); L.card.style.animation = 'none'; void L.card.offsetWidth; L.card.style.animation = '';
    var f0 = 0; while (f0 < L.acts.length - 1 && (!L.acts[f0].fn || L.acts[f0].here)) f0++;   // el foco arranca en lo que se puede escoger
    focusCard(f0);
  }
  // v0.12: qué niveles de un distrito se pueden escoger (Costa Verde: con Miraflores ganado, o si ya llegaste o estás ahí)
  function levelsOn(id) {
    var o = {}, p = vprog(), h = here();
    (NIVELES[id] || []).forEach(function (lv, i) { o[lv] = forceAll || i === 0 || !!p[lv] || h === lv || !!p[NIVELES[id][i - 1]]; });
    return o;
  }
  function focusCard(i) {
    if (!L.acts || !L.acts.length) return;
    i = (i + L.acts.length) % L.acts.length; L.cardFocus = i;
    L.acts.forEach(function (a, k) { a.b.classList.toggle('f', k === i); });
  }
  function moveCard(d) { if (!L.acts) return; var n = L.acts.length, i = L.cardFocus; for (var k = 0; k < n; k++) { i = (i + d + n) % n; if (L.acts[i].fn) break; } focusCard(i); }
  function runAct(i) { var a = L && L.acts && L.acts[i]; if (!a) return; if (a.fn) a.fn(); else { tunc(); a.b.classList.remove('shake'); void a.b.offsetWidth; a.b.classList.add('shake'); } }
  function closeCard() { if (!L || L.mode !== 'card') return; L.mode = 'map'; L.cardId = null; L.dim.classList.remove('on'); }
  function goCard() { if (L && L.mode === 'card') runAct(L.cardFocus); }
  // BARRANCO.md §7.3: escoger Barranco en el mapa → barranco.html con la mochila (ACH.game.carryState). false = no se pudo (el mapa sigue abierto)
  function goBarranco() {
    try {
      var V = ACH.viaje, g = ACH.game;
      if (!V || typeof V.go !== 'function' || !V.PAGES || !V.PAGES.barranco) return false;
      var k = g && typeof g.carryState === 'function' ? g.carryState() : null;
      if (V.go('barranco', k, { from: here() || 'mapa' }) === false) return false;
      return true;
    } catch (e) { warn('viaje a Barranco', e); return false; }
  }
  // Escoger un nivel: el de donde ya estás no hace nada («Ya estás aquí, causa.»); onChoose(id) === false deja el mapa abierto.
  function pick(id) {
    if (!L || L.mode !== 'card') return;
    if (here() && here() === id) { L.cardP.textContent = 'Ya estás aquí, causa.'; tunc(); return; }
    var cb = L.opts.onChoose;
    L.mode = 'chosen'; L.dim.classList.remove('on');
    if (id === 'barranco' && goBarranco()) return;   // BARRANCO.md §7.3: Barranco es otra página (game.js no la conoce: se viaja desde aquí)
    var r; if (typeof cb === 'function') { try { r = cb(id); } catch (e) { warn('onChoose lanzó un error', e); } }
    if (r === false && L && L.mode === 'chosen') L.mode = 'map';
  }

  /* ---- teclado y puntero ---- */
  function onKey(e) {
    if (!L || e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key, used = true;
    ensureAudio();
    if (L.mode === 'cine') {
      if (k === 'Enter' || k === ' ' || k === 'Escape') { if (L.skippable) skipCine(); } else used = false;
    } else if (L.mode === 'map') {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') neighbor(-1, 0);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') neighbor(1, 0);
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') neighbor(0, -1);
      else if (k === 'ArrowDown' || k === 's' || k === 'S') neighbor(0, 1);
      else if (k === 'Enter' || k === ' ') choose(L.sel);
      else if (k === 'Escape') goBack();
      else used = false;
    } else if (L.mode === 'card') {
      if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'A' || k === 'w' || k === 'W') moveCard(-1);
      else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D' || k === 's' || k === 'S') moveCard(1);
      else if (k === 'Tab') moveCard(1);
      else if (k === 'Enter' || k === ' ') goCard();
      else if (k === 'Escape') closeCard();
      else used = false;
    } else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }
  function goBack() {
    if (!L || (L.mode !== 'map' && L.mode !== 'card')) return;
    var cb = L.opts.onBack;
    if (typeof cb !== 'function') { close(false); return; }   // sin onBack: se cierra y llama onDone
    L.mode = 'chosen';
    try { cb(); } catch (e) { warn('onBack lanzó un error', e); }
  }
  function onClick(e) {
    if (!L) return;
    ensureAudio();
    if (L.mode === 'cine') { skipCine(); return; }
    if (L.mode === 'map') { var id = hit(e.clientX, e.clientY); if (id) choose(id); }
    else if (L.mode === 'card') { if (e.target === L.dim) closeCard(); }
  }
  function onMove(e) {
    if (!L || L.mode !== 'map' || e.pointerType === 'touch') return;
    var id = hit(e.clientX, e.clientY);
    if (id && id !== L.sel) select(id);
  }

  /* ---- API ---- */
  function close(silent) {
    if (!L) return;
    var I = L; L = null;
    I.alive = false; cancelAnimationFrame(I.raf);
    I.ls.forEach(function (x) { x[0].removeEventListener(x[1], x[2], x[3]); });
    if (I.root.parentNode) I.root.parentNode.removeChild(I.root);
    hm('stop', .5);
    if (!silent && typeof I.opts.onDone === 'function') { try { I.opts.onDone(); } catch (e) { warn('onDone lanzó un error', e); } }
  }

  function init(opts) {
    close(true);
    opts = opts || {};
    readyArt();
    L = build(opts);
    layout();
    listen(window, 'resize', layout);
    listen(window, 'orientationchange', layout);
    listen(window, 'keydown', onKey, true);
    listen(L.root, 'click', onClick);
    listen(L.root, 'pointermove', onMove);
    listen(L.back, 'click', function (e) { e.stopPropagation(); e.preventDefault(); goBack(); });
    listen(L.root, 'contextmenu', function (e) { e.preventDefault(); });
    if (opts.unlock === 'all' || opts.unlock === true) forceAll = true;
    setupCine();
  }

  function startLoop() { L.raf = requestAnimationFrame(frame); }

  function play(opts) {
    opts = opts || {};
    if (opts.skipIntro) { showMap(opts); return; }
    init(opts);
    var t0 = +opts.t > 0 ? +opts.t : 0;
    rebase(t0);
    if (opts.freeze) { L.frozen = true; L.ft = t0; }
    if (t0 > 0 || opts.freeze) L.useAudio = false; else { ensureAudio(); hm('start'); L.audioStarted = true; L.useAudio = true; L.src = 'wait'; }
    if (t0 >= T.end) { enterMap({ silent: true, t: t0 }); }
    startLoop();
  }
  function showMap(opts) {
    if (L && !(opts && opts.parent)) {
      if (opts) { for (var k in opts) L.opts[k] = opts[k]; }
      if (L.mode === 'cine') L.skipFx = null;
      L.mode = 'cine'; enterMap({ fromSkip: false, t: 0 });
      return;
    }
    opts = opts || {};
    init(opts);
    L.mode = 'cine';
    rebase(0);
    if (opts.freeze) { L.frozen = true; L.ft = 0; }
    enterMap({ t: +opts.t || 0, silent: !!opts.freeze });
    startLoop();
  }

  ACH.cima = {
    play: play,
    showMap: showMap,
    close: function () { close(false); },
    progress: progress,
    markVisited: markVisited,
    merge: merge,
    levelsOn: levelsOn,
    NIVELES: NIVELES,
    seen: seen,
    active: function () { return !!L; },
    ORDEN: ORDEN,
    nombre: nameOf,
    debug: {
      unlockAll: function () { forceAll = true; if (L) { refreshMapUI(); } },
      reset: function () { forceAll = false; mem = null; try { window.localStorage.removeItem(KEY); } catch (e) { /* nada */ } load(); if (L) refreshMapUI(); },
      at: function (t) {
        if (!L) return;
        t = +t || 0;
        L.useAudio = false;
        if (t >= T.end) { if (L.mode === 'cine') { L.mode = 'cine'; enterMap({ silent: true, t: t }); } L.mb = t; L.mp = performance.now(); L.ft = t; }
        else { if (L.mode !== 'cine') backToCine(t); rebase(t); }
      },
      freeze: function (on) {
        if (!L) return;
        on = on !== false;
        if (on && !L.frozen) { L.ft = curT(); L.frozen = true; }
        else if (!on && L.frozen) { L.frozen = false; L.useAudio = false; rebase(L.ft); }
      },
      state: function () {
        if (!L) return null;
        return { mode: L.mode, t: curT(), sel: L.sel, card: L.cardId, frozen: L.frozen, audio: L.useAudio && L.src === 'audio', src: L.src, scale: L.S, camX: L.camX || 0, art: !!(ACH.cine && !ACH.cine.fallback), music: !!himno() };
      },
      choose: function (id) { if (L) choose(id); },
      back: function () { goBack(); },
      resetSeen: function () { seenMem = false; try { window.localStorage.removeItem(SEEN_KEY); } catch (e) { /* nada */ } },
      key: function (k) { onKey({ key: k, preventDefault: function () { }, stopPropagation: function () { } }); }
    }
  };
})();
