/* ACHORADO v0.13 — js/engine/concierto.js → ACH.concierto (contrato V013-T2.md §1, agente U · G4): las piezas de «El gran concierto».
     PIEZAS        ['setlist', 'parlante', 'microfono', 'ampli']  (Gambetta · Cerro · Kennedy · Costa Verde)
     dar(id)       entrega la pieza: cartel grande «¡PIEZA DEL CONCIERTO: EL SETLIST!», la guarda y anota el diario. true si es nueva.
     tiene(id)     ¿ya está?
     todas()       las cuatro: [{id, nombre, nivel, desc, tiene}] en orden.
     cuantas()     cuántas hay.
     nombre(id)    'EL SETLIST'…
     icono(id, k)  canvas de 16×16 px (× k entero) con la pieza en pixel art (lo puede usar quien quiera; el cuarto dibuja las suyas).
     nuevaPartida() PARTIDA NUEVA: sin piezas.
   Persiste en localStorage['achorado.concierto.v1'] = {v:1, p:{id: ts}} (respaldo en memoria). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var KEY = 'achorado.concierto.v1';
  var PIEZAS = ['setlist', 'parlante', 'microfono', 'ampli'];
  var INFO = {
    setlist: { nombre: 'EL SETLIST', nivel: 'Av. Gambetta', desc: 'La lista de canciones de DJ Fosforito, con manchas de chicha morada.' },
    parlante: { nombre: 'EL PARLANTE', nivel: 'El Cerro', desc: 'El parlante del comité. Suena a pollada de domingo.' },
    microfono: { nombre: 'EL MICRÓFONO', nivel: 'Parque Kennedy', desc: 'Un micro de karaoke pituco. Todavía huele a chancaca.' },
    ampli: { nombre: 'EL AMPLI', nivel: 'Costa Verde', desc: 'El ampli que venía amarrado a la tabla del Tablazo.' }
  };
  var mem = null, cartel = null, hideTO = 0, queue = [];

  function read() {
    if (mem) return mem;
    var o = null;
    try { var s = window.localStorage.getItem(KEY); o = s ? JSON.parse(s) : null; } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || !o.p || typeof o.p !== 'object') o = { v: 1, p: {} };
    mem = o; return mem;
  }
  function write() { try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* queda en memoria */ } }
  function tiene(id) { return !!read().p[id]; }
  function cuantas() { var n = 0; PIEZAS.forEach(function (id) { if (tiene(id)) n++; }); return n; }
  function nombre(id) { return INFO[id] ? INFO[id].nombre : String(id || '').toUpperCase(); }
  function todas() { return PIEZAS.map(function (id) { return { id: id, nombre: INFO[id].nombre, nivel: INFO[id].nivel, desc: INFO[id].desc, tiene: tiene(id) }; }); }

  /* ---- íconos 16×16 (paleta desaturada; el contorno oscuro de siempre) ---- */
  var PAL = { k: '#131015', w: '#e8e2d4', p: '#c9bfa6', r: '#c0463e', y: '#e0b040', g: '#5a5662', d: '#34303a', m: '#8c8494', b: '#3e6a8a', o: '#b8742e' };
  var ART = {
    setlist: ['....kkkkkkkk....', '...kwwwwwwwwk...', '...kwrrwwwwwk...', '...kwwwwwwwwk...', '...kwppppppwk...', '...kwwwwwwwwk...', '...kwppppwwwk...',
      '...kwwwwwwwwk...', '...kwpppppwwk...', '...kwwwwwwwwk...', '...kwppwwwrwk...', '...kwwwwwrrwk...', '...kwpppwwwwk...', '...kwwwwwwwwk...', '....kkkkkkkk....', '................'],
    parlante: ['...kkkkkkkkkk...', '..kddddddddddk..', '..kdgggggggggk..', '..kdgkkkkkkgdk..', '..kdgkmmmmkgdk..', '..kdgkmkkmkgdk..', '..kdgkmmmmkgdk..', '..kdgkkkkkkgdk..',
      '..kdgggggggggk..', '..kdgkkkkkkgdk..', '..kdkmmmmmmkdk..', '..kdkmkkkkmkdk..', '..kdkmmmmmmkdk..', '..kdgkkkkkkgdk..', '..kddddddddddk..', '...kkkkkkkkkk...'],
    microfono: ['......kkkk......', '.....kmmmmk.....', '....kmgmgmmk....', '....kmmgmgmk....', '....kmgmgmmk....', '.....kmmmmk.....', '......kddk......', '......kddk......',
      '......kddk......', '......kddk......', '......kddk......', '......kddk......', '.......kk.......', '......kddk......', '....kkddddkk....', '................'],
    ampli: ['................', '..kkkkkkkkkkkk..', '.koooooooooooko.', '.kokkkkkkkkkkok.', '.kokyyyyyyyykok.', '.kokkkkkkkkkkok.', '.kodddddddddddk.', '.kodkkkkkkkkkdk.',
      '.kodkggggggkddk.', '.kodkgkkkkgkddk.', '.kodkgkddkgkddk.', '.kodkgkkkkgkddk.', '.kodkggggggkddk.', '.kodkkkkkkkkkdk.', '.kkkkkkkkkkkkkk.', '................']
  };
  function icono(id, k) {
    k = Math.max(1, k | 0 || 1);
    var cv = document.createElement('canvas'); cv.width = 16 * k; cv.height = 16 * k;
    var g = cv.getContext('2d'), A = ART[id]; if (!A) return cv;
    for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var c = PAL[A[y].charAt(x)]; if (c) { g.fillStyle = c; g.fillRect(x * k, y * k, k, k); } }
    return cv;
  }

  /* ---- el cartel ---- */
  function showCartel(id) {
    var st = document.getElementById('stage') || document.body; if (!st) return;
    if (!cartel) {
      cartel = document.createElement('div'); cartel.className = 'pieza-cartel'; cartel.setAttribute('role', 'status');
      cartel.innerHTML = '<div class="pc-in"><p class="pc-kick">¡PIEZA DEL CONCIERTO!</p><div class="pc-row"><span class="pc-ic"></span><b class="pc-name"></b></div><p class="pc-desc"></p><p class="pc-n"></p></div>';
      st.appendChild(cartel);
    }
    var q = function (s) { return cartel.querySelector(s); };
    q('.pc-kick').textContent = '¡PIEZA DEL CONCIERTO: ' + nombre(id) + '!';
    q('.pc-name').textContent = nombre(id);
    q('.pc-desc').textContent = INFO[id] ? INFO[id].desc : '';
    q('.pc-n').textContent = cuantas() + ' de 4 · ya está en el escenario de tu cuarto';
    var ic = q('.pc-ic'); ic.innerHTML = ''; ic.appendChild(icono(id, 4));
    cartel.classList.remove('on'); void cartel.offsetWidth; cartel.classList.add('on');
    try { if (ACH.audio && ACH.audio.emit) ACH.audio.emit('loot.rare'); } catch (e) { /* nada */ }
    clearTimeout(hideTO);
    hideTO = setTimeout(function () { cartel.classList.remove('on'); if (queue.length) setTimeout(function () { whenFree(queue.shift()); }, 300); }, 3800);
  }

  // el cartel espera a que no haya diálogo ni pausa (máx. 40 s): si la pieza llega con el diálogo del sobreviviente, sale al cerrarlo
  var waiting = false;
  function busy() { var G = ACH.G; return !!((ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()) || (G && G.state !== 'playing' && G.state !== 'won')); }
  function whenFree(id, n) {
    n = n || 0;
    if (busy() && n < 160) { waiting = true; setTimeout(function () { whenFree(id, n + 1); }, 250); return; }
    waiting = false; showCartel(id);
  }
  function dar(id) {
    if (PIEZAS.indexOf(id) < 0) { try { console.warn('[concierto] pieza desconocida: ' + id); } catch (e) { /* nada */ } return false; }
    if (tiene(id)) return false;
    read().p[id] = Date.now(); write();
    if ((cartel && cartel.classList.contains('on')) || waiting) queue.push(id); else whenFree(id);
    try { if (ACH.objetivo && ACH.objetivo.diario) ACH.objetivo.diario('pieza-' + id, 'Pieza del concierto: ' + nombre(id), INFO[id].desc, { quiet: true }); } catch (e) { /* nada */ }
    return true;
  }
  function nuevaPartida() { mem = { v: 1, p: {} }; write(); }

  ACH.concierto = { PIEZAS: PIEZAS, KEY: KEY, dar: dar, tiene: tiene, todas: todas, cuantas: cuantas, nombre: nombre, icono: icono, nuevaPartida: nuevaPartida };
})();
