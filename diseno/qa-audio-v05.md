# QA de audio — ACHORADO v0.5

Integración y verificación del motor (`motor.js`), los efectos y el ambiente (`sfx.js`) y la música (`musica.js`).
No se editaron `sfx.js`, `musica.js` ni `SPEC.md`. Todo se midió en el navegador integrado con `AnalyserNode`/`ScriptProcessor` colgado de la salida final (después del limitador y el recorte) y de cada bus. Sin oídos: son números, el oído final es el tuyo.

## 1. Lo que se cableó y se corrigió

| Qué | Dónde | Detalle |
|---|---|---|
| Oyente al ambiente | `motor.js` `setListener` | Además de panear los efectos, reenvía el centro de cámara a `ambCtl.setListener` (cada cuadro; el ambiente lo limita a 10 Hz). |
| Postes de sodio y cruz de botica | `render.js` `audioLamps()` + `game.js` `feedAudio` | `setLamps` una sola vez con los 13 focos (12 postes encendidos + la cruz de neón de la botica). El ambiente reproduce solo los 3 más cercanos. |
| Moscas | `game.js` `feedAudio` | 18 nidos fijos (basura y bolsas, de `fx.ambient.flySrc`) + cadáveres: se registran 1,2 s después de morir y se quitan a los 9,5 s o al desaparecer (mismos tiempos que las moscas dibujadas). |
| Viento sincronizado con las ráfagas | `game.js` `feedAudio` | `setWind(fx.ambient.wind)` cada 0,2 s en todos los estados (antes cada 0,5 s y solo jugando). Es la misma variable que mueve basura, cables y ropa. |
| Pitidos de relleno | `motor.js` | Borrado el bloque `FALLBACK`/`beep`: todos los eventos tienen receta real. Sin receta no suena nada. |
| Pestaña oculta | `motor.js` | `visibilitychange` suspende el `AudioContext` (el temporizador del secuenciador se atrasa con la pestaña dormida) y lo reanuda al volver. El juego ya se pausaba por foco. |
| Mezcla | `motor.js` | Ver sección 3. |
| QA | `motor.js` | `A._nodes` expone los nodos para medir (`comp`, `clip`, `pauseLP`…). Inofensivo; se puede borrar. |

**Recetas contra ganchos.** Las 30 recetas de `ACH.audio.recipes` tienen al menos un gancho que las emite, y todos los nombres que emite el juego existen como receta (más `noise`, que por contrato no suena). Sin discrepancias. `ui.move` solo lo emiten los deslizadores de la pausa (no hay otro menú).

**Anti-spam.**
- Q: el gancho ya tiene `qCD` de 15 s; 20 pulsaciones en 2 s produjeron 1 arrullo. Además la receta tiene 0,4 s de cooldown: 30 emisiones forzadas en 1 s dejaron como máximo 2 voces vivas.
- Pasos: gancho de 2 por ciclo + cooldown 0,1 s. Gemidos: gancho máx. 1 cada 0,7–2,2 s + cooldown 0,25 s.
- Tope de 24 voces: se inundó con 360 emisiones mezcladas en 0,7 s y el máximo fue 24.

## 2. Mediciones

Medido a 48 kHz. Master 0,8. Valores en dBFS. «bloque» = ventana de 21 ms.

### Mezcla (con los valores por defecto finales)
| Escenario | Pico salida | RMS salida | RMS música | RMS ambiente | Reducción del limitador |
|---|---|---|---|---|---|
| Título (15 s) | −11,4 | −25,1 | −27,7 | −41,9 | 0 |
| Explorar, tramos de música a intensidad 0 / 0,5 / 1 | −10,6 / −8,7 / −9,6 | −22,4 / −22,0 / −23,7 | −25,0 / −24,5 / −26,3 | — | 0 |
| Chase 0,25 / chase 1 / horda (música sola) | −9,4 / −9,3 / −9,1 | −22,5 / −22,2 / −21,7 | −25,0 / −24,7 / −24,2 | — | 0 |
| Pelea de 30 s, 34 zombies (música + golpes + ambiente) | **−2,5** | −17,8 | −24,9 | −38,3 | mediana −0,55 dB, p10 −3,2, mín −5,4; >3 dB en 11 % del tiempo |
| Pausa (después de la mezcla de explorar) | −20,3 | −33,3 (−10 dB) | −38,2 (−9,4 dB) | −39,5 | 0 |
| Muerte (frase triste + silencio) | −3,9 | −22,2 | ~−25 | — | 0 |
| Victoria (final de fiesta) | −6,3 | −22,2 | ~−22 | — | 0 |

