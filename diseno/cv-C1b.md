# C1b · El Maestro Wantán (jefe 1 de la Costa Verde) + salto al parapente

Archivo: `juego/js/costaverde/chef.js` (único). Página de prueba propia: `juego/preview-cv-chef.html`
(mapa de Miraflores + `js/costaverde/{nivel, arte-larcomar, arte-personajes, arte-caida, juguetes, chef, caida, chorrillos}.js`;
sin `trabajadores/jefa/cargables`). Cuando exista `costaverde.html`, la preview se puede borrar.

## Qué hace
- **Entrada:** el chef está en la cocina (`state 'cocina'`, invisible). La reja se abre cuando Alexander está a menos de 56 px.
  Al entrar en la caja de la arena (y a más de 22 px de la reja) se cierra la reja detrás y empieza la entrada.
  1. Se congela el mundo.
  2. El chef sale de la puerta.
  3. Globo «¡Mesa cuatro, un cantante al vapor! ¡Y bien cocido!».
  4. Retrato de Alexander (caras miedo → picaro).
  5. Globo «En mi cocina nadie toca guitarra, compadre.».
  6. Pelea.
  - En los reintentos solo sale el globo «¡Otra vez tú! ¡Pedido listo!», sin congelar ni retrato.
- **Pelea (vida 40), §5.2:**
  - **F1:** abanico de 5 palitos y 3 dumplings cada 8 s.
  - **F2 (<60 %):** alterna lluvia de 8 palitos con abanico de 7. Llama a 4 dumplings, 1 de ellos baozi.
  - **F3 (<25 %):** salto de wok → 2,5 s sentado y cansado («¡Un tecito, un tecito!», daño ×2, barra en verde) → abanico de 7 → salto… Llama a 2 dumplings cada 11 s.
  - Máximo 6 dumplings a la vez.
- **Avisos (justo, V011):**
  - **Abanico:** brazos arriba 0,5 s y «!» sobre el chef. Las líneas punteadas amarillas siguen a Alexander; a los 0,35 s se fijan y se ponen rosadas. Se pueden saltar (C).
  - **Lluvia:** 8 sombras durante 0,7 s, con un punto rosado al final. Una cae sobre Alexander y las demás dejan huecos de 16 px o más.
  - **Wok:** sombra en el piso durante 1 s donde estaba Alexander al despegar. La onda de 40 px se puede saltar.
  - **Dumplings:** «!» verde sobre la vaporera 0,7 s antes de que salgan.
- **Golpes al chef:**
  - Golpe de cercanía: le entra a ≤ 38 px de sus pies, mire a donde mire. Nunca hay «¡CLANC!».
  - Guitarra 1, puñete 0,5, `held:*` según su dmg (barra fosforescente 0,8).
  - Pelota ×1,5. Helado 0,5 y lo ralentiza ×0,5 por 2 s, como mucho cada 6 s.
  - `throw:barraFosfo` 0,5. `heavy:*` daño completo. Piedra 1. Burbuja 0. Perro 0,3.
  - Mientras está en el aire (z ≥ 30) no se le puede pegar.
- **Dumplings:**
  - Vida 1,5 (baozi 3). Saltan cada 0,6 s y muerden por 10. Al morder rebotan y esperan 1 s.
  - Un golpe ≥ 1 revienta a uno chico. Pelota, helado y perro también lo matan.
- **Muerte:**
  1. Cae de espaldas (hurt → cae → dead), con temblor.
  2. El wok rueda 1,5 s y suelta 12 sencillos y 2 `chaufa` (si `ACH.inv.defs.chaufa` existe).
  3. Retrato de Alexander (risa): «Ese pedido salió crudo, maestro.»
  4. Se abre el borde: «¡AL BORDE!» con flecha chicha, la caseta (`larco.props.casetaTandem` o una provisoria) y el parapente rosado y amarillo plegado.
- **Borde:**
  1. Con E a < 28 px: diálogo (serio → risa) la primera vez.
  2. Corre 0,5 s y salta 0,3 s (se abre la vela), luego 0,35 s de salida.
  3. `ACH.cv.caida.start({onWin, onLose})`.
  - **onWin:** `ACH.cv.chorrillos.play({onEnd})` → `ACH.cv.finish({chef:{fightT, tries, jumps}})`. Lo que falte se salta. Sin `finish`, se usa `ACH.debug.win()`.
  - **onLose:** `ACH.cv.setCheckpoint('borde')`. Alexander vuelve al borde con la vida y el aliento llenos, el chef sigue muerto y sale el toast. El siguiente E salta **sin** diálogo.
