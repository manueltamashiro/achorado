# QA de audio · Nivel 3 Miraflores (M3)

Guía corta para escuchar la música, los sonidos y las frases del nivel. Archivos: `juego/js/miraflores/rock.js`, `sfx-mira.js`, `voces-mira.js`.
Todo está sintetizado con Web Audio, sin samples. Quien escribió esto no pudo oír nada: lo medido está en la sección 5; **lo musical lo juzga el dueño.**

## 1. Cómo escuchar

**A. Banco de pruebas (sin el juego).** Es una página con un botón por ánimo, noche, jefa, stinger, sonido y frase.
Está en la carpeta temporal de esta sesión (si ya no existe, pídele a quien coordina que la regenere):

```
ruby -run -e httpd /private/tmp/claude-501/-Users-dahliacistam--claude-spares-spare-au00YG/06c88b04-b19d-4c15-aa25-d77b05bdbd55/scratchpad/m3/site -p 8774 -b 127.0.0.1
```

Abrir `http://127.0.0.1:8774/index.html`, pulsar **Activar audio** y listo. Apagar el servidor con Ctrl+C cuando termines.

**B. En el juego (cuando exista `miraflores.html`).** Con la consola del navegador:

```
ACH.audio.music.setMood('chase')      // title, explore, chase, horde, paused, dead, won
ACH.audio.music.setIntensity(0.9)     // 0..1; en explore es la posición en el mapa
ACH.audio.music.setNight(true)        // noche (fundido de 8 s); setNight(true, 0) = al instante
ACH.audio.musicEngine.setBoss(true)   // motivo de la jefa (hay que estar en ánimo 'horde')
ACH.audio.music.stinger('boss.intro') // kill, hurt, horde, death, win, boss.intro, boss.down
ACH.debug.sfx('bees.spawn')           // cualquier sonido de la sección 3
ACH.debug.say('jefaPregon')           // cualquier frase de la sección 4
```

## 2. Qué escuchar en cada tema

| Tema | Tempo y tono | Dura | Qué debe sentirse |
|---|---|---|---|
| **«Twist del Malecón»** (`explore`) | 138 bpm con swing, Mi mayor | 16 compases = 28 s; la vuelta entera, 56 s | Guitarra limpia con trémolo y eco de resorte llevando la melodía; bajo caminante; escobillas, chasquidos; piano boogie. El puente (compases 9–16) cambia a platillo ride y tresillos de piano |
| **«Corre, pituco, corre»** (`chase`) | 172 bpm recto, La mayor | 16 compases = 22 s | Dobles cuerdas con crunch, bajo a corcheas, caja fuerte en 2 y 4, glissando de piano cada 4 compases, bocinazos de saxo (dos notas a tercera menor) |
| **«Picarones de fuego»** (`horde`) | 150 bpm, garaje, Mi menor | 8 compases = 13 s | Fuzz con palm mutes, órgano Farfisa con la melodía, pandereta, toms en los rellenos, grito «¡hey!» en los compases 4 y 8 |
| **Jefa** (`setBoss(true)` sobre horde) | igual que horde | 8 compases = 13 s | Bordón de Mi, descenso cromático «pegajoso» (cada nota entra un semitono arriba y se escurre) en los 4 primeros compases; pregón de órgano «pi-ca-RO-nes» en los 4 siguientes; gotitas agudas sueltas |
| **Noche** | explore a 0,78 del tempo (~109 bpm) | — | Casi solo bajo a medias notas, escobillas ralas, guitarra con las notas largas, órgano de salón, más reverb y menos agudos. Chase y horde suben el órgano de salón y la reverb sin bajar el tempo |

**Se suma con la intensidad (explore):** 0,1 guitarra · 0,25 guitarra rítmica · 0,3 piano a dos manos · 0,5 saxo · 0,65 palmas · 0,8 coro «uuh-uh». En chase: 0,25 piano y guitarra · 0,5 saxo y palmas · 0,75 coro y bocinazos.

**Cambios de ánimo.** Prueba pasar de `explore` a `chase` y a `horde` varias veces seguidas: el cambio debe caer en el **siguiente tiempo** (se mide ≤ 0,5 s), con una caja o toms de anacrusa, sin cola de la pieza anterior y sin silencio.
Entre `title` y `explore` no hay corte (es la misma canción con otras capas). Al volver a `explore` retoma cerca de donde iba.

**Stingers.** `kill` rota entre cuatro (guitarra, saxo, glissando de piano y «ba-dum-tss»); `hurt` es un «¡uah!» de saxo que cae; `horde` es redoble y caída de palanca; `death` es saxo que se apaga con órgano de salón; **`win`: redoble, acorde de séptima (Si7), golpe de batería y una última nota de guitarra (Mi5) que se queda sonando ~5 s**; `boss.intro`: acorde disminuido de órgano, bajo que cae y descenso cromático; `boss.down`: saxo triste («se me acabó la masa») y de golpe el acorde de victoria.