- **Techo:** nada pasó de −1 dBFS en ninguna prueba (peor caso −1,9 dBFS en una pelea; el recorte suave tiene techo en −1).
- **Limitador:** antes de los ajustes, la misma pelea pasaba de 3 dB de reducción el 23 % del tiempo (mín −7 dB); ahora el 11 %.
- **Música contra golpes:** el golpe (`hit`) llega a −2,9 dBFS de pico solo; la música llega a −10 / −9 dBFS de pico: unos **6–7 dB debajo** del golpe. Con el −2 dB de trim del golpe quedó en ~5–6 dB.
- **Ambiente:** −38 a −42 dBFS RMS, 14–18 dB bajo la música: sutil. Cerca de un poste de sodio sube +3,3 dB, cerca de basura +1,5 dB, cerca de la cruz de neón +1,8 dB respecto a una zona lejos de todo.
- La música es pareja entre ánimos (±1,5 dB de RMS), así que el cambio cumbia ↔ salsa no da un salto de volumen.

### Efectos sueltos (pico a la salida, en el centro del oyente, sin música ni ambiente, antes de los trims)
golpe −2,9 · cobrador.shout −8,8 · kill −8,5 · muerte −7,1 · swing −9,6 · horda −10,1 · hurt −11 · arrullo −11,2 · alerta −13,2 · ladrido −13,3 · mordida −14 · lunge −14,7 · whiff −16,2 · paso −17,3 · zombie.idle −18,3.
Lo más bajo (paso, whiff, idle, mordida) quedaba 7–8 dB por debajo del pico de la música y enterrado: se subió con trims (abajo).

### Cambios de mezcla en `motor.js`
- `DEF.music` 0,55 → **0,50** (−0,8 dB).
- `DEF.amb` 0,60 → **0,85** (+3 dB): con la música a −24 dBFS el ambiente quedaba tapado. Los deslizadores de `index.html` muestran 50 y 85.
- Trims por evento (`TRIM_DB`): `hit` −2, `step` +4, `whiff` +3, `zombie.idle` +4, `zombie.bite` +2, `zombie.lunge` +1, `swing` +1.
- Master 0,8 y efectos 0,9 sin cambio.
- Ojo: si ya habías tocado los deslizadores, `localStorage` conserva tus valores viejos (la clave sigue siendo `achorado.audio.v1`). Para ver los nuevos: `localStorage.removeItem('achorado.audio.v1')` y recargar.

### Comportamiento
| Prueba | Resultado |
|---|---|
| Explorar → chase → horda → explorar | Con 34 zombies persiguiendo: `horde` ~18 s; luego `chase` 0,25 al quedar uno; vuelve a `explore` 4 s después de que no quede ninguno (histéresis). OK |
| Transiciones en compás | Con `OfflineAudioContext`: cambios pedidos en t = 7,3 / 15,1 / 25,7 / 31,2 s cayeron en 10,08 / 17,58 / 27,58 / 32,58 s, todos en barras (0,08 + 2,5·k). `dead` entra casi de inmediato (37,9 s), como corresponde. OK |
| Pausa | Estado `paused`, `pauseLP` a 650 Hz, música −9,4 dB (RMS), salida −10 dB. OK |
| Muerte | Estado `dead`, ánimo `dead` en motor y en el secuenciador; tras 2,5 s respawn y vuelve `explore`. OK |
| Victoria | Ánimo `won`, final en fiesta, pico −6,3 dBFS. OK |
| Nueva partida tras la victoria | `won` → Enter → `intro`: ánimo `explore`, intensidad 0, voces vaciadas. OK |
| Silencio (M) y deslizadores | Se guardan y se recuperan al recargar: `muted:true`, música 0,26, la UI vuelve a mostrar 26 y «SIN SONIDO». OK |
| Pestaña oculta | Se simuló `document.hidden`: el juego pasa a `paused`, el contexto a `suspended` (el reloj de audio se congela) y al volver `running` sin atrasos del secuenciador. OK |
| Tope de voces | 24 en inundación; máximo 13 en una horda real de 34 zombies. OK |

### Rendimiento
- **fps:** en 30 s de horda de 34 zombies con música, efectos y ambiente: cuadro medio 16,67 ms (60 fps), p99 18,2–18,6 ms, máximo 18,7 ms, ningún cuadro >20 ms. En exploración igual. (Medido con la pestaña en primer plano, `visibilityState: visible`.)
- **Hilo de audio:** `baseLatency` 5,3 ms, `outputLatency` 24 ms. Sin subdesbordamientos: se recibieron 960.512 muestras en 20 s contra 960.000 esperadas (no se perdió ningún bloque) y la deriva entre el reloj del audio y el del navegador fue 1 ms en 25 s.
- **Secuenciador:** `late: 0`, `dropped: 0` en todas las pruebas; el hueco máximo entre ticks fue 32–37 ms (el temporizador es de 25 ms).

