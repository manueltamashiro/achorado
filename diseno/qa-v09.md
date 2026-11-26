# QA v0.9 — «EL CERRO» (nivel 2)

Probado en el navegador integrado sobre `dist/achorado.html` (puerto 8761) y `index.html` (8762), manejando el juego con `ACH.game.step`, `ACH.input.*` y `ACH.debug.*`, más capturas de pantalla. Servidores apagados al terminar. `dist/achorado.html` queda construido con los arreglos (2 390 986 bytes).

## Resultado en una línea
La v0.9 funciona como dice el SPEC. Se corrigieron **3 bugs** (no había ninguna escoba de pared en el mapa, las señoras se veían blanquecinas, la aturdida del contragolpe era 0,75 s en vez de 1 s). Quedan solo detalles menores y de diseño. **Recomiendo publicar.**

## Pruebas (OK / FALLA)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Flujo: título → nivel 1 → ganar → «ENTER — SUBIR EL CERRO» → intro del Cerro. Se conservan mochila (piedras 7, anticucho 2, cuerdas 1 y sus atajos), vida (47), guitarra (33), objeto en la mano (skate), fans (12) y muertes (3); el suelo se limpia | OK |
| 1 | Morir en el Cerro y despertar en el último punto de descanso (descanso 1: 704,1736; guitarra 60/60, vida 100). Llegar a la cruz → «LLEGASTE A LA CIMA» con tiempo, fans, muertes, gallinazos espantados y carretillas esquivadas; Enter → título | OK |
| 1 | Tecla 2, botón «NIVEL 2: EL CERRO» y `?nivel=cerro` (con el kit: resortera, 20 piedras, 1 molotov, 2 botellas, 2 trapos) | OK |
| 1 | Volver al nivel 1 después del Cerro: 42 zombies, 0 señoras, 0 gallinazos, 0 carretillas, 0 fuego, 0 gallinas; el audio vuelve a `level: gambetta` | OK |
| 2 | Pendiente: plano 80 px/s; ladera 1 → 68 subiendo y 84 bajando; ladera 2 → 61 subiendo; escalera 68 (×0,85) y 84 (×1,05); correr cuesta arriba gasta ~30 % más de aliento (8,1 vs 6,3) | OK |
| 2 | Salto con C: altura 14 px, 0,53 s, cuesta ~10 de aliento, enfriamiento 0,25 s, no ataca en el aire, no salta con menos de 10 de aliento, no pasa sólidos | OK |
| 2 | Botón SALTAR con `?touch=1` (evento de puntero: sube a z 10,3 y aterriza); pulsación larga en el botón de resortera cambia a MOLOTOV | OK |
| 3 | Carretillas: en 12 min simulados (21 carretillas) la separación mínima fue 29,8 s (máx. 44,8 s) y nunca hubo dos a la vez; aviso de 1,5 s con flecha amarilla en el borde y grito; choque: 18 de daño, empuje 90 cuesta abajo, Titina sale volando; saltarla: «¡OLÉ!» y cuenta en las estadísticas | OK |
| 3 | Atropella zombies (2 de daño), final del carril: pasajero `gusano`, carretilla rota, botín de mercado; tumbarla con molotov y con la tele (el pasajero cae antes) | OK |
| 4 | Baldazo: aviso 0,6 s con globo y cono, 6 de daño, mojado 4 s, charco; salir del cono o saltar lo esquiva (z > 6); recarga o pelea de contacto; el baldazo apaga el fuego y el charco apaga el molotov que caiga encima | OK |
| 4 | Ollazo: levanta 0,47 s, 14 de daño, aturde 0,3 s; contragolpe: daño doble y aturdida (**ahora 1 s**, antes 0,75); la olla rebota solo la piedra de frente (guitarra, fuego y molotov pasan) | OK (tras arreglo) |
| 4 | Cola del cisterna (calma a 80 px, enojadas a 40 px con línea de vista, 5 señoras), olla común (4 señoras, calma hasta que las golpeas, vuelven a cocinar a los 20 s, al tumbarlas queda `taper` en el fogón), botín (sencillo 48 %, taper 21 %, trapo 18 %, botella 15 %, escoba 7 % en 300 muertes) | OK |
| 4 | Señoras blanquecinas | **FALLA → corregido** (ver bug 2) |
| 5 | Gallinazos: vuelo con sombra, aviso de picada 0,58 s, 2 picotazos de 5, Titina sale volando tras el picotazo, el guitarrazo espanta (3 de 4 golpes), comen muertos (20 comidas en 90 s y bajan los ataques), máximo 4 de día y 2 de noche por código (visto máx. 3 y 2), Q los marca con un triángulo cian | OK |
| 6 | Escoba: agarrar de la pared y del suelo, giro 360° (golpea a los 4 lados), ventilador ~1,5 s con 22 de aliento/s y velocidad neta 55 %, durabilidad 30 y rotura con aviso «¡Se partió la escoba!» | OK (tras arreglo, ver bug 1) |
| 7 | Molotov: ARMAR (botella + trapo + gasolina → molotov, por tecla F y por botón), R cambia de arma, mecha 0,35 s, carga 0,9 s, alcance 70–201 px, fuego de radio 34 durante 5 s, 1 de daño por segundo y quemadura de 4 s, contagio (~6 de 10 en 1 s), Alexander 4/s y 1,5 s de quemadura, mojado no se quema, el agua (ítem) apaga la quemadura, bolsas que arden, ruido 160 que atrae zombies lejanos | OK |
| 8 | Tele: agarrar con E (si está entera), camina a 52 px/s (65 %), no corre, no ataca, no salta, F mantenido 0,6 s, arco 37–89 px según carga, 3 de daño + empuje, ruido 150, restos y botín | OK |
| 9 | Basura rompible: refri 4 golpes (82 % de botín con taper, gaseosa, agua, cola inglesa), tele 2, silla 1, mesa 2, bolsas 1, cilindro 3 (charco), llanta y colchón decorado; mototaxi y Tico sueltan gasolina | OK |
| 9 | Ítems nuevos: táper +25 de vida con 22 % de «le cae mal» (−8 y empacho); agua +20 de aliento y apaga la quemadura | OK |
| 10 | Vida: 8 gallinas (huyen al correr y no reciben daño), 12 perros en grupos, 6 gatos, mototaxista sentado inmóvil con 3 de vida, ropa tendida | OK |
| 10 | Polvo, radio lejana (audio) | NO PROBADO (audio bloqueado; polvo no se distinguió en captura) |
| 11 | Noche en el Cerro: por altura (al cruzar la fila 70, y = 1120) y por tiempo (a los 300 s), transición de 20 s, afiche «SE HIZO DE NOCHE», `zMulChase` 2 y `zMulRoam` 1,5, música nocturna y `level: cerro` | OK |
| 12 | Consola sin errores en los dos niveles (solo 8 avisos de Chrome sobre `getImageData`, ver pendientes) | OK con nota |
| 12 | `routeCheck()` ok (Cerro: 622 pasos, desde el pie y desde cada descanso; Gambetta: 534 pasos); `spawnCheck()` vacío en los dos | OK |
| 12 | Rendimiento con 30 zombies, aves y 3 fuegos: 2,5 ms por cuadro de media (simulación + dibujo forzando el vaciado del lienzo), p95 2,9 ms, máx. 7,2 ms | OK |
| 12 | Fuzz de 20 500 cuadros en el Cerro (teclas, ratón, E/F/R/C/Q, molotov, carretillas, gallinazos, fuego, teleports, dibujo cada 5 cuadros): 0 errores, 0 NaN | OK |
| 12 | Regresión del nivel 1 (fuzz de 8 000 cuadros, 42 zombies, ruta y spawns, sin restos del Cerro) | OK |
| 13 | Mirada de arte: pie, escalera pintada, losa deportiva, cisterna con cilindros, basural (refris, teles, sillas, bolsas), ladera alta con letrero «A.H. LUCERO ALTO», cima con cruz, bandera y reservorio; enemigos y armas en acción | OK con notas |

