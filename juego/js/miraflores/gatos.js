/* ACHORADO v0.13 (T2, KE) — js/miraflores/gatos.js: D4, gatos del parque + encargo del pintor.
   · ACARICIAR: E cerca de un gato tranquilo (sentado, lamiéndose o dormido; a ≤ 26 px, sin correr) lo acaricia: se queda quieto 2,5 s, ronronea y suben corazones.
     (Los gatos huyen a 14 px: se les llega caminando; con el cartel «E acariciar» a la vista, es el momento.) Cuenta cada gato una sola vez.
   · COMPAÑERO: con 5 gatos acariciados en el Cat Park (a ≤ 100 px de ACH.world.places.catpark), el último se vuelve compañero: sigue a Alexander y DISTRAE enjambres
     (jefa.js lo consulta con ACH.mira.gatos.companion() y le avisa con .distracted()). Bandera de partida miraflores.gato.
   · CARTEL DE VICTORIA: «Gatos acariciados: n / total» (nivel.js llama a onShowWin; se usa la fila de gallinazos del cartel).
   · ENCARGO DEL PINTOR: la primera vez que abres su puesto (E), diálogo con retrato (Alexander; él, con su nombre): «retrátame 5 gatos». Con Q (Titina) cerca de un gato
     (≤ 70 px) lo «retrata» (cuenta cada gato una vez). Al cuarto cinco, vuelve con el pintor: diálogo y te regala un CUADRO DE GATOS para el cuarto (ACH.base.give).
     Banderas miraflores.pintor = 'oferta' | 'listo' | 'pagado'. Diario: «mira-pintor».
   Debug: ACH.debug.mira.gatos() · .petAll(n) · .pintor(estado) */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.mira = ACH.mira || {}; M.systems = M.systems || [];
  if (!M.register) M.register = function (s) { M.systems.push(s); return s; };
  var T = 16;
  function sfx(n, d) { if (M.sfx) M.sfx(n, d); }
  function toast(t) { if (M.toast) M.toast(t); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function mkc(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tuto(id, text, key) { try { if (ACH.tuto && typeof ACH.tuto.vez === 'function') ACH.tuto.vez(id, text, key); } catch (e) { /* nada */ } }
  function tutoDone(id) { try { if (ACH.tuto && typeof ACH.tuto.hecho === 'function') ACH.tuto.hecho(id); } catch (e) { /* nada */ } }

  var K = { petR: 26, petStay: 2.5, parkR: 100, parkNeed: 5, portraitR: 70, portraitNeed: 5, follow: 20 };
  var petted = {};            // id de gato → true (todo el nivel)
  var parkPetted = {};        // id de gato → true (solo los del Cat Park)
  var portrayed = {};         // id → true (retratos del encargo)
  var hearts = [], texts = [];
  var near = null;            // gato que se puede acariciar ahora (cartel)
  var cc = null;              // gato compañero {x, y, face, anim, mode, dashT, dx, dy, t}
  var pintor = '';            // '' | 'oferta' | 'listo' | 'pagado'
  var lastQ = 0;

  function cats(G) { return (G && G.cats) || []; }
  function catPark() { var P = ACH.world && ACH.world.places; return P && P.catpark ? P.catpark : { x: 110 * T, y: 46.6 * T }; }
  function count(o) { var n = 0; for (var k in o) if (o[k]) n++; return n; }
  function calm(c) { return c.state === 'sleep' || c.state === 'sit' || c.state === 'lick' || c.state === 'pet'; }
  function saveFlags() { try { if (M.flag) { M.flag('gatosIds', Object.keys(petted).map(Number)); M.flag('retratos', Object.keys(portrayed).map(Number)); } } catch (e) { /* nada */ } }

  /* ---------------- Acariciar ---------------- */
  function nearestCalm(G, r) {
    var p = G.player, best = null, bd = r + 0.01, L = cats(G);
    for (var i = 0; i < L.length; i++) {
      var c = L[i]; if (!calm(c) || c.onRoof || (c.z || 0) > 12) continue;
      var d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function addText(s, x, y, col) { texts.push({ s: s, x: x, y: y, t: 0, col: col || '#ff8ac0' }); if (texts.length > 5) texts.shift(); }
  function pet(G, c) {
    var p = G.player, first = !petted[c.id];
    c.state = 'pet'; c.t = K.petStay; c.anim = 0; c.face = p.x < c.x ? -1 : 1;
    if (c.path) c.path = null;
    sfx('mira.purr', { x: c.x, y: c.y }); sfx('cat.meow', { x: c.x, y: c.y });
    for (var k = 0; k < 3; k++) hearts.push({ x: c.x + rand(-5, 5), y: c.y - 8, t: -k * 0.18, vx: rand(-4, 4) });
    if (!first) { addText('Prrr…', c.x, c.y - 14); return; }
    petted[c.id] = true;
    var pk = catPark(), inPark = dist(c.hx !== undefined ? c.hx : c.x, c.hy !== undefined ? c.hy : c.y, pk.x, pk.y) <= K.parkR;
    if (inPark) parkPetted[c.id] = true;
    saveFlags();
    var np = count(parkPetted), total = cats(G).length + (cc ? 1 : 0);
    if (M.say && Math.random() < 0.6) M.say('gatoQuiere', { who: 'alex', x: p.x, y: p.y }, 'Michi lindo, michi bonito.');
    addText('♥', c.x, c.y - 14, '#ff2e88');
    if (!cc && np >= K.parkNeed && inPark) { adopt(G, c); }
    else toast('Gato acariciado (' + count(petted) + '/' + total + ')' + (inPark && !cc ? ' · Cat Park ' + Math.min(np, K.parkNeed) + '/' + K.parkNeed : ''));
    tutoDone('mira.gato');
  }

  /* ---------------- Compañero ---------------- */
  function adopt(G, c) {
    var L = G.cats, i = L.indexOf(c);
    if (c.spot) { try { c.spot.taken = null; } catch (e) { /* nada */ } }
    if (i >= 0) L.splice(i, 1);
    makeCompanion(G, c.x, c.y);
    if (M.flag) M.flag('gato', true);
    toast('¡Un gato del Cat Park te adoptó! Te sigue y distrae a las abejas');
    sfx('cat.meow', { x: c.x, y: c.y });
    try { if (ACH.objetivo && ACH.objetivo.diario) ACH.objetivo.diario('mira-gato', 'UN GATO COMPAÑERO', 'Acariciaste a cinco gatos del Cat Park y uno decidió seguirte. Las abejas lo persiguen un rato: úsalo de señuelo en la pelea.'); } catch (e2) { /* nada */ }
  }
  function makeCompanion(G, x, y) {
    cc = { x: x, y: y, face: 1, anim: 0, mode: 'follow', dashT: 0, dx: 0, dy: 0, t: 0, scared: 0 };
  }
  function updateCompanion(G, dt) {
    if (!cc) return;
    var p = G.player, W = ACH.world, d = dist(cc.x, cc.y, p.x, p.y);
    cc.anim += dt; cc.t += dt;
    if (cc.scared > 0) cc.scared -= dt;
    if (d > 150) { cc.x = p.x - 14; cc.y = p.y + 6; cc.mode = 'follow'; return; }   // se queda lejos: reaparece al lado (como Titina)
    var vx = 0, vy = 0;
    if (cc.dashT > 0) {   // corre a esconderse unos instantes de las abejas
      cc.dashT -= dt; vx = cc.dx * 95; vy = cc.dy * 95; cc.mode = 'run';
    } else if (d > K.follow) {
      var sp = Math.min(100, 38 + (d - K.follow) * 3), a = Math.atan2(p.y - cc.y, p.x - cc.x); vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; cc.mode = d > 60 ? 'run' : 'walk';
    } else cc.mode = 'sit';
    if (vx || vy) {
      var hit = W.moveCircle(cc, vx * dt, vy * dt, 3);
      if (hit && cc.dashT <= 0) { cc.stuck = (cc.stuck || 0) + dt; if (cc.stuck > 1.2) { cc.stuck = 0; cc.x = p.x - 10; cc.y = p.y + 6; } } else cc.stuck = 0;
      if (Math.abs(vx) > 1) cc.face = vx < 0 ? -1 : 1;
    }
  }
  function gatoSpr(anim, dirn, f) {
    var Sg = ACH.sprites && ACH.sprites.npc && ACH.sprites.npc.gato, o = Sg && Sg[anim];
    if (o && (anim === 'walk' || anim === 'run') && !Array.isArray(o)) o = o[dirn];
    if (Array.isArray(o) && o.length) { var c = o[((f % o.length) + o.length) % o.length]; if (c && c.width) { if (c.ax === undefined) { c.ax = Math.floor(c.width / 2); c.ay = c.height - 1; } return c; } }
    return gatoPH(anim, f);
  }
  var phCat = {};
  function gatoPH(anim, f) {
    var key = anim + (f % 2); if (phCat[key]) return phCat[key];
    var c = mkc(14, 10), g = c.getContext('2d'), low = anim === 'run' || anim === 'walk';
    g.fillStyle = '#1c1a1a'; g.fillRect(2, low ? 3 : 2, 9, low ? 5 : 7); g.fillStyle = '#c98a4a'; g.fillRect(3, low ? 4 : 3, 7, low ? 3 : 5); g.fillRect(9, low ? 2 : 1, 4, 3);
    g.fillStyle = '#1c1a1a'; g.fillRect(9, low ? 1 : 0, 1, 1); g.fillRect(12, low ? 1 : 0, 1, 1); g.fillStyle = '#7a5530'; g.fillRect(0, low ? 3 : 5 - (f % 2), 2, 1);
    c.ax = 7; c.ay = 9; phCat[key] = c; return c;
  }
  function drawCompanion(g, cx, cy) {
    if (!cc) return;
    var spr = cc.mode === 'sit' ? gatoSpr('sit', null, Math.floor(cc.anim * 1.2)) : gatoSpr(cc.mode === 'run' ? 'run' : 'walk', cc.face < 0 ? 'left' : 'right', Math.floor(cc.anim * (cc.mode === 'run' ? 14 : 8)));
    var x = Math.round(cc.x) - cx, y = Math.round(cc.y) - cy;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - 5, y - 1, 10, 2);
    if (cc.mode === 'sit' && cc.face < 0) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(spr, -spr.ax, -spr.ay); g.restore(); }
    else g.drawImage(spr, x - spr.ax, y - spr.ay);
    if (cc.mode === 'sit' && Math.floor(cc.t * 0.6) % 4 === 0) { g.fillStyle = '#ff2e88'; g.fillRect(x + 4, y - 14, 2, 2); }   // corazoncito de vez en cuando
  }
  M.gatos = {
    companion: function () { return cc ? { x: cc.x, y: cc.y } : null; },
    distracted: function (c) {   // jefa.js: un enjambre se fue tras el gato
      if (!cc || cc.dashT > 0 || (cc.scared > 0)) return;
      var G = ACH.G, a = c ? Math.atan2(cc.y - c.y, cc.x - c.x) : Math.random() * 6.28;
      cc.dashT = 1.3; cc.dx = Math.cos(a); cc.dy = Math.sin(a); cc.scared = 3;
      addText('¡FFF!', cc.x, cc.y - 14, '#ffffff'); sfx('cat.hiss', { x: cc.x, y: cc.y });
      if (!M.gatos._said) { M.gatos._said = true; toast('¡El gato distrae a las abejas! Aprovecha para pegarle a la jefa'); }
    },
    count: function () { return count(petted); },
    total: function () { var G = ACH.G; return cats(G).length + (cc ? 1 : 0); },
    petted: petted, hasCompanion: function () { return !!cc; }
  };

  /* ---------------- E: acariciar (envuelve ACH.armas.update; los vendedores y la campana tienen prioridad) ---------------- */
  var installed = false;
  function vendorNear(G) {
    var p = G.player, V = ACH.vendedores, v = null;
    try { if (V && V.near) v = V.near(p.x, p.y); } catch (e) { v = null; }
    if (v) return true;
    var W = ACH.world.vendors || [];
    for (var i = 0; i < W.length; i++) if (dist(p.x, p.y, W[i].x, W[i].y) < 28) return true;
    var B = ACH.debug && ACH.debug.mira && ACH.debug.mira.bell;
    return !!(B && dist(p.x, p.y, B.x, B.y) < 30);
  }
  function wrapArmas() {
    var A = ACH.armas; if (!A || installed || typeof A.update !== 'function') return;
    installed = true;
    var origU = A.update, origC = A.context;
    A.update = function (G, dt) {
      var In = ACH.input;
      if (G && G.state === 'playing' && G.player && G.player.hp > 0) {
        near = !G.player.running && !vendorNear(G) ? nearestCalm(G, K.petR) : null;
        if (near && In && In.pressed('KeyE')) {
          pet(G, near);
          var op = In.pressed;
          In.pressed = function (c) { return c === 'KeyE' ? false : op(c); };
          try { return origU.apply(this, arguments); } finally { In.pressed = op; }
        }
      } else near = null;
      return origU.apply(this, arguments);
    };
    if (typeof origC === 'function') A.context = function () { if (near) return { label: 'ACARICIAR', code: 'KeyE' }; return origC.apply(this, arguments); };
  }

  /* ---------------- Encargo del pintor ---------------- */
  function setPintor(v) { pintor = v; if (M.flag) M.flag('pintor', v); }
  function pintorTalk(open) {
    var N = M, L = function (t, k) { return N.line('pintor', t, k || null, 'EL PINTOR'); }, A = function (t, c) { return N.line('alexander', t, c); };
    if (pintor === '' || pintor === undefined) {
      N.talk([
        L('Joven, un artista sin gato es un hombre sin musa. Y los gatos de este parque son lo único que me inspira desde el apocalipsis.'),
        A('¿Y en qué le puedo ayudar, maestro?', 'serio'),
        L('Retráteme cinco gatos del Kennedy. Pero con su pose, su mirada, su dignidad. Yo no puedo acercarme: me bufan.', 'triste'),
        A('Yo tengo a Titina: es la mejor modelo que va a conocer.', 'picaro'),
        N.line('titina', 'Grrú.', 'feliz'),
        L('Excelente. Que Titina pose cerquita de cada gato (tecla Q) y vuelva conmigo con cinco retratos. Le pinto un cuadro gratis, de mi mejor mano.')
      ], function () {
        setPintor('oferta');
        N.diario('mira-pintor', 'ENCARGO DEL PINTOR', 'El pintor del anfiteatro quiere retratos de 5 gatos del parque. Pon a Titina cerca de cada uno con Q. Paga con un cuadro gratis.');
        toast('Encargo: retrata 5 gatos con Q (Titina) cerca de ellos (0/5)');
        tuto('mira.retrato', 'Encargo del pintor: acércate a un gato y manda a Titina con Q', 'Q');
        if (typeof open === 'function') open();
      });
      return true;
    }
    if (pintor === 'listo') {
      N.talk([
        A('Maestro, ya están los cinco retratos. Titina salió muy fotogénica.', 'risa'),
        L('¡Magnífico! Esa pose, esa mirada… ¡ese gato dormido en la grada! Aquí tiene: «Los gatos del Kennedy», óleo sobre lienzo, cortesía de la casa.', 'risa')
      ], function () {
        setPintor('pagado');
        var ok = false;
        try { ok = !!(ACH.base && ACH.base.give && ACH.base.give('cuadroGatos', 1)); } catch (e) { ok = false; }
        toast(ok ? '¡Recibiste un cuadro de gatos! Va directo a tu cuarto' : 'El pintor te debe un cuadro (no se pudo mandar al cuarto)');
        sfx('shop.buy', { id: 'cuadroGatos' });
        if (typeof open === 'function') open();
      });
      return true;
    }
    return false;
  }
  function wrapTienda() {
    var Ti = ACH.tienda; if (!Ti || Ti._ke || typeof Ti.open !== 'function') return;
    var orig = Ti.open;
    Ti.open = function (id, opts) {
      if (id === 'pintor' && (pintor === '' || pintor === 'listo')) {
        var self = this, args = arguments;
        if (pintorTalk(function () { orig.apply(self, args); })) return true;
      }
      return orig.apply(this, arguments);
    };
    Ti._ke = true;
  }
  // Q (Titina) cerca de un gato = retrato
  function checkPortrait(G) {
    var qt = G.qT || 0, rise = qt > lastQ + 0.3, p = G.player;   // Q = vista de paloma (Titina): G.qT sube de golpe al apretarla
    lastQ = qt;
    if (rise && pintor === 'oferta') {
      var best = null, bd = K.portraitR, L = cats(G), i;
      for (i = 0; i < L.length; i++) { var c = L[i]; if (c.state === 'run' || c.state === 'hide') continue; var d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
      if (best && !portrayed[best.id]) {
        portrayed[best.id] = true; saveFlags();
        var n = count(portrayed);
        addText('¡CLIC!', best.x, best.y - 16, '#ffffff'); sfx('mira.flash', { x: best.x, y: best.y });
        toast('¡Titina posó con el gato! Retratos ' + Math.min(n, K.portraitNeed) + '/' + K.portraitNeed);
        if (n >= K.portraitNeed) { setPintor('listo'); toast('Encargo listo: vuelve con el pintor (E) por tu cuadro'); tutoDone('mira.retrato'); }
      } else if (best && portrayed[best.id]) toast('A ese gato ya lo retrataste: busca otro');
    }
  }

  /* ---------------- Sistema ---------------- */
  var started = false;
  M.register({
    name: 'gatos',
    reset: function (G) {
      petted = M.gatos.petted = {}; parkPetted = {}; portrayed = {}; hearts.length = 0; texts.length = 0; near = null; cc = null; pintor = ''; lastQ = 0; started = false;
      wrapArmas();
      // CONTINUAR: lo ya hecho en esta partida
      if (M.cont && M.flag) {
        var ids = (ACH.partida && ACH.partida.flag ? ACH.partida.flag('miraflores.gatosIds') : null) || [], rt = (ACH.partida && ACH.partida.flag ? ACH.partida.flag('miraflores.retratos') : null) || [];
        ids.forEach(function (i) { petted[i] = true; }); rt.forEach(function (i) { portrayed[i] = true; });
        pintor = (ACH.partida && ACH.partida.flag ? ACH.partida.flag('miraflores.pintor') : '') || '';
      }
    },
    onRespawn: function (G) { if (cc && G.player) { cc.x = G.player.x - 12; cc.y = G.player.y + 6; cc.dashT = 0; } near = null; },
    update: function (G, dt) {
      var i;
      if (!started) {   // tras el reset (con los gatos ya creados por interaccion.js)
        started = true; wrapTienda();
        if (M.cont && M.flag && M.flag('gato') && !cc) makeCompanion(G, G.player.x - 12, G.player.y + 6);
      }
      wrapTienda();
      updateCompanion(G, dt);
      checkPortrait(G);
      for (i = hearts.length - 1; i >= 0; i--) { var h = hearts[i]; h.t += dt; if (h.t > 1) hearts.splice(i, 1); }
      for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 1) texts.splice(i, 1); }
      // pista de tutorial: gato tranquilo cerca
      if (near) tuto('mira.gato', 'Acaricia a los gatos del parque: E, sin correr', 'E');
    },
    drawables: function (G, out) {
      if (!cc) return;
      var cam = G.cam, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
      if (cc.x < cam.x - 30 || cc.x > cam.x + V.w + 30 || cc.y < cam.y - 20 || cc.y > cam.y + V.h + 40) return;
      out.push({ y: cc.y, x: cc.x, draw: function (g, cx, cy) { drawCompanion(g, cx, cy); } });
    },
    drawTop: function (g, G, cx, cy) {
      var i;
      for (i = 0; i < hearts.length; i++) {
        var h = hearts[i]; if (h.t < 0) continue;
        var x = Math.round(h.x + h.vx * h.t - cx), y = Math.round(h.y - h.t * 16 - cy);
        g.globalAlpha = Math.max(0, 1 - h.t); g.fillStyle = '#131015'; g.fillRect(x - 1, y - 1, 5, 4); g.fillStyle = '#ff2e88'; g.fillRect(x, y, 2, 2); g.fillRect(x + 2, y, 2, 2); g.fillRect(x, y + 1, 4, 1); g.fillRect(x + 1, y + 2, 2, 1);
      }
      g.globalAlpha = 1;
      if (texts.length) {
        g.font = '7px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (i = 0; i < texts.length; i++) { var t = texts[i], tx = Math.round(t.x - cx), ty = Math.round(t.y - cy - t.t * 12); g.globalAlpha = Math.max(0, 1 - t.t); g.fillStyle = '#131015'; g.fillText(t.s, tx + 1, ty + 1); g.fillStyle = t.col; g.fillText(t.s, tx, ty); }
        g.globalAlpha = 1; g.textAlign = 'start'; g.textBaseline = 'alphabetic';
      }
      if (near && G.state === 'playing' && !(ACH.touch && ACH.touch.on)) {   // «E acariciar» sobre el gato
        var s = 'E acariciar', bx = Math.round(near.x - cx), by = Math.round(near.y - (near.z || 0) - cy - 22);
        g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
        var w = Math.ceil(g.measureText(s).width) + 6;
        g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(bx - (w >> 1), by - 5, w, 10);
        g.globalAlpha = 1; g.fillStyle = '#ff8ac0'; g.fillRect(bx - (w >> 1), by + 5, w, 1); g.fillStyle = '#f2f2f2'; g.fillText(s, bx, by);
        g.textAlign = 'start'; g.textBaseline = 'alphabetic';
      }
    },
    // el cartel de victoria: «Gatos acariciados: n / total» en la fila de los gallinazos del Callao
    onShowWin: function (G) {
      try {
        var row = document.getElementById('winGallRow'), val = document.getElementById('winGall'), cart = document.getElementById('winCartRow');
        if (!row || !val) return;
        row.classList.remove('hide'); if (cart) cart.classList.add('hide');
        var sp = row.querySelector('span'); if (sp) sp.textContent = 'Gatos acariciados';
        val.textContent = count(petted) + ' / ' + (cats(G).length + (cc ? 1 : 0) + 0);
      } catch (e) { /* nada */ }
    }
  });

  /* ---------------- Debug ---------------- */
  ACH.debug = ACH.debug || {};
  var DM = ACH.debug.mira = ACH.debug.mira || {};
  DM.gatos = function () { var G = ACH.G; return { petted: count(petted), park: count(parkPetted), total: cats(G).length + (cc ? 1 : 0), companion: cc ? { x: Math.round(cc.x), y: Math.round(cc.y), mode: cc.mode } : null, pintor: pintor, retratos: count(portrayed), near: near ? near.id : null }; };
  // acaricia n gatos del Cat Park de golpe (teletransporta a Alexander junto a cada uno)
  DM.petAll = function (n) {
    var G = ACH.G, pk = catPark(), L = cats(G).filter(function (c) { return dist(c.hx, c.hy, pk.x, pk.y) <= K.parkR; }), out = 0;
    for (var i = 0; i < L.length && i < (n || 5); i++) { var c = L[i]; G.player.x = c.x + 18; G.player.y = c.y; c.state = 'sit'; pet(G, c); out++; }
    return { done: out, state: DM.gatos() };
  };
  DM.pintor = function (v) { if (v !== undefined) setPintor(v); return pintor; };
  DM.retrato = function (n) { var G = ACH.G, L = cats(G); for (var i = 0; i < Math.min(n || 5, L.length); i++) portrayed[L[i].id] = true; if (count(portrayed) >= K.portraitNeed && pintor === 'oferta') setPintor('listo'); return count(portrayed); };
})();