### Consola y regresión
- Sin errores ni avisos antes del desbloqueo ni después (los únicos avisos de la consola fueron del medidor de QA, `ScriptProcessorNode`).
- `window.onerror` y `unhandledrejection` sin eventos en todo el recorrido.
- Recorrido completo con entrada del juego (BFS + `ACH.input`): inicio → escalera en 26 s, estado `won`, 0 muertes, 128 pasos, 22 guitarrazos (todos al aire), 10 alertas, 1 mordida; sin errores. La primera versión del bot se atascó contra una esquina (error del bot, no del juego).
- `routeCheck().ok === true`, `spawnCheck()` vacío, `ACH.gfx.missing()` vacío.

## 3. Problemas pendientes

1. **Latencia de transición de la música (hasta ~5 s).** Con barras de 2,5 s, un cambio a `chase` o `horde` espera la siguiente barra y deja espacio para el fill: pedir el cambio justo después de una barra tarda casi 5 s en sonar (7,3 s → 10,08 s). En una persecución corta el cambio de música llega tarde. Es decisión del compositor (`musica.js`); posible ajuste: aceptar un fill más corto cuando la barra siguiente está a más de 1 s, o permitir cambio en media barra.
2. **Arranque de la música sin fundido.** Al desbloquear, la música sube de −32 a −18 dBFS en unos 60 ms. No hay clic medible, pero entra de golpe. Idea: rampa de 0,3 s en el `trim` al arrancar.
3. **Doble paso bajo en pausa.** El motor (`pauseLP`, sobre música y efectos) y el secuenciador (`plp`/`slp`) filtran ambos a 650 Hz, así que la música queda con pendiente doble (≈24 dB/oct). Suena más sorda de lo que dice el contrato (10 dB + un paso bajo). Si se oye demasiado apagado, quitar el filtro del motor para la música.
4. **El golpe satura el limitador en pelea apretada.** Pico a −2,5 dBFS con reducción puntual de hasta 5 dB cuando se apilan golpes + kills + mordidas. Es normal para un limitador, pero si se oye «bombeo» en la música bajar `TRIM_DB.hit` otro dB.
5. **`musicEngine._offline` apaga el motor en vivo** (comparten el estado interno). Es solo de pruebas; no lo llames en la consola mientras juegas.
6. **Pistas por sonar.** Con el ambiente +3 dB, `amb` sigue siendo −38 dBFS: los eventos lejanos (alarma, ladrido, calamina, sirena) están a −45…−60 dBFS y no se oyen sobre la música. Es voluntario («lejano»), pero si quieres oírlos hay que subirlos en `sfx.js`.
7. **Llaves por probar con oído** (no se pueden medir): inteligibilidad del grito del cobrador, que los gemidos no suenen a lo mismo entre tipos, el «ruido» del coro y la nitidez del wah.
8. Los deslizadores de la pausa solo se pueden probar con ratón o con Tab+flechas; la tecla Espacio está bloqueada sobre ellos para no despausar.

## 4. Guía para escuchar

Abre `dist/achorado.html`, haz clic o pulsa una tecla (el audio se desbloquea con el primer gesto) y abre la consola (F12). El juego se queda en el título; basta con eso para probar.

### Efectos sueltos
```js
// los de la consola quedan al volumen de la mezcla: súbele a efectos con M/pausa si hace falta
ACH.debug.sfx('hit', {x:240, y:135, type:'caminante', killed:false, combo:1})
ACH.debug.sfx('hit', {x:240, y:135, type:'cobrador', killed:true, combo:3})   // golpe que mata
ACH.debug.sfx('kill', {x:240, y:135, type:'caminante'})
ACH.debug.sfx('swing')  ·  ACH.debug.sfx('whiff')
ACH.debug.sfx('step', {surface:'asfalto'})   // también 'vereda', 'berma', 'tierra', 'escalera'
```
Ojo: sin `x, y` el sonido suena centrado y a ganancia 1; con `x, y` se atenúa y panea según la cámara. En el título la cámara no está en (240,135): para oír a plena potencia usa las coordenadas de tu cámara:
```js
var G = ACH.game.G, V = ACH.render.VIEW, c = {x: G.cam.x+V.w/2, y: G.cam.y+V.h/2};
ACH.debug.sfx('hit', c)
```

