# QA-2 v0.13 · Kennedy (miraflores.html), Costa Verde (costaverde.html) y viajes

Servidor propio `ruby -run -e httpd . -p 8792` desde la carpeta fuente (apagado al terminar), pestaña propia del panel. Sin build ni publicación.
Método: `ACH.debug.*`, `ACH.game.step(n)`, teclas reales (diálogos, E, P, ESC, Q), `computer.key` para el título de index.html y la pausa, y espera en tiempo real para Chorrillos, el chef y el salto. El panel quedó oculto a ratos y la autopausa se disparaba: se reanudó con `ACH.game.resume()`. Para ver el canvas con el panel oculto se llamó a `ACH.render.render` y se movió el mouse antes de capturar.

Veredicto: **listo para publicar: sí**, con el arreglo de `partida.js` que hice (ver abajo). Sin ese arreglo, CONTINUAR en Kennedy resucitaba a la jefa vencida.

## Tabla PASS / FAIL

### Kennedy
| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| K1 | 9 emboscadas por zonas de disparo | PASS | Teleport a cada franja: las 9 salen una vez (`emb()` 9/9); trabajadores, turistas, 2 joggers y sereno |
| K2 | Skins nuevos turista / jogger / sereno | PASS | `ACH.sprites.zv13.sheet` (3 poses + herido + muerto) y sereno en juego (quepí, silbato, aviso «¡EL SERENO PITÓ…!») |
| K3 | Turista: flash que aturde 1 s | PASS | `stunT` máx 1,0 a ~35 px con vista |
| K4 | Jogger -15 % (72 px/s) | PASS | Recorre 72 px en 1 s, el jugador camina a 80 |
| K5 | Chancaca vida 35 | PASS | `jefa().hp = 35/35` |
| K6 | Embestida y aturdimiento | PASS | Fases `warn → run → recover → back`, 13 de daño al jugador; `trial(4,{smart:true})`: 4 choques con aturdimiento en la 1.ª pelea |
| K7 | Diálogo con retrato (Chancaca, pintor) | PASS | Cara y rótulo «DOÑA CHANCACA» / «EL PINTOR» completos, en 800×904 y en 844×390 |
| K8 | Campana | PASS | Dispersa los 3 enjambres, aturde zombis, cd 60 s respetado (2.º E no la toca) |
| K9 | Kit anti-abejas | PASS | Spray «RAYIT» (pintor, S/5) baja las abejas de 4,0 a 1,6 y dispersa una; repelente 25 s y pañuelo 40 s (Doña Rosa) se usan |
| K10 | Don Pepe en la ruta | PASS | Puesto en (1582, 666), junto a la iglesia (1528, 616); E abre su tienda |
| K11 | Gatos acariciables | PASS | E cuenta +1 (toast «Gato acariciado (n/26) · Cat Park n/5») |
| K12 | Compañero con 5 del Cat Park | PASS | Se adopta el 5.º, sigue a Alexander y corre a esconderse cuando hay abejas |
| K13 | Contador de gatos en la victoria | PASS | «GATOS ACARICIADOS 5 / 26» |
| K14 | Encargo del pintor | PASS | Diálogo, 1 retrato real con Q (G.qT sube, «¡CLIC!»), `retrato(5)` → listo → pago `cuadroGatos` al cuarto (`achorado.base.v1.almacen`) |
| K15 | Techos / caminos | PASS | Bordes irregulares, hojas y charcos a la vista; gravilla y ladrillo en lotes vecinos (los techos se ven poco desde la ruta) |
| K16 | Noche en fase 3 | PASS | `noche.night = true`, cartel «SE HIZO DE NOCHE…»; al morir en la pelea vuelve el atardecer |
| K17 | Micrófono + `cura-3` | PASS | `concierto.tiene('microfono')`, entradas `cura-3` y `pieza-microfono` |
| K18 | +3 sencillos solo sin carry | PASS | Arranque directo: 3; llegada con carry (3 sencillos): se queda en 3 (CV con 30: sigue 30) |
| K19 | Victoria → Costa Verde con carry | PASS | Mochila (sencillos, anticuchos), hp 50, árbol (xp 50 / nv 3), dificultad Bravazo, `camas:['miraflores:miraflores']`, diario y micrófono llegan idénticos |
| K20 | Bolsa de muerte | PASS | Se suelta la mitad de los sencillos, flecha amarilla en el borde, «¡TU BOLSA, CAUSA!» al recogerla |
| K21 | Dificultad aplicada | PASS | Achorado ×1,3 (10 → 13); selector en la pausa |
| K22 | Barra de la jefa vs objetivo | PASS | `body.boss-on` esconde `#objLine` mientras hay barra |

