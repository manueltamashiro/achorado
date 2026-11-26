# QA de Miraflores (nivel 3, Parque Kennedy)

Prueba hecha con el panel del navegador oculto: sin capturas, solo estado (`ACH.debug.*`, `ACH.G`, `ACH.world`, `ACH.mira.*`), entradas simuladas y `ACH.game.step(n)`.
Build: `sh build-miraflores.sh` → `dist/miraflores.html`; servidor `ruby -run -e httpd . -p 8781` en `dist/`.
Contrato: `juego/MIRAFLORES.md`.

## Resultados

| # | Prueba | Resultado | Datos |
|---|---|---|---|
| 1 | Carga, `routeCheck(12)`, `spawnCheck()`, `bakeMs` | PASA | consola sin errores; `routeCheck(12)` ok (599 pasos de 4 px); `spawnCheck()` vacío; `bakeMs` 76–89 ms (límite 600) |
| 2a | Lotes con su arquetipo real | PASA | 38 lotes, todos `_src = 'buildLot'`, sin `_err`; ningún `mf_*` es el provisorio (`.prov` falso) |
| 2b | Claves de props y tiles de `mundo.js` | PASA | 39 claves de props, 16 tiles/calcomanías: ninguna falta en `ACH.sprites`; ninguna provisoria (salvo los `inflable_*` de `inflables.js`, que usan el ícono) |
| 2c | Los 9 negocios, en el orden de la tabla 3.3 | PASA | Saga(0) · Tai Loy(44) · [Lucha(60), Starbucks(67) Diagonal] · China Wok(92) · Bembos(99) · Belisario(106) · Lucha(122) · Starbucks(130) · Ripley(150) · Wong. El color de cada marca aparece horneado en su lote (Bembos 2992 px azules y 3798 amarillos; Wong 308 px rojos; etc.) |
| 2d | Píxeles del suelo horneado | PASA | pasto (63,136,69) · adoquín (145,101,80) · ciclovía (155,63,57) · rotonda (143,134,130) · vereda (150,145,142) · asfalto (68,69,73) · rampa Diagonal (192,187,172). Todo el suelo: 0 píxeles magenta, 0 transparentes, 220 casi negros (ventanas de las torres N2/N7) |
| 3 | Trabajadores | PASA | 12, todos con skin `trab_*` real; velocidad 22 contra 32 del caminante (de noche 44 contra 64); 0 reapariciones en 40 s (con 2 muertos); no se alejan más de 40 px de su puerta. Al verlo dicen su frase (`trab.<marca>`). Al morir sueltan la comida de su marca (~60 %) o sencillos; Wong, Ripley y Saga sueltan gaseosa, Cola Inglesa (~12 %) y vuelto |
| 4 | Tienda | PASA (tras corregir B2) | las 3 compras por tecla 1-3 y por clic; sin plata: «Aquí es precio Miraflores, joven.»; ESC y E cierran sin pausar; el juego queda congelado mientras está abierta; ESC normal sí pausa; con pausa por foco perdido ESC reanuda. Tras la corrección, 1-3 ya no usan el objeto rápido ni I/Tab abren la mochila |
| 5a | Inflables: golpes, desgaste, reventón | PASA | martillo 30 golpes, espada 35, pistola 40; al llegar a 0 suena `inflable.pop`, sale el toast y el objeto desaparece |
| 5b | Aturdimiento del martillo 0,6 s | PASA / no reproducido (reforzado) | midió 39 cuadros (0,65 s) en 12 configuraciones (4 estados, 3 distancias, 8 direcciones, de día y de noche). Ver B5 |
| 5c | Burbujas | PASA | 3 burbujas en abanico (10° por lado), alcance 110 px; el zombie queda embobado 92 cuadros (1,5 s), sin daño (hp igual) |
| 5d | Señuelo con F | PASA | el inflable queda suelto, el zombie a menos de 80 px pasa a `investigar` ~3 s y vuelve; se agarra otra vez con E |
| 6 | Comidas | PASA | hamburguesa +20, sánguche +25, pollo +30, chaufa +20, picarones +25 (sano: no se gastan); café: aliento al 100 % y `boostT` 15 s; cinta +10 de durabilidad (40→50), no se usa con la guitarra rota ni al 100 %. Con 15 % de «le cae mal» (`forceSick`) funciona el empacho |
| 7 | Piletas | PASA | Óvalo, NE y SO: +3 sencillos la primera vez, 0 la segunda |
| 8 | Punto de control | PASA | pasar la col 88: toast y `world.start` pasa a (1528, 616) = plazuela de la iglesia; morir ahí despierta en la iglesia; antes de la col 88 despierta en el Óvalo; reset vuelve al Óvalo |
| 9a | Jefa: tutorial de la rotonda | PASA | a <110 px: enjambre de 2 de vida (vive 8 s), toast, a los 4 s se va, toast «se fue para la Calle de las Pizzas», queda en la entrada; no se repite |
| 9b | Pelea: bloqueo, fritura, fases | PASA | de frente rebota (`boss.block`, la guitarra gasta 2); por el costado y la espalda quita 1; friendo, entra de frente; fritura 2,5 s (1,82 s en fase 3), salpicón 10 cada 0,8 s; fase 2: máx. 3 enjambres, picarones cada 4 s (10 de daño) y charco de miel; fase 3: de a 2, máx. 4, grita «Último picarón»; el charco frena al 50 % (13,3 px contra 26,7 px en 20 cuadros); la salida está sellada (BFS) mientras vive |
| 9c | Abejas | PASA | correr las deja atrás (254 px a los 4 s, se dispersan) y caminando alcanzan (−15 hp); agua: pierden el rastro 3 s, sin picaduras; Q con Titina: el enjambre la sigue ~4 s; gato: bufido, −0,5 de vida y 1 s distraída; carnada de miel: «comen» ~2 s. Daño de golpe por arma: guitarra 1, puñete 0,5, martillo 2, espada 1,5, piedra 1 (resortera real), burbuja 1 |
| 9d | Muerte de Alexander en la pelea | PASA | la jefa vuelve a 24/24 y a `espera`; sin enjambres ni charcos; sin barra; fuera `setBoss` |
| 9e | Victoria real | PASA | 24 golpes simulados por el flanco (fases 1→2→3), sin `killJefa`: suelta 4 picarones (y los sencillos), `boss.down`, afiche, cordel apagado; caminando por la ruta libre se llega a las filas 74–79 y sale la pantalla de victoria («¡LLEGASTE A LA CALLE DE LAS PIZZAS!», tiempo, fans, muertes; sin filas de gallinazos ni carretillas) |
| 10 | Música y audio | PASA | `musicEngine` es el de `rock.js`; explore «Twist del Malecón» 138 bpm, chase «Corre, pituco, corre» 172, horde «Picarones de fuego» 150, jefa «Picarones de fuego (jefa)» con `setBoss`; en la pelea `state().boss` = true y vuelve a false; noche 0,31 a 1 s; los 8 stingers (`kill`, `hurt`, `horde`, `death`, `win`, `boss.intro`, `boss.down`) sin error. Existen las recetas `bees.*`, `boss.*`, `shop.*`, `inflable.*`, `burbujas.*`, `pileta.coins`, `miel.splat`, `checkpoint`; las 39 frases de `voces-mira.js` incluyen todas las que se usan |
| 11 | Noche | PASA | a los 360 s (358 s: día; 362 s: noche), `triggerX` nulo; `zMul` 2,0 persiguiendo y 1,5 deambulando; trabajador de noche 44 px/s contra 64 del caminante |
| 12 | Rendimiento | PASA | con la pelea y 4 enjambres: `step(1)` 0,046 ms de media; con `render()` incluido 0,26 ms (0,60 ms de noche con 5 enjambres). Presupuesto 16,7 ms. Medido en canvas oculto: orientativo, no sustituye medir fps en un navegador visible |
| 13 | Tecla 2 en el título | CORREGIDO | ver B1 |
| 14 | Gambetta | PASA | `sh build.sh` ok; `dist/achorado.html` carga sin errores ni avisos; `routeCheck(12)` ok (536 pasos), `spawnCheck()` vacío, `bakeMs` 81, 42 zombies, golpe de guitarra quita 1 de vida; sin `ACH.nivel` ni `ACH.mira` |