## Bugs arreglados
1. **No había ninguna escoba de pared en el Cerro** (el SPEC pide escobas apoyadas en casas; el botín de señoras era la única fuente, 7 %). `okSpot` rechazaba el punto porque caía en la fila `L` (casa) de la huella. Se movió a la fila de afuera: ahora hay 5, repartidas del pie a la ladera alta, y `routeCheck` y `spawnCheck` siguen ok. `js/engine/world-cerro.js:566`.
2. **Las señoras se veían muy blanquecinas.** Se descartó el destello de golpe pegado y el `hurt` en lugar de `move` (el blanco de golpe dura 12–15 cuadros, `clangT` baja bien y los cuadros `move` no son blancos). La causa es el color: pieles pálidas y grises, pelo cano y mandil, buzo y cofia con tonos casi blancos (`#fbfdff`, `#fffffa`, `#eef6fa`), que el brillo de entidades del motor satura en el suelo ocre. Al hornear, se comprimen las luces de los cuadros normales de las señoras (`move`, `windup`, `attack`, `dead`; los `hurt*` siguen blancos a propósito): 255 → ~192 con un tinte cálido leve. Ahora se leen como tonos pastel con color. `js/sprites/zombies.js:1718` (llamada) y `:1724` (`softenLights`).
3. **Aturdida del contragolpe de la olla: 0,75 s en vez de 1 s del SPEC.** `js/engine/senoras.js:19`.