- **Reaparecer:** si muere en la pelea (`onRespawn`), el chef vuelve a la cocina con vida 40, se limpia el campo, la reja queda abierta, se apagan la barra y la música. Reaparece en el punto de control que tenga C1a, antes de la arena.
- **Congelar:** se usa `ACH.cv.freeze(bool)` de C1a (`G.state = 'cine'`). Si falta, hay una copia local con el mismo mecanismo. Las secuencias en tiempo real (salida del chef, globos, carrera y salto) corren con un `requestAnimationFrame` propio mientras el mundo está congelado.

## API para los demás
```
ACH.cv.chef            el mismo objeto siempre: state 'cocina'|'entrada'|'pelea'|'muriendo'|'muerto', dead, hp, hpMax, phase, x, y, z, edgeOpen, jumps
  .targets()           → objetos VIVOS: el chef (ACH.cv.chef, kind 'chef', boss: true, r 15) y los dumplings (kind 'dumpling', r 6|8, big, dead)
  .hitBy(target, {dmg, kind, x, y})   (así lo llama juguetes.js)   o   .hitBy(src, dmg, x, y, id)  → daño aplicado
                       perro: al chef dmg (0,3 por defecto); al dumpling lo mata
  .jump()              salta del borde sin diálogo (lo usa ACH.debug.cv.skip('caida') de C1a)
  .debug               = ACH.debug.cv.chef
  .info(), .K          estado y afinación
ACH.nivel.onProjectile kinds: 'ball' 'throw:helado' 'throw:barraFosfo' 'heavy:*' 'stone' 'bubble' 'dog'; los demás 'throw:*' → false (rebotan)
                       al pegar: true y pr.cvHit = 'chef'|'dumpling', pr.cvNx/cvNy (normal para rebotar); el mismo pr no repite en 0,35 s
ACH.cv.chefDead        bool (para routeCheck de C1a)
dynSolids              'chef.cuerpo' (30×10 en sus pies, en la pelea y en el suelo) y 'chef.reja' (solo si hay prop rejaChifa y C1a no publica
                       su propio sólido de reja). Los dos llevan jefa: true, así routeCheck los ignora.
Reja                   prop 'rejaChifa'.open = true/false. Si C1a publica un dynSolid con id /reja/i o rejaChifa: true, le cambio .off.
                       Si existe ACH.cv.gate.open()/close(), lo llamo. Antes de que llegue Alexander no toco la reja de C1a.
Geometría              ACH.world.terr (id 'D'|'arena', o la de r0 más alta) → caja; si no, places.arena ± 12 × 4,5 tiles.
                       Casa del chef: 26 px bajo el borde norte de la caja, bajando hasta encontrar sitio libre. Vaporera a 46 px.
                       El borde está en places.borde (o en la esquina SE de la caja).
```
- **Debug:** `ACH.debug.cv.chef = { info, kill(quick=true), hp(n), phase(n), fight(), intro(), edge(), jump(), arenaHere(wTiles, hTiles) }`.
  - `skip('chef')` de C1a llama a `chef.debug.kill()` (muerte rápida: botín, borde abierto, sin diálogo) y luego a `tp('borde')`.
  - Si `ACH.debug.cv.skip` no existe, chef.js pone uno propio.
- **Sonidos** (por `ACH.cv.sfx`; para que C3 los nombre igual):
  - Chef: `cv.gong`, `cv.chef.grito`, `cv.chef.alza`, `cv.chef.salta`, `cv.chef.duele`, `cv.chef.muere`.
  - Palitos: `cv.palito`, `cv.palito.lluvia`, `cv.palito.toc`.
  - Dumplings y vaporera: `cv.vaporera`, `cv.dumpling.salen`, `cv.dumpling.salto`, `cv.dumpling.muerde`, `cv.dumpling.golpe`, `cv.dumpling.muere`.
  - Wok: `cv.wok`, `cv.wok.rueda`.
  - Final: `cv.baranda`, `cv.reja.abre`, `cv.reja.cierra`, `cv.parapente.corre`, `cv.parapente`.
  - Música: `ACH.audio.cv.play('cv.chef')` / `stop('cv.chef')`; si no hay, `music.setBoss`.
