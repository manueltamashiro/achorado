# C3 · Música, sonidos y frases de Costa Verde

Archivos (todo sintetizado con Web Audio, sin samples, composiciones originales):
`juego/js/costaverde/surf.js` (música), `sfx-cv.js` (sonidos y ambiente), `voces-cv.js` (frases), prueba: `juego/preview-cv-audio.html`.
Orden de carga (el de `COSTAVERDE.md` §1.2): `sfx.js`, **`surf.js`**, `voces.js`, `motor.js`, `sfx-mira.js`, `voces-mira.js`, **`sfx-cv.js`**, **`voces-cv.js`**. Ningún archivo ajeno se tocó.

## 1. Música (`surf.js`)
Es `rock.js` con otros temas: **misma API** que `musica.js` (`start, setMood, setIntensity, stinger, setNight, night, diegetic, setListener, band, stop, state, setLevel, pauseFilter, _offline/_offlineBegin/_with`) más `setBoss(on)`. Misma cadena de salida (limitador, techo −3,2 dBFS) y bus `music` del motor.

| Tema | Cuándo suena | Tempo y tono | Qué es |
|---|---|---|---|
| **«Brisa del Malecón»** | ánimo `explore` y `title` | 126 bpm, Mi menor armónico → Mi mayor, 16 compases | Surf rock: melodía con picado trémolo y eco de resorte, bajo de púa a corcheas, charles/toms de surf, rasgueos a contratiempo y **oleaje de fondo** (ruido filtrado con marea lenta). Intensidad (= avance por el mapa): guitarra 0,04 · órgano 0,5 · palmas 0,65 · coro «aah» 0,8 |
| **«Terraza Larcomar»** | `explore` con zona `larcomar` | 104 bpm (hasta 123), Am7 D9 GM7 CM7… | Bossa de centro comercial: nailon, piano eléctrico, cuerdas, clave de rim, huevito. **Se ensucia con la suciedad 0..1**: 0,25 charles/bombo y guitarra de surf doblando; 0,5 entra crunch y caja, sale el piano; 0,75 fuzz, órgano, trémolo; 1 = surf rock con ritmo de bossa. Tempo +18 %, más trémolo y resorte |
| **«Corre, que viene la ola»** | `chase` | 168 bpm, La menor armónico → Do | Surf galopante: trémolo, dobles cuerdas con crunch, caja en 2 y 4, órgano y grito. Capas por intensidad: guitarra 0,25 · órgano/palmas 0,5 · coro 0,75 |
| **«Ola de muertos»** | `horde` | 150 bpm, Mi menor | Garaje con surf: fuzz con palm mutes, trémolo, órgano Farfisa, pandereta, toms, grito «¡hey!» |
| **«Mesa cuatro»** = `cv.chef` | `cv.play('chef')` **o** `setBoss(true)` con ánimo `horde`/`chase` | 144 bpm, Mi menor pentatónica | Riff al fuzz, bajo de púa, **caja = wok** (agudo en 2, grave en 4), **cucharón** a corcheas, **gong** cada 4 compases. Intensidad: 0 riff+percusión+melodía · 0,5 + pluck una octava arriba y órgano · 0,75 cucharón doble y platillo en cada compás |
| **«Caída libre»** = `cv.caida` | `cv.play('caida')` | 176 bpm, Mi frigio dominante → Mi mayor épico, 16 compases | Surf épico: trémolo, crunch, batería con semicorcheas, riser. Cuerdas 0,25 · órgano 0,5 · coro 0,75; viento de fondo |
| **«Aterrizaje en Chorrillos»** = `cv.heroe` | `cv.play('heroe')` | 104 bpm con pulso de 6/8 (hemiola criolla), Re mayor, 16 compases ≈ 37 s, en bucle | Compases 0–3 guitarra criolla de nailon rasgueada con cuerdas que crecen (el planeo); 4–7 cajón y trémolo (el aterrizaje); 8–15 surf rock épico con crunch, batería, pluck y coro (la pose). Siempre arranca en el compás 0 |