### Costa Verde
| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| C1 | Más zombis en faro / puente / Letonia | PASS | 71 al arrancar: faro 9, puente 4, Letonia 14; `spawnCheck()` vacío, `routeCheck` ok (1328 pasos) |
| C2 | Turista del dron (mini-jefe) | PASS | Aparece al cruzar col. 206–224, diálogo con retrato, barra «EL TURISTA DEL DRON», marca y llamado; muerte: +60 XP y bandera |
| C3 | Locales de Larcomar | PASS | E en Cinépolis, Estarbaks y Tantita entra; sala aislada, SALIDA devuelve afuera; humor en cartel («SALA 4: LA FUNCIÓN YA EMPEZÓ…») |
| C4 | Barista y rey del selfie | PASS | Vaso caliente (−10,4 en Achorado), selfie encandila 0,28 s; skins nuevos en las salas |
| C5 | Heladero en terrazas | PASS (código) | 3.ª ruta en `HELADERO_PATH` validada por `spawnCheck`; no lo vi recorrerla en vivo |
| C6 | 3 parapentistas + cura-4/5/6 | PASS | Chalo (4 zombis), Mayra (helado, a ≤30 px), Brayan (pelota); diario `cura-4/5/6`; los regalos caen al suelo |
| C7 | Perros compañeros | PASS | E con zombi a ≤220 px: ataca (zombi de 6 vida muere en ~5 s), compañero 20 s, luego se va |
| C8 | Helado 4,5 s | PASS (código) | `HEL_FREEZE = 4.5` en `juguetes.js:592` |
| C9 | Cámara faro y Beso | PASS | Faro entero (cam y 221) y Beso entero (cam y 284) en pantalla |
| C10 | Chef +150 XP | PASS | nv4/94 → nv6/24 = +150 |
| C11 | Cuarto bloqueado en pelea | PASS | `canEnterBase` → «¡Con el chef encima no hay cuarto que valga!»; H no sale |
| C12 | Caída: abanico, aviso 9 s, voces, contador de barras | PASS | `hintSec 9` con el cartel de 2 líneas visible; bot de abanico gana en 89 s; «BARRAS X3 - +30 %»; voz «¡Cuidado con la tabla!» al pasar de fase |
| C13 | Tablazo +200 XP | PASS | nv6/24 → nv7/84 = +200 |
| C14 | Ampli | PASS | `tiene('ampli')` y cartel «PIEZA DEL CONCIERTO: EL AMPLI» |
| C15 | Pausa en Chorrillos / chef / salto | PASS | Chorrillos: ESC pausa el montaje con cartel «PAUSA»; salto: ESC/P congela y reanuda (y/z fijas 1,5 s); chef: cartel PAUSA en 'entrada' y reanuda. La pausa del chef no la medí con reloj, solo estado y cartel |
| C16 | Victoria → mapa con Barranco / Chorrillos | PASS | Mapa con Miraflores ✓ y Barranco y Chorrillos desbloqueados; carry y `partida` (`level:'mapa'`) guardados |
| C17 | Barra del chef / dron vs objetivo | PASS | `#chefBar` arriba; `#objLine` oculto en ambos |
| C18 | Bolsa y dificultad en CV | PASS | Bolsa recogida en Larcomar; daño ×1,3 y ×1,6 |
| C19 | Fosfo avisa de las barras | PASS | «Llévate barras, causa: en el aire brillan y pegan más.» |

### Globales y viajes
| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| G1 | Retratos con nombre completo | PASS | `.dlgx-name` crece a la derecha (left 9 px de 844); «DOÑA CHANCACA» entera |
| G2 | CONTINUAR desde index tras guardar en CV | PASS | Título «CONTINUAR · COSTA VERDE · RECIÉN» → costaverde.html en el borde, chef muerto, reja abierta, cp `borde`, sin intro |
| G3 | CONTINUAR desde index tras guardar en Kennedy | **FAIL → arreglado** | Antes: jefa viva y emboscadas otra vez (flags `{}`). Después: jefa `muerta`, 9 emboscadas hechas, arranca en la plazuela con el objetivo correcto |
| G4 | «Salir al título» | PASS | Mensaje «Tu partida queda guardada. Desde el título: CONTINUAR.» → index con CONTINUAR («PARQUE KENNEDY · RECIÉN») |
| G5 | CONTINUAR con `fresh` (tras ganar) | PASS | Index → costaverde.html con intro, vida, sencillos, nivel 8, micrófono y ampli |
| G6 | Táctil `?touch=1` 844×390 | PASS | `tcBag/Rec/Casa/Arbol/Pause/Mute/Full` 44 px; Guitarrazo 100, Saltar y Titina 66; contexto E (TOCAR, COMPRAR, ACARICIAR, ENTRAR, DAR) 66 px; botón de victoria 46 px |
| G7 | Destellos con «reducir destellos» | PASS (código) | `fx.calma()` en `dron.js:213`, `zombis.js:515`, `emboscadas.js:316-327` (velo del 14 %) |
| G8 | Consola | PASS | 0 errores y 0 avisos (`console.warn/error` enganchados) tras recorrer los 12 lugares de Kennedy, 15 de CV, 3 salas y los diálogos; sin 404 en red |