- **Voz:** `ACH.audio.say(texto, {who})`, con `who = 'chef'` si alguna frase de `voces-cv` lo usa (si no, `'zombie'`). Sin `say`, sale un globo horneado propio.

## Afinación (`ACH.cv.chefK`; 1 de daño del contrato = 10 de vida)
| Qué | Valor |
|---|---|
| Vida del chef | 40 |
| Cambio de fase | 0,6 / 0,25 |
| Distancia de golpe de cercanía | 38 px |
| Paso del chef | 24 px/s; se queda a 46 px o más de Alexander |
| Abanico | 0,5 s de aviso (fijo a los 0,35 s); 5 o 7 palitos en 50°; 260 px/s; daño 10; alcance 320 px; clavados 1 s |
| Lluvia | 8 palitos; 0,7 s de aviso; radio 9 px; daño 10 |
| Ritmo de ataques | F1 2,6 s · F2 2,3 s · F3 salto → abanico 2,0 s |
| Dumplings | cada 8 / 8 / 11 s; 3 / 4 / 2 por vez; máximo 6 |
| Salto de wok | 0,45 s de subida + 1 s en el aire; onda de 40 px; daño 15; empujón 22 |
| Cansancio | 2,5 s con daño ×2; luego 0,6 s para levantarse |
| Dumplings | salto cada 0,6 s a 70 px/s; mordida 10; 1 s entre mordidas |
| Helado | lento ×0,5 por 2 s, como mucho cada 6 s |

## Pruebas (preview en el puerto 8712, arena puesta con `arenaHere`)
- Entrada con retrato (C2c ya pinta al chef), barra «EL MAESTRO WANTÁN · CHIFA GRAN DRAGÓN», las 3 fases y la muerte, con la consola limpia.
- Bot que solo da guitarrazos sin esquivar: lo mata en 17 s, pero recibe unos 105 de daño, más que una vida. Hay que esquivar o comer.
  Un jugador real tarda bastante más (alejarse de los abanicos, el wok, los dumplings). Si QA lo ve fácil: subir `hp` o bajar `nearBody`.
- Todos los tipos de daño probados:
  - pelota 3 (dmg 2 × 1,5);
  - helado 0,5 más 2 s de lentitud (el segundo helado no ralentiza);
  - inflable lanzado → false;
  - barra 0,8, puñete 0,5;
  - perro: `hitBy(blanco, {kind: 'dog'})` → 0,3 al chef y el dumpling muere.
- Muerte de Alexander en la pelea: el chef vuelve a 'cocina' con vida 40, sin barra ni dumplings.
- Borde → diálogo → salto → caída de C4. Con `onLose`, Alexander vuelve al borde con 100 de vida y el segundo E salta sin diálogo.
  Con `caida.debug.win()` → Chorrillos de C5 → «¡ATERRIZASTE EN CHORRILLOS!» con estadísticas.

## Pendientes y problemas conocidos
- **No probé en `costaverde.html`.** La página y `mundo.js` de C1a no existían todavía. Queda por ver la geometría real:
  - `terr` de la arena;
  - `places.arena` y `places.borde` (en px);
  - el prop `rejaChifa` y si C1a dibuja su `.open`;
  - que la casa del chef no quede metida en la fachada (busca sitio libre bajando desde y0 + 26).
- **La baranda de vidrio del borde:** si C1a la pone sólida en `places.borde`, no estorba (el salto es animado y el mundo está congelado). Pero que el punto `borde` sea alcanzable a pie. `ACH.cv.chef.edgeOpen` dice cuándo «abrirla».
- **E en el borde** también lo leen `armas.js` y `juguetes.js` (acariciar un perro cerca). El aviso «E TIRARSE EN PARAPENTE» va bajo los pies para no taparse. El botón táctil E de `armas` no muestra este aviso.
- **chorrillos.js estaba a medio escribir** al primer intento («Unexpected end of input»). Al final cargó bien.
- **Pestañas compartidas:** el panel del navegador es de todos. Otro agente me navegó la pestaña cuando la puse al frente. Para probar en segundo plano, hay que evitar la pausa automática anulando `blur`/`visibilitychange` en captura (solo en la consola de prueba).
- **Habilidades:** el diálogo «despertar de la guitarra» de `habilidades.js` puede saltar en plena pelea si es la primera vez. No es de C1b.