## Bugs

### Corregidos (solo en `js/miraflores/*.js`)

| id | Dónde | Qué pasaba | Corrección |
|---|---|---|---|
| B1 | `nivel.js` | En el título, la tecla 2 hace en `game.js` `startIntro('cerro')`: `loadLevel('cerro')` falla («nivel desconocido: cerro»), pero igual arranca la intro y regala la mochila de prueba (resortera, molotov…). | Un oyente en captura en `window` (nivel.js carga primero) se traga Digit2/Numpad2 solo si `G.state === 'title'`. En juego, 2 sigue siendo objeto rápido. |
| B2 | `inflables.js` + `nivel.js` | Con la tienda abierta, las teclas 1-3 compraban y además usaban el objeto de la barra rápida (`inventario.js`, también en captura y registrado antes); I/Tab abrían la mochila encima de la tienda. Se vio con la espada: se quedaba en la mano al comprar. | `nivel.js` expone `ACH.mira.keyGate` (lista de filtros `fn(e) → true`) con un solo oyente en captura que corre antes que el de `inventario.js`. La tienda se registra ahí (`shopKey`). Además deja pasar ESC si el juego está en pausa. |
| B3 | `inflables.js` | «Alexander empieza con 3 sencillos» no se cumplía en el flujo real: se daban en `reset`, pero `inventario.js` vacía la mochila al entrar en `intro`. Resultado: 0 sencillos al empezar (solo funcionaba con `debug.start()`). | `reset` marca `startCoins`; los 3 sencillos se dan en el primer paso de juego. Comprobado: 3 sencillos al empezar por Enter. |
| B4 | `nivel.js` + `mundo.js` | Tras ganar, ENTER llama a `loadLevel('gambetta')`, que aquí no existe: aviso en consola y no reinicia (pasaba al título con el mundo sucio). | `ACH.levels.gambetta` = stub que devuelve el mismo mundo (`loadLevel` lo vuelve a hornear y resetea); `ACH.world.cfgNoche` = `{atTime 360, triggerX null}` para que el `levelHook` de `noche.js` no pise la noche del nivel. Resultado: victoria → ENTER → título limpio (jefa viva, 12 trabajadores) → ENTER → partida nueva. Sin avisos. |
| B5 | `inflables.js` (`onSwing`) | Aturdimiento del martillo. **No pude reproducir el fallo por el camino real del motor** (39 cuadros = 0,65 s en todas las pruebas). La única debilidad que encontré: el aturdimiento solo se aplicaba a zombies que ya estaban en `golpeado` (los marca `entities.hitZombie` justo antes de llamar al gancho), así que una llamada directa a `ACH.nivel.onSwing` —o cualquier golpe que el motor no marcó— no aturdía a nadie. | Ahora elige por el arco del golpe (alcance + media huella, ± arco/2, igual que `swingHit`), deja a cada zombie vivo del arco en `golpeado` y `stunT ≥ 0,6`. Comprobado: llamada directa → `golpeado`, 0,6 s; camino real → 39 cuadros; la guitarra no aturde. Si el fallo conocido era otro, falta saber cómo se midió. |