### Los sonidos de riesgo
```js
// zombie.idle por tipo (compáralos: deben sonar distintos)
['caminante','escolar','ciego','cobrador'].forEach((t,i)=>setTimeout(()=>ACH.debug.sfx('zombie.idle',{...c,type:t}), i*1500))
// grito del cobrador (voz sintética con entonación de grito, no texto)
ACH.debug.sfx('cobrador.shout', c)
// arrullo de Titina (en el juego solo sale una vez cada 15 s con Q; aquí puedes repetirlo cada 0,4 s)
ACH.debug.sfx('titina.coo', c)
// el resto de los zombies y del jugador
ACH.debug.sfx('zombie.alert', {...c,type:'caminante'})  ·  ACH.debug.sfx('zombie.bite', c)  ·  ACH.debug.sfx('zombie.lunge', c)
ACH.debug.sfx('player.hurt', c)  ·  ACH.debug.sfx('player.death')  ·  ACH.debug.sfx('player.exhausted')
ACH.debug.sfx('horde')  ·  ACH.debug.sfx('win')  ·  ACH.debug.sfx('game.start')
ACH.debug.sfx('dog.bark', c)  ·  ACH.debug.sfx('dog.whine', c)  ·  ACH.debug.sfx('birds.fly', {...c, n:4})
```

### Música por ánimo
```js
ACH.debug.mood('title')              // tema lento con guitarra con trémolo y eco, ~90 bpm
ACH.debug.mood('explore', 0)         // chicha: güiro + bajo + guitarra rítmica
ACH.debug.mood('explore', 0.5)       // + melodía de guitarra punteada con wah  ← el wah lead
ACH.debug.mood('explore', 1)         // + timbal y campana
ACH.debug.mood('chase', 0.25)        // salsa brava ~190 bpm: tumbao de bajo, clave 2-3, congas, cencerro
ACH.debug.mood('chase', 0.5)         // + montuno de piano  ← el piano montuno (con 1 trae mambo de trompetas y trombón)
ACH.debug.mood('chase', 1)           // mambo de metales a fondo
ACH.debug.mood('horde', 1)           // chase a fondo con el coro de metales y timbal en fill  ← el coro
ACH.debug.mood('paused')             // paso bajo y −10 dB
ACH.debug.mood('dead')               // frase triste de guitarra sola
ACH.debug.mood('won')                // cierre en fiesta
ACH.debug.mood()                     // devuelve el mando al juego
ACH.debug.audio()                    // {state, mood, intensity, voices, muted, reduction, volumes…}
```
Para oír el cambio cumbia → salsa en la barra: `ACH.debug.mood('explore', 0.5)`, espera 5 s, luego `ACH.debug.mood('chase', 0.5)`; tarda hasta la siguiente barra.

Stingers (frases cortas encima de la música): `ACH.audio.music.stinger('kill')` (se repite en 4 variantes), `'hurt'`, `'horde'`, `'death'`, `'win'`, `'cobrador'`.

### Ambiente y mezcla
```js
ACH.audio.ambCtl.event('alarm')   // alarma de auto lejana (también 'dog', 'calamina', 'horn')
ACH.audio.ambCtl.setBed(1)        // sube el colchón (lluvia + viento + mar) para oírlo mejor; vuelve con 0.5
ACH.debug.teleport(511, 243)      // junto a un poste de sodio: se oye el zumbido a 60 Hz
ACH.debug.teleport(1519, 150)     // frente a la botica: zumbido del neón de la cruz
// moscas: acércate a un tacho de basura o a un cadáver (1,2 a 9,5 s después de morir)
ACH.audio.setVolume('music', 0.8) // ajusta buses: 'master' | 'music' | 'sfx' | 'amb'
ACH.audio.log = true              // imprime cada evento
```
Tecla **M** silencia todo; **Esc** abre la pausa con los tres deslizadores (Música, Efectos, Ambiente).

### Qué escuchar con atención
- **Cobrador:** que el grito se entienda como grito y no como un pitido o un eructo, y que su frase de metales (`stinger('cobrador')`) no tape el grito.
- **`zombie.idle`:** que cada tipo suene distinto y que ninguno resulte molesto repetido cada 1–2 s.
- **Coro de la horda y piano montuno:** que no suenen a sintetizador barato; si el coro «raspa» arriba, bajar `LAYERS.coro` en `musica.js`.
- **Lead con wah:** la guitarra punteada debe moverse con el filtro; si se oye metálica o con zumbido, avisar.
- **Cambio de música:** que cumbia → salsa caiga en tiempo y no se sienta lento al empezar la persecución (pendiente 1 de la sección 3).
