# QA v0.15 «Personajes HD» — informe

Fecha: 2026-11-22. Probado desde fuente (index, miraflores, costaverde, barranco .html) en Chrome del panel (pane OCULTO: rAF ~1,5 fps, así que los FPS de pantalla no se miden; los costos son de `render()` forzado cuadro a cuadro con vaciado de GPU). Vista 400×300 lógica, #world 800×600 (K=2), lente ALTO. Servidor propio en 8775, ya apagado. No se tocó código del juego (0 correcciones), no se publicó, no se reconstruyó dist/.

## Veredicto global
**PASS con reservas.** Las 4 páginas cargan y se juegan con HD sin errores de consola, la silueta/ancla HD coincide con el 1× (verificada sprite por sprite), el costo es bajo (+0,4 a +0,9 ms de CPU por cuadro, +0,7 a +1,7 ms con GPU), pérdida de contexto, puntería y OPCIONES funcionan. Hay 3 fallos que conviene corregir antes de publicar: (1) la calidad automática baja HD a CLÁSICO por el intervalo de rAF, no por el costo (afecta a cualquier jugador sin elección previa con rAF < 45 fps), (2) cada cambio HD↔CLÁSICO filtra ~3 lienzos GPU / ~7 MB que no se liberan, (3) las variantes por semilla casi no se ven (≈1–3 % de píxeles).