## Pendientes (menores, sin arreglar)
- **8 avisos de Chrome** («Multiple readback operations using getImageData…») al empezar a jugar; salen igual en el nivel 1, así que no son del Cerro y no son errores. No se encontró cuál lienzo los dispara (los de lectura frecuente ya llevan `willReadFrequently`).
- **Falta el sonido del punto de descanso:** el motor emite `rest` y `sfx.js` no lo define (se ignora en silencio; solo sale el aviso «Descanso: …»).
- **Una tele golpeada ya no se puede agarrar** (`dstate > 0`): un solo guitarrazo o giro cerca de ella la arruina. Ver recomendaciones.
- La durabilidad de la escoba (30) también la gastan los golpes a props, no solo a enemigos.
- Pantalla «LLEGASTE A LA CIMA»: el tiempo cuenta solo lo jugado en el Cerro (correcto, pero conviene que el texto lo diga).
- Audio real sin probar (ver abajo).

## Recomendaciones de diseño
- **Gallinazos:** parado en el basural, Alexander recibe ~30 picadas en 2 min con 3 gallinazos activos. Sin defensa es mucho; tal vez subir `diveAfter` a [4, 8] o subir `oneDiveGap` si se siente injusto.
- **Tele:** que la primera golpeada solo la «abolle» y siga siendo agarrable, o que el aviso diga «ENTERA».
- **Escobas:** con 5 en el mapa y 7 % de botín el arma aparece; si se quiere más escoba al principio, poner una junto al paradero de mototaxis.
- **Molotov de toque rápido:** si sueltas antes de que prenda la mecha (0,35 s), el tiro sale con poca carga y cae cerca; está bien, pero el aviso de la trayectoria podría marcar el radio de fuego en rojo cuando caería a menos de 40 px de Alexander.
- **Muerte:** hoy solo suelta lo que llevas en la mano; el SPEC dice «pierdes parte de lo que llevabas». Si se quiere castigo real, falta perder algo de la mochila.

## Recomendaciones de arte
- **Fuego de día:** las llamas y el humo se ven tenues sobre el suelo ocre; más contraste (núcleo amarillo más claro) las haría leerse como peligro. De noche se ven bien por la luz.
- **Esteras vs triplay en la ladera alta:** a la altura de captura se parecen mucho (todo marrón con calamina azul); las esteras podrían ir más pajizas para que se note «mitad esteras, mitad módulos».
- **Pasajero de la carretilla:** se lee bien en movimiento; el gusano que queda tras el choque no se vio en captura.
- **Señoras:** siguen siendo las más claras del Cerro (pastel). Si se quiere más contraste con el suelo, oscurecer las pieles `palido` y `gris` y cambiar el blanco del mandil por beige.
- **Baldazo:** el cono de aviso es muy tenue; la captura del chorro no se logró (ver abajo).

## Lo que no se pudo probar
- **Audio real** (música del Cerro, ambiente, radio lejana, gruñido del mototaxista, voces): el audio estaba bloqueado sin gesto del usuario; solo se comprobó que los eventos del SPEC existen en `sfx.js` y las voces en `voces.js`, y que `ACH.debug.audio()` informa `level` y `night` correctos. Faltan `rest` (ver pendientes); `jump` y `land` existen como recetas.
- **Captura del chorro del baldazo** y de la tele en vuelo: el cuadro exacto se pasó con el paso a paso; se vieron el windup con globo, el cono y la tele cargada.
- **Polvo ocre** del viento y `fire.loop`/`radio.cumbia` posicionales.
- **Pantalla táctil real**: se probó con eventos de puntero en escritorio con `?touch=1`.
- El panel del navegador se auto-pausa al perder foco; las pruebas se hicieron avanzando con `ACH.game.step` (cuando la noche dependía del dibujo se llamó a `ACH.noche.update` a mano).