## Bugs
### Alta (arreglado)
1. **CONTINUAR en Kennedy revivía a la jefa y perdía las banderas `miraflores.*`.** Repro: `miraflores.html?debug=1`, ENTER, `ACH.debug.mira.killJefa()`, «Salir al título», CONTINUAR → la jefa vuelve a `rotonda` y la partida guardada queda con `flags:{}`.
   Causa: `game.js init()` hace `resetWorld()` antes de `viaje.take()`. El 1.er `nivel.reset` ve `continuando() = false`, llama `freshLevel` y `flagsInit` deja `FL = {}` para siempre. CV no lo sufre porque su `nivel.js` toma el viaje antes.
   Arreglo: `js/engine/partida.js:85-86`. `flagsInit` recuerda si se armó sabiendo que se continúa (`FLc`) y se vuelve a armar desde la ranura cuando `continuando()` pasa a true. También cubre las banderas de Gambetta y Cerro cuando se llega a index.html con CONTINUAR desde otra página (QA-1 puede revisarlo).

### Media (arreglado)
2. **Objetivo equivocado al continuar con el chef vencido.** Mostraba «Baja por Larcomar hasta el chifa…» en vez de «Tírate en parapente…». Arreglo: `js/costaverde/locales.js:168-169` no pisa el objetivo si `ACH.cv.flag('chef')`.

### Baja (sin arreglar)
3. El cartel de póster «¡LA CALLE DE LAS PIZZAS ESTÁ LIBRE!» (muerte de Chancaca) queda por encima del menú de pausa si se pausa mientras está. Cosmético.
4. El cartel «PIEZA DEL CONCIERTO» de Chorrillos tapa el título y los números de la pantalla de victoria durante ~5 s.
5. En Bravazo el turista del dron gana +1 de vida (`zHpBonus` solo excluye jefes marcados). Es mini-jefe: conviene `noDifHp` en `dron.js`.
6. El autoguardado de la muerte de Chancaca ocurre antes de la XP del premio: si se sale en ese instante, CONTINUAR devuelve sin los 150 XP hasta el siguiente guardado (30 s).
7. El objetivo largo de CV («Baja por Larcomar hasta el chifa · hay locales abiertos (E en la puerta)») roza la caja del HUD en un panel de 800 px. Es solo estético.
8. Nombre del retrato de la olla del Cerro: «LA SEÑITO» (R lo dejó así por el largo del rótulo; con el rótulo ya arreglado puede ser «LA SEÑORA DE LA OLLA»). Fuera de mi alcance.
9. Al CONTINUAR, el nivel recrea zombis, jefe del Cerro/Gambetta sin bandera, props y gatos (documentado por A1). CV: `cp` y chef sí vuelven bien.

## Arreglos hechos
| Archivo | Línea | Cambio |
|---|---|---|
| `js/engine/partida.js` | 85-86 | `flagsInit` recarga las banderas si `continuando()` cambia a true después de armarlas (var `FLc`) |
| `js/costaverde/locales.js` | 168-169 | No sobrescribe el objetivo si el chef ya está vencido (`ACH.cv.flag('chef')`) |

Sintaxis revisada con JavaScriptCore (ok) y re-probada en el navegador con recarga forzada.

## No probado / limitaciones
- Heladero recorriendo las terrazas A y B (solo validación de ruta con `spawnCheck`).
- Reducir destellos medido a ojo: solo lectura de código (S ya midió 539 vs 281).
- Techos variados por lote: solo vi gravilla y ladrillo desde la ruta.
- Pausa del chef en la secuencia de entrada: probé cartel y reanudación, no el congelado con cronómetro.
- Tablazo y caída con teclado/táctil reales (usé el bot `fan`); caída en táctil.
- CONTINUAR con `restIdx` de Kennedy (no tiene descansos) y con almacenamiento bloqueado.
- Tranqui y Bravazo en muerte/bolsa (solo Achorado y daño de Bravazo).
- Partida nueva completa desde Gambetta pasando por Kennedy (eso lo cubre QA-1 y la prueba de carry la hice con `winGo`).