## 3. Sonidos (nombre exacto para `ACH.audio.emit`)

| Grupo | Eventos |
|---|---|
| Abejas | `bees.spawn` · `bees.sting` · `bees.hit` · `bees.die` · **`bees.loop`** (bucle con `{n}` = abejas que quedan; con 0 queda mudo) |
| Jefa | `boss.yell` · **`boss.fry`** (bucle) · `boss.throw` · `miel.splat` · `boss.block` (clanc de lata) · `boss.hurt` · `boss.down` · `boss.cart` |
| Tienda | `shop.open` (campanilla) · `shop.buy` (caja registradora) · `shop.nomoney` (zumbador + «womp-womp») |
| Inflables | `inflable.swing` · `inflable.hit` (chillido de juguete) · `inflable.pop` · `burbujas.shot` · `burbujas.pop` · `pileta.coins` |
| Ambiente | `iglesia.campanas` · `paloma.coo` · **`pileta.murmullo`** (bucle) · `checkpoint`. Los gatos reusan `cat.meow` y `cat.hiss` |

Un bucle se pide con `ACH.audio.loop(nombre, {x, y, n})` y se actualiza con `h.move(x, y)` / `h.set({n})`; se apaga solo a los 4 s si nadie lo toca.
**Ambiente automático:** si `ACH.nivel.id === 'miraflores'`, `ACH.mira.audio` mantiene el murmullo de las 2 piletas más cercanas, toca las campanas cada ~90 s (la primera a los ~25 s; de lejos se oyen apagadas), y suelta palomas y maullidos de los gatos cercanos.

## 4. Frases (`ACH.audio.say(id, {x, y})`)

Jefa (voz de señora): `jefaPregon` (sortea los tres pregones) · `jefaUltimo` · `jefaMuerte`/`jefaMuere`.
Trabajadores (voz grave de zombie, un poco más rápida para que se entienda): `trab_bembos`, `trab_starbucks`, `trab_lalucha`, `trab_chinawok`, `trab_belisario`, `trab_wong`, `trab_ripley`, `trab_saga`, `trab_tailoy` (también como `trab.<marca>`) y `trabajador`.
Vendedores (voz de hombre): `vendedorPregon`, `vendedorGracias`, `vendedorSinPlata`.
Alexander: `miraInicio`, `abejas`, `michi`, `mielMarca`, y de relleno `piletaMonedas`, `picaronesMal`, `cinta`.
La voz es la de `speechSynthesis` del sistema; en una Mac suena distinto que en Windows o Android. Una frase cada 2,5 s como máximo.

## 5. Lo medido (OfflineAudioContext, sin oír)

- **Pico de la música:** −7,9 a −3,9 dBFS según pieza e intensidad; el techo duro del recorte es −3,2 dBFS (0,69). Recorrido de 145 s con todos los ánimos, noche, jefa y stingers: pico −4,1 dBFS, **0 recortes, 0 NaN**.
- **Sonoridad media (RMS):** −17 a −19 dBFS en la salida del motor de música; la de la Gambetta medida igual (mismo script, sin reverb del motor) está en −19 a −22. Miraflores queda ~2 dB más fuerte: es música más densa. Si molesta, bajar `PRE` en `rock.js`.
- **Latencia de cambio de ánimo:** media 190–260 ms, peor caso 480 ms (un tiempo de explore dura 435 ms). 0 eventos tardíos, 0 descartados, 0 re-sincronizaciones.
- **Sonidos nuevos:** pico −2,9 a −15 dBFS antes de la mezcla del motor; los bucles quedan 10–15 dB debajo de los golpes.
- **Arranque:** 90 ms para crear el motor y calentar las notas del explore; el resto se calienta en pausas.
- **Afinación:** guitarra, saxo, bajo, órgano, piano y fuzz medidos con autocorrelación: error < 2 Hz en La3/Mi5.

## 6. Qué mirar con el oído (lo que la máquina no puede decir)

1. ¿La guitarra twang suena a guitarra o a sintetizador de juguete? Si es chillona, bajar el `pu` de `twang` en `KS`.
2. ¿El swing se siente de twist o de cuadrado? Se cambia en `PIECES.explore.sw` (0,667 = tresillo; 0,6 = más suave).
3. ¿El saxo y el órgano Farfisa se oyen bien sobre la batería en chase y horde? Volúmenes en `LAYERS` (`sax`, `organ`, `fuzz`, `crunch`).
4. ¿La jefa se reconoce? El descenso cromático solo suena con `setBoss(true)` **y** ánimo `horde`.
5. ¿Los pregones y frases se entienden con tu voz de sistema? Si no, ajustar `r` y `p` en `voces-mira.js`.
6. En la noche: ¿se siente «Miraflores de madrugada» o solo aburrido?