## Tabla de casos
| # | Caso | Resultado | Evidencia corta |
|---|---|---|---|
| 1 | 4 páginas sin errores; `?hd=0` = v0.14 | PASS (con matiz) | 0 errores/warn en las 4 (hook error/warn/unhandledrejection + sesión completa). `?hd=0` → K=1, #world 400 px, `ACH.hd.built=0`. Contra el respaldo `respaldos/juego-v014-antes-hd` (Gambetta y Cerro, firma de bloques 8×8, misma escena sin zombis): diferencia media 2,6–2,8/255 (ruido propio 0,55), 0,4 % y 1,9 % de bloques >8. Es difusa (luz/sombras suaves), no un sprite; no es bit a bit. Miraflores/CV/Barranco solo se verificaron con K=1 y sin errores, no contra el respaldo. |
| 2 | HD en su lugar exacto | PASS | Verificación automática de máscara HD (2×2 → 1 píxel) contra el 1× de TODOS los sprites dibujados: Gambetta 186, Cerro 133, Miraflores 58, CV 209, Barranco 126 → sólo 2 con diferencia (ver F6/F7). Capturas de Alex en 10 poses, zombis, destello, silueta tras el bus, Titina (`titina.fly.1` HD), perros, gatos, gallinazos. Pies/sombra alineados con CLÁSICO. |
| 3 | Variantes distintas | PARCIAL | `src(img, v)` sí da 3 versiones (zvar 80–128 px HD de ~4200 distintos; trabajadores Belisario/Wong/Ripley 29–53 px) y el motor pasa `id%3` (WeakMap). Pero la diferencia es sólo en ojo/cicatriz (≈1–3 %): a escala de juego dos trabajadores de la misma marca se ven prácticamente idénticos, y 1 de cada 3 pares es idéntico (sólo 3 semillas). Ya no «salen idénticos» a nivel de píxel, pero no se distinguen. |
| 4 | Puntería | PASS (resortera) / PARCIAL (molotov, táctil) | Cursor→mundo idéntico con HD y sin HD en ALTO, MEDIO y CLÁSICO (5 puntos, 0 diferencia); `toScreen(toWorld(p))=p`. Resortera: ángulo de la piedra −23,7° vs −24,0° al cursor (igual HD/no HD). Molotov comparte el mismo camino de puntería; mi segundo intento de disparo falló por mi arnés (ammo), así que no hay medición directa. Táctil: código sin dependencia de K (`scaleK` lógico); aimSling corre en el rAF del panel oculto y no se pudo medir. |
| 5 | Jefes en HD | PASS | Presidenta (`zvar.presidenta`), Doña Chancaca (`mira.picaronera`), Maestro Wantán (`cv.chef`), Don Jaranón (`br.jaranon`) dibujados en HD en su lugar, con detalle. Capturas. |
| 6 | Calidad automática | FAIL (diseño) | Ver análisis abajo. Reproducido 3 veces. |
| 7 | Costo | PASS (con F2/F4) | Ver tabla de costos. Lienzos GPU: crecen (F2). |
| 8 | Pérdida de contexto | PASS | `simulate('restored')` y `simulate('never')` (Barranco): K=2, #world 800 px, atlas regenerado (1 página), Alex en HD tras ambos; 0 errores. |
| 9 | Táctil | PASS (con reserva) | `?touch=1`: en vertical sale el aviso de girar (esperado); horizontal 812×375: el stick mueve a Alex (68 px en 30 pasos), 0 errores, K=2 por defecto. Puntería del botón de resortera no verificable con rAF frenado (ver caso 4). Viewport devuelto a desktop. |
| 10 | OPCIONES | PASS | Fila «PERSONAJES: HD \| CLÁSICO» cambia en vivo (#world 800↔400, `ach.hd` '1'/'0'), se conserva al recargar (index, miraflores, costaverde) y funciona en Barranco (en vivo). |
| 11 | Revisión visual | PASS con notas | Ver sección; las caras de zombis de perfil siguen sucias (F5). |

## Costos medidos (ms por cuadro de render, ALTO, escena densa, 100–120 cuadros, sin cuadros de calentamiento)
«CPU» = tiempo dentro de `ACH.render.render` (incluye la lente); «GPU+» = además `getImageData` del #world y lectura de la lente (sincroniza GPU).

| Página | HD CPU medio (p95) | CLÁSICO CPU medio (p95) | Δ CPU | HD GPU+ | CLÁSICO GPU+ | Δ GPU+ |
|---|---|---|---|---|---|---|
| Gambetta (42 zombis) | 1,55–1,68 (2,3) | 1,10 (1,2) | +0,5 | 4,1–4,2 | 3,3–3,4 | +0,7–0,9 |
| Cerro | 0,99–1,27 (2,0) | 0,61–0,63 | +0,4–0,6 | 3,4–3,9 | 2,7 | +0,7–1,2 |
| Miraflores | 1,09–1,22 (2,6) | 0,58–0,66 | +0,5–0,6 | 3,5–3,9 | 2,7 | +0,8–1,2 |
| Costa Verde (71 zombis) | 1,2–2,0 (4,2) | 0,85–1,08 | +0,3–0,9 | 3,7–4,9 | 2,9–3,2 | +0,7–1,7 |
| Barranco | 1,5–2,0 (4,2) | 1,05–1,07 | +0,4–0,9 | 4,1–4,8 | 3,2 | +0,9–1,6 |

Todo muy por debajo de 16,7 ms. FPS reales de pantalla **no medidos** (pane oculto): queda pendiente confirmar ≥55 FPS con el panel visible.

**Tirón del atlas (generación perezosa)**
- Primer cuadro del nivel (JIT frío): 47–54 ms.
- Vaciar el atlas (`ACH.hd.clear()`, lo que hace un rehorneado) y volver a dibujar Gambetta: **47 ms** en un solo cuadro (≈140 sprites a la vez).
- Al avanzar por el nivel: 7–13 ms en los cuadros que muestran sprites nuevos (hasta 29 sprites nuevos en una parada); máximos de recorrido: Gambetta 8,8, Cerro 3,2, Miraflores 13,1, CV 9,6, **Barranco 23,3 ms**. Generación: 0,28–0,76 ms/sprite de media, máx 5,1 ms (`zvar.br_poeta`).
- Un cuadro suelto de 14–47 ms no baja la calidad (ver caso 6): sólo es un pico.

**Atlas tras recorrer el nivel (rejilla 8×4 con zombis)**: Gambetta 2 páginas (224 sprites, 45 %), Cerro 2 (165), Miraflores 1 (58), Costa Verde 2 (320, 74 %), Barranco 2 (242, 60 %). 4 MB por página (CPU). Con juego continuo y 3 variantes por zombi llegué a 4 páginas / 538 sprites en Gambetta.

**`ACH.lienzo.stats()`** (HD vs `?hd=0`, tras el mismo recorrido):
- Gambetta: canvas 67,8 MB (HD) vs 36 MB; GPU 10 vs 3,1 MB; lienzos GPU 8 vs 8. 
- Costa Verde: canvas 130,5 vs 92,7 MB; GPU 21 vs 3,1 MB; lienzos GPU 20 vs 8; total 160 vs 127 MB.
- **FALLO F2**: cada cambio HD↔CLÁSICO añade ~3 lienzos GPU y ~+7 MB sin liberar (CV, 6 cambios: 7→25 lienzos GPU, 128→151 MB). Entre el cambio de HD del jugador y el auto‑drop se acumula.

## Caso 6 — calidad automática (análisis)
Código: `postfx.monitor()` (postfx.js ~425) llama a `autoDrop('auto')` si la **media de dt entre cuadros de rAF** durante 4 s (≥30 cuadros) supera `P.slowMs = 22`; `render.js hdAutoDrop` → `hdAutoOff = true` (sólo si `hdUser===null`, es decir el jugador nunca tocó la fila ni `?hd=`). En táctil, `tactil.perf` hace lo mismo con media > 20 ms (ventana de 3 s) por la misma vía.

Pruebas (pestaña visible según `document.hidden=false`, render real de 0,5 ms):
- 60 fps con un pico aislado de 100 ms cada 60 cuadros durante 5,5 s: **no baja**. Un pico aislado, incluido el primer cuadro del atlas (14–54 ms), no la dispara: el promedio de 4 s lo absorbe (cada pico de 100 ms suma ~0,35 ms a la media; harían falta ~15 picos de 85 ms por ventana).
- Intervalo constante de 33 ms (30 fps) con render de 0,5 ms: **baja HD a CLÁSICO** en 4 s (`avgMs 25,1`, `renderMs 0,54`), y luego la lente.
- Reproducido otras 2 veces por accidente con el pane oculto/throttled: `by: tactil, avgMs 21,7` y `avgMs 51,1` (el modo táctil quedó persistido en `achorado.touch`).

Conclusiones:
1. El criterio mide el **intervalo de rAF, no el costo real**. Cualquier cosa que limite rAF por debajo de ~45 fps sin que el juego sea lento lo dispara: ventanas tapadas/segundo plano (el pane del panel), Safari en modo bajo consumo (30 fps), pantallas de 30–50 Hz, DevTools abierto, tabs parciales. Esos jugadores pierden HD y no lo recuperan (no hay vuelta atrás salvo la fila PERSONAJES).
2. Pestañas ocultas: ya se ignora `document.hidden`, pero no una ventana sin foco/ocluida (rAF reducido, `document.hidden=false`). Debería ignorarse si `!document.hasFocus()`.
3. Picos aislados: ya están bien absorbidos (ventana de 4 s, promedio, descarta dt>120 ms); no hace falta cambiar nada ahí.
4. Orden del descenso: baja primero HD (cuesta +0,5–0,9 ms) y sólo después la lente (que es lo caro). En una máquina realmente lenta, bajar HD primero casi no ayuda y retrasa 4 s la bajada útil.
5. Sugerencia (no trivial, no tocado): decidir con el costo medido (`ACH.render.hd.stats().renderMsAvg` + tiempo de GPU) o exigir que además de intervalo > 22 ms haya costo propio alto (p. ej. render > 6 ms), ignorar sin foco, y permitir re-subir tras N s buenos.

## Caso 11 — revisión visual
- Alexander (todas las poses probadas), Titina, perros, gatos, gallinazos y trabajadores de Miraflores salen nítidos y con rasgos legibles; sombra y pies coinciden con CLÁSICO; el destello blanco del golpe es una silueta HD blanca correcta; tras el bus se ve la cabeza HD y la silueta fantasma.
- Jefes (presidenta, Doña Chancaca, Wantán, Don Jaranón): bien. Doña Chancaca y la presidenta se ven algo «granulados» (mucho ruido de sombreado en vestido/mandil).
- **Perfil de zombis (≈6 px de cabeza)**: el moteado + cuencas + heridas ensucian la cara; en variantes `camina_normal_buzo` aparece un patrón de **damero** en la cuenca del ojo (contra la regla de B). Uniformes blancos (enfermera) con ruido de píxeles sueltos. Los zombis siguen siendo distinguibles por ropa/cuerpo, pero la cara de perfil es lo más débil.
- **Tipos `cobrador`, `ciego`, `escolar` en Gambetta**: salen como skins `zvar` (p. ej. `cojo_normalFlaco_overol`), así que los accesorios de Agent B (gorra/placa del cobrador, lentes del ciego, tirantes del escolar) no aparecen: no son reconocibles por tipo (también pasa en CLÁSICO; no es regresión, pero la meta «cada tipo se reconoce» no se cumple para esos 3).
- **Siguen a 1×** (contador sobre `ACH.hd.src`, lienzos ≤160 px devueltos con null, tras recorrer Gambetta): sólo props (basura, conos, bolsas, anticuchos, triciclo, emoliente, choclo, coche de bebé, mototaxi, barrera, carteles, tico) y luces; `fx.siluetaVentana` (a propósito). No se vio ningún personaje a 1× en Gambetta. En otros niveles lo reportado por C/D y que no se re-verificó aquí: Barranco `br.pj.caballete` y props de la peña; cuarto de Alex (`base.js`), cinemática final de Barranco, caída libre «El Tablazo» y cinemática de Chorrillos (lienzos propios 1×).
- La lente ALTO con K=2 ya no redondea los ojos: se ven.

## Lista priorizada de fallos
| # | Prioridad | Fallo | Dueño |
|---|---|---|---|
| F1 | Alta | Auto‑calidad por intervalo de rAF (no costo): jugadores con rAF < 45 fps (Safari bajo consumo, ventana sin foco, monitor lento) pierden HD sin recuperarla; HD baja antes que la lente aunque es lo barato. Ignorar `!hasFocus()`, usar costo real, permitir volver a subir. | motor: postfx.js (`monitor`, `autoDrop`), render.js (`hdAutoDrop`/`hdCanDrop`), tactil.js (`perf`) |
| F2 | Media | Fuga de lienzos GPU al cambiar K (HD↔CLÁSICO): +~3 lienzos y +~7 MB por cambio, no se liberan (`resetBuffers` crea nuevos entC/flaC/npcC/rim sin soltar los viejos). | motor: render.js (`resetBuffers`/`setK`), volumen.js (rimPass), lienzo.js (destrackear) |
| F3 | Media | Variantes casi invisibles (≈1–3 % de píxeles) y sólo 3 semillas: dos trabajadores de la misma marca/skin se ven iguales. Subir el efecto (cicatriz/marca/accesorio/tono de piel por semilla) y/o más variantes. | hd.js / hd-callao.js (semilla/`src` v), hd-mira-cv.js (fotocheck/pelo por variante) |
| F4 | Media | Pico de generación de atlas: 47 ms al vaciar/rehornear y 14–54 ms en el primer cuadro; 23 ms en Barranco al avanzar. Precalentar con `ACH.hd.warm` en carga de nivel/tras rebake o repartir por cuadro. | hd.js (`warm`/`build`) + motor render.js (llamada tras `onRebake`/carga) |
| F5 | Media | Caras de zombi de perfil sucias (moteado, cuencas, heridas) y damero en la cuenca (`camina_normal_buzo`); uniformes blancos ruidosos. Bajar moteado/densidad en cabezas ≤ 6 px. | hd-callao.js (familia zombie); afecta también a hd-mira-cv.js (la hereda) |
| F6 | Baja | Presidenta: silueta HD desfasada respecto al 1× (66 píxeles faltan/26 sobran sobre 3080, por el re‑muestreo de su frame suavizado). Visualmente aceptable. | hd-barranco.js (familia `presidenta`) |
| F7 | Baja | `zvar.bici_alto_polo.extra.prop` (bici del ciclista): el HD no cubre 49 px de la silueta 1×. | hd-callao.js / hd.js (base `upscale` para props de zvar) |
| F8 | Baja | Los tipos `cobrador`/`ciego`/`escolar` de Gambetta se dibujan como skins `zvar` sin sus accesorios HD, no se reconocen por tipo. | hd-callao.js (hacer que el match llegue a esos skins) + motor/zombis (asignación de skin) |
| F9 | Baja | Fuera de alcance/1×: cuarto de Alex, cinemática final de Barranco, caída libre, Chorrillos, props de la peña/caballete. Ya documentado por C/D. | motor (módulos de base/cine) / hd-barranco.js |
| F10 | Info | `ACH.hd.setOn()` (hd.js) escribe `localStorage['ach.hd']` por su cuenta: cualquier llamada externa «fija» la elección del jugador y desactiva la auto‑calidad en la siguiente carga. | hd.js |

## No verificado / límites
- FPS reales con el panel visible (pane oculto durante toda la sesión).
- Puntería del molotov con medición directa, y del botón táctil de resortera (rAF frenado).
- Persistencia de la fila PERSONAJES tras recargar en Barranco (sí en vivo); firma contra v0.14 sólo en Gambetta y Cerro.
- Titina y gallinazos se comprobaron en HD en Gambetta; no se probaron en Miraflores/CV/Barranco.

## Capturas (`diseno/qa-hd/`, prefijo `qa-`)
Alex: `qa-alex-poses-hd.png`, `qa-alex-hd-vs-clasico.png`. Gambetta: `qa-gambetta-zombies-hd-vs-clasico.png`, `qa-gambetta-animales-titina-hd-vs-clasico.png`, `qa-gambetta-silueta-destello-hd-vs-clasico.png`, `qa-gambetta-silueta-alex-tras-prop-hd-vs-clasico.png`, `qa-titina-volando-hd-vs-clasico.png`, `qa-lineup-zombies-gambetta-x3-hd.png`. Variantes: `qa-variantes-mismo-zombi.png`, `qa-variantes-x6-v012.png`. Cerro: `qa-cerro-juego-hd.png`, `qa-cerro-presidenta-hd-vs-clasico.png`. Miraflores: `qa-miraflores-juego-hd.png`, `qa-miraflores-jefa-hd-vs-clasico.png`, `qa-miraflores-trabajadores-hd.png` / `-clasico.png`. Costa Verde: `qa-costaverde-juego-hd.png` / `-clasico.png`. Barranco: `qa-barranco-jefe-juego-hd.png` / `-clasico.png`, `qa-barranco-tras-restored-hd.png`, `qa-barranco-tras-never-hd.png`. Táctil: `qa-tactil-gambetta-hd.png`.

## Limpieza
Servidor 8775 apagado, pestaña cerrada, viewport en desktop. Claves de localStorage de prueba (`ach.hd`, `ach.gfx`, `achorado.touch`, `qa.sig.*`) eliminadas del origen 127.0.0.1:8775.