`dead` (lamento de saxo) y `won` se heredan. Stingers: `kill, hurt, horde, death, win, cobrador` (en el tono del tema que suena), `boss.intro` y `boss.down` (rehechos con **gong**), y nuevos **`gong`** y **`cv.gol`** (fanfarria de estadio).

### API nueva (`ACH.audio.cv` y `ACH.audio.musicEngine`)
```js
ACH.audio.cv.play('chef' | 'caida' | 'heroe')   // también 'cv.chef', 'cv.caida', 'cv.heroe' (así lo piden caida.js y chorrillos.js). Devuelve false si no existe.
ACH.audio.cv.stop()                             // vuelve al ánimo del juego (en el siguiente tiempo)
ACH.audio.cv.playing()                          // 'chef' | 'caida' | 'heroe' | null
ACH.audio.cv.setZone('malecon' | 'larcomar')    // zona de explore;  cv.zone()
ACH.audio.cv.setDirt(0..1)                      // suciedad de Larcomar; cv.dirt()
ACH.audio.cv.auto(true|false)                   // autodetección (ver abajo); cv.cfg = {y0, y1, hys, every}
ACH.audio.cv.info()                             // {playing, zone, dirt, auto, state}
ACH.audio.music.setMood('cv.chef') / ('cv.stop')  // alias, por si se prefiere pasar por el motor
```
- **Un tema por nombre manda sobre todo** hasta `cv.stop()`: `game.js` puede seguir llamando `setMood/setIntensity` cada medio segundo sin cambiarlo. `setIntensity` sí sigue sumando capas.
- Funciona antes del desbloqueo del audio (se recuerda y suena al desbloquear).
- **Autodetección de zona** (activa por defecto): si `ACH.nivel.id === 'costaverde'`, cada 0,4 s lee `ACH.G.player.y`. `y ≥ cfg.y0` (fila 36) = Larcomar; suciedad = `(y − y0) / (y1 − y0)` (y1 = fila 69, la arena). Con histéresis de 24 px. Si el mapa cambia, ajustar `ACH.audio.cv.cfg.y0/y1`. Llamar a `setZone`/`setDirt` desde `nivel.js` la apaga (`cv.auto(true)` la reactiva).
- **Jefe 1 sin cambios en `chef.js`:** si hace como `jefa.js` (`stinger('boss.intro'); setBoss(true)` … `stinger('boss.down'); setBoss(false)`) suena «Mesa cuatro» solo. Con `cv.play('chef')` / `cv.stop()` también.
- **Caída:** `cv.play('caida')` al empezar, `setIntensity(1 − vidaDelTablazo/máx)` si se quiere que crezca, `cv.stop()` al terminar. **Chorrillos:** `cv.play('heroe')` al empezar el plano 1; `cv.stop()` al terminar (ya lo hacen).