### Pendientes (no son del código de Miraflores o no se pudieron probar)

| id | Detalle | Propuesta |
|---|---|---|
| P1 | **Arte de Alexander con inflable en la mano no se pudo verificar.** El panel oculto suelta el contenido de los canvas (incluso en `achorado.html`: cuadros de Alexander y suelo con 0 píxeles tras cargar), y `arte-personajes` avisa «los cuadros de Alexander están vacíos: no se compone el inflable». Es un artefacto de la prueba, no del juego. | Revisar con capturas en un navegador visible (poses `inf_*_walk` / `inf_*_swing`). |
| P2 | Aviso de Web Audio: «Oscillator.frequency.value 24037.9 outside nominal range»: algún oscilador pasa de 24 kHz (se recorta solo, inocuo). | Buscar en `rock.js` / `sfx-mira.js` el `frequency` que sube de `sr/2`; limitarlo con `Math.min(…, 20000)`. |
| P3 | La mesa de pizzería (`mesaPizzeria`, huella real de 34 px) en (100,15; 64,6) tapa la mitad izquierda de la Calle de las Pizzas (4 tiles = 64 px). Sigue habiendo paso de ~22 px por la derecha (se llega a la salida caminando, y `routeCheck(12)` pasa), pero camino recto hacia el sur se atasca. | Opcional: moverla a c ≈ 99,6 o dejar el hueco a propósito. Es cuestión de diseño. |
| P4 | `noche.js` solo se actualiza desde `render()` (o un rAF de respaldo): con el panel oculto la noche no avanza por tiempo. Para pruebas hay que llamar `ACH.noche.update(G)`. No es un bug del juego. | — |
| P5 | `game.js` línea del título: `I.pressed('Digit2')` arranca el Cerro aunque la página no lo tenga (la causa de B1). | Si el motor lo quiere arreglar de raíz: comprobar `ACH.levels && ACH.levels.cerro` antes de `startIntro('cerro')`. En Miraflores ya queda tapado desde `nivel.js`. |

## Archivos tocados

- `juego/js/miraflores/nivel.js`: B1, B2 (`keyGate`), B4 (`ACH.levels.gambetta`)
- `juego/js/miraflores/inflables.js`: B2 (`shopKey`), B3 (`startCoins`), B5 (`onSwing`)
- `juego/js/miraflores/mundo.js`: B4 (`cfgNoche`)

No se tocaron `js/engine/*`, `js/sprites/*`, `js/audio/*`, `index.html` ni los `.md` del juego.
`dist/miraflores.html` y `dist/achorado.html` están reconstruidos con el estado final.