## 2. Sonidos (`sfx-cv.js`)
Se registran en `ACH.audio.recipes` (como `sfx-mira.js`); `ACH.audio.cv.sfx` lista los 71 nombres. Todas las recetas aceptan `data.delay` (segundos) y `data.boost`.
- **Heladero:** `cv.corneta`.
- **Pelota:** `cv.patada` (= `cv.pelota.patada`, `{charge}`) · `cv.rebote` (= `cv.pelota.bote`) · `cv.pelota.rebote {soft, hit}` · `cv.pelota.golpe {killed}` · `cv.gol` (ovación + coro + stinger de música).
- **Barra fosforescente:** `cv.fosfo.zumbido` (= `cv.barra.swing`) · `cv.fosfo.golpe` (= `cv.barra.hit`) · `cv.barra.tiro` · `cv.barra.cae` · `cv.barra.crack` · `cv.barra.off`.
- **Helado:** `cv.helado.lanza` (= `cv.helado.tiro`) · `cv.helado.splat` · `cv.lamida` (= `cv.helado.lamer`) · `cv.helado.come`.
- **Perritos:** `cv.ladrido.chico/grande/pug/husky` y `cv.ladrido {size: chico|medio|grande|pug, breed}` (elige solo) · `cv.gemido` (= `cv.perro.gemido`) · `cv.perro.contento` · `cv.perro.mordida` · `cv.patadita`.
- **Zombies:** `cv.selfie` · `cv.tabla.golpe {player, broke, boss}`.
- **Chef:** `cv.palito.silbido` · `cv.palito {n}` (abanico) · `cv.palito.lluvia` · `cv.palito.toc` · `cv.dumpling.salto/salen/golpe/muerde/muere` · `cv.gong {size}` · `cv.wok {big}` · `cv.wok.rueda` · `cv.vaporera` · `cv.onda` (aterriza el salto) · `cv.chef.alza/duele/grito/salta` (gruñidos de voz grave, sin palabras) · `cv.chef.caida` (= `cv.chef.muere`) · `cv.reja {close}` / `cv.reja.abre` / `cv.reja.cierra` · `cv.baranda`.
- **Caída:** `cv.flecha {c 0..3, snap, fan}` (color = nota de una pentatónica) · `cv.flecha.golpe` · `cv.tabla.gira {intro, rage, wave, kind}` (golpe de aire) · `cv.tabla.rompe` · `cv.splash` · `cv.parapente` (= `cv.parapente.abre`) · `cv.parapente.corre` · `cv.pelicano`.
- **Bucles** (`ACH.audio.loop`): `cv.viento {intensity|speed}` (**no se apaga solo**: `sfx-cv.js` envuelve `A.loop` y le da ttl de 4 min, porque `caida.js` lo pide y no lo «toca»; también sirve como golpe suelto `emit('cv.viento', {gust:true, dur:0.4})`) · `cv.tabla.gira.loop {speed}` · `cv.olas {intensity}`.
- **Ambiente automático** (`ACH.audio.cv.amb`): con `ACH.nivel.id === 'costaverde'` y el juego en `playing`, mantiene el oleaje (fuerte en el malecón, algo menos en Larcomar alta, más cerca de la arena según `cv.dirt()`), gaviotas cada 7–16 s y un pelícano cada 40–90 s. `amb.enabled = false`, `amb.setBed(k)`.

## 3. Frases (`voces-cv.js`)
Se agregan a `ACH.audio.phrases` (como `voces-mira.js`); `ACH.audio.cv.phraseIds` las lista. Se dicen con `ACH.audio.say(id, {x, y})`; cada id existe también con punto (`cv.turista`). `who` extra traducidos: `corredor, turista, surfista, seguridad, tablazo → zombie`; `heladero, vendedor, chef → pasajero`.
`cv_corredor` «¡Un kilómetro más!» · `cv_turista` «¡Selfie, selfie!» · `cv_surfista` · `cv_seguridad` · `cv_trabajador` · `cv_heladero` «¡Heladooos!» · pregones `cv_fosfo, cv_kiosco, cv_deportes, cv_fuente` · `cv_noAlcanza` «Aquí es precio Larcomar, joven.» · `cv_gracias` · chef: `cv_chefEntrada` «¡Mesa cuatro, un cantante al vapor! ¡Y bien cocido!», `cv_chefEntrada2` «En mi cocina nadie toca guitarra, compadre.», `cv_chefLista` «¡Pedido listo!», `cv_chefPalitos`, `cv_chefCansado` «¡Un tecito, un tecito!», `cv_chefMuerte` (voz grave y lenta, sin acento imitado) · Tablazo: `cv_tablazoOla` «¡Se viene la ola, causa!», `cv_tablazoGrito` «¡Tablazo!», `cv_tablazoFurioso` · Alexander: `cv_chefMuere` «Ese pedido salió crudo, maestro.», `cv_tablaRasa` «¡Tabla rasa, compadre!», `cv_gol, cv_perro, cv_cerebro, cv_flash, cv_parapente, cv_chorrillos`.
Voces: `voces.js` solo tiene 6 `who` privados; se reusan (zombie, pasajero, alex) con `r/p` por línea. En otro sistema suenan distinto.

## 4. Cómo probar
```
cd juego && ruby -run -e httpd . -p 8717 -b 127.0.0.1     # y abrir http://127.0.0.1:8717/preview-cv-audio.html
```
Pulsar **ACTIVAR AUDIO** (el navegador exige un clic). Hay botones para cada ánimo, intensidad, zona, suciedad (y «barrer 0 → 1 en 40 s»), los 3 temas, stingers, los 71 sonidos, bucles con velocidad y posición, el ambiente, las frases, y **CORRER PRUEBAS** (renders sin oír + sonidos en vivo + consola).

## 5. Guía de escucha (lo que la máquina no puede decir)
1. **Malecón:** ¿suena a surf (picado trémolo, eco de resorte) y no a «videojuego de juguete»? ¿El oleaje de fondo estorba o se agradece? (`SEA_VOL` en `surf.js`, `FX.explore.sea`).
2. **Larcomar:** con suciedad 0, ¿es música de centro comercial creíble? Al barrer a 1, ¿la transición se siente «ensuciarse» o brusca? (se oye mejor con el botón de barrido.)
3. **Chef:** ¿el wok (caja) y el cucharón se leen como percusión y no como ruido? ¿El gong cada 4 compases cansa? (`chfBar`: quitar `i % 4 === 0` por `i === 0`.)
4. **Caída:** ¿suena «épico y rápido»? ¿Hay demasiado en la mezcla con intensidad 1?
5. **Héroe:** el pulso 6/8 con hemiola: ¿se siente criollo (marinera/festejo) o raro? Si es raro, bajar el rasgueo de `HER_PAT` a 4 golpes.
6. **Sonidos:** ladridos y gaviota usan síntesis de voz formántica: pueden sonar «de caricatura». Gemido, gaviota, silbido de palito y pelícano son suaves (−15 a −25 dBFS de pico) a propósito.
7. **Frases:** ¿se entienden con la voz de tu sistema? Ajustar `r/p` en `voces-cv.js`.

## 6. Lo medido (OfflineAudioContext, sin oír)
- 15 renders (cada ánimo, cada nivel de suciedad 0/0,5/1, `cv.chef` I=0 y 1, `setBoss`, `cv.caida`, `cv.heroe`, lamento) + una cadena de 56 s con 9 cambios de tema/ánimo/zona/stingers: **0 NaN, 0 recortes, 0 eventos tardíos o descartados, 0 re-sincronizaciones**. Pico −4,4 a −9,5 dBFS (techo −3,2); RMS −17,9 a −24 dBFS (similar a Miraflores).
- Cambio de tema o ánimo: cae a ≤ 0,45 s (siguiente tiempo).
- En vivo (pestaña del navegador): chef, héroe, caída, chase, horde, boss, larco y malecón 7 s cada uno: 0 tardíos, 0 descartados; ~54 GainNodes y ~38 fuentes por segundo en `cv.caida` (el más cargado).
- Sonidos: 87 casos (71 nombres + variantes de datos) renderizados: 0 excepciones, 0 NaN, ninguno mudo, ninguna cola más larga que la duración declarada. En vivo (motor real): 71 eventos, 0 excepciones, 0 avisos en consola.
- La música auto-detecta zona (probado con un `ACH.G.player.y` falso: y=300 malecón; 900 Larcomar suciedad 0,61; 1100 → 0,99; vuelve al malecón).

## 7. Notas y problemas conocidos
- No se pudo oír nada: la parte musical (afinación del gusto, mezcla, si el 6/8 criollo convence) la juzga el dueño.
- `ACH.audio.setLevel('costaverde')` del motor solo acepta `gambetta`/`cerro`; por eso la zona se pide con `ACH.audio.cv`, no con `setLevel`.
- `cv.tabla.gira` lo emiten `caida.js` como golpe suelto; el bucle de tabla es `cv.tabla.gira.loop` (nadie lo usa aún).
- Si `ACH.G.player.y` no es la posición en el mundo en píxeles, la autodetección no funciona: usar `setZone/setDirt` explícitos.
- La noche (`setNight`) se heredó pero Costa Verde no la usa.
