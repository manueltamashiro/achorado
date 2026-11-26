# Barranco · B3 (audio): música criolla, sonidos y frases

Archivos: `juego/js/barranco/criolla.js` (música + reloj de compás), `sfx-br.js` (sonidos + director de ambiente), `voces-br.js` (frases), y la página de prueba `juego/preview-br-audio.html`. Todo original, sintetizado con Web Audio (sin samples, sin melodías ni letras reconocibles; los versos de Jaranón son inventados).
Probado en `http://127.0.0.1:8737/preview-br-audio.html` y dentro de `barranco.html?br=jefe` (el nivel ya lee `ACH.audio.br.beat()`, la zona de `ACH.world.zona` y `br.play('jefe1')`; sin errores de consola).

## 1. API real

`criolla.js` reemplaza a `surf.js`: se registra en `ACH.audio.musicEngine` con la **misma API** (start, setMood, setIntensity, stinger, setNight, night, diegetic, setListener, band, stop, state, setLevel, setBoss, pauseFilter, `_offline`/`_offlineBegin`/`_with`). Mismo mezclador, limitador y techo -3,2 dBFS que surf.js. Además, `ACH.audio.br`:

| Función | Qué hace |
|---|---|
| `br.beat()` | Reloj de compás exacto: `{ bpm, meter, beat, phase, bar, beatInBar, toNext, src:'audio', key, piece, boss, barInPiece, pulse, t, latency }` o `null` (sin música/contexto) |
| `br.onTime(tol=0.12)` | `true` si ahora está a ≤ tol s de un pulso |
| `br.play(id[, {now:true}])` | Toca un tema por nombre sobre cualquier ánimo: `jefe1`, `jefe2`, `jefe3`, `final`, `chase`, `horde`. `play('deseo')` = jingle sobre la música (no la corta). `play('explore'\|'playa'\|'bajada'\|'parque'\|'bohemia'…)` fija la zona y quita el tema pedido. Devuelve `true` si el id existe. Cambia en el siguiente pulso (≤ 0,9 s) con anacrusa de cajón; `{now:true}` en 60 ms |
| `br.stop()` | Quita el tema por nombre, vuelve al ánimo del juego y pone el tempo en 1 |
| `br.playing()` | id del tema por nombre o `null` |
| `br.setTempoMul(m)` / `tempoMul()` | Tempo del tema que suena (0.5–1.6), cambia en el **siguiente compás**; se pone en 1 al pedir otro tema con `play()` y con `stop()` |
| `br.setLayerMute(capa, on)` | Silencia una capa (para «el cajonero se cae»: `setLayerMute('cajon', true)`; también apaga el patrón de cajón). Capas: lead, contra, bordon, rhy, cajon, perc, palmas, coro, bass, crowd, far |
| `br.silence(on, secs)` | Fundido a silencio y de vuelta sin cambiar de tema (jefe sentado: «Silencio») |
| `br.setZone(z)` / `zone()` / `auto(on)` | Zona de exploración: `playa, bajada, puente, ermita, parque, bohemia, pena`. Con `ACH.nivel.id==='barranco'` se autodetecta cada 0,4 s con `ACH.world.zona(x,y)` (activada por defecto; `setZone` la apaga, `auto(true)` la reactiva) |
| `br.setNear(0..1\|null)` | Cercanía a la peña (abre la peña lejana de la zona bohemia); `null` = según la zona (bohemia 0,3 · pena 0,85) |
| `br.stinger(n)` | = `ACH.audio.music.stinger(n)` |
| `br.offset` | Calibración fina en segundos (+ = el pulso se lee más tarde) |
| `br.info()`, `br.themes`, `br.zones`, `br.sfx`, `br.phraseIds`, `br.amb` | Utilidades para pruebas |

### El reloj de compás (lo que usan jaranon.js, el cajón y el Landó)
- **Pulso** = la unidad del tema: la **negra** en el vals (`meter 3`); la **negra con puntillo** en el festejo 6/8 (`meter 2`) y en el landó 12/8 (`meter 4`). `bpm` = pulsos por minuto. `beat` y `bar` son contadores reales que **no se reinician al cambiar de tema** (probado: nunca retroceden ni saltan al cambiar de tema, de tempo o de zona).
- Sale del **mismo registro de compases del programador de notas** (`ctx.currentTime`) y descuenta lo que oye el jugador: `ctx.outputLatency`/`baseLatency` + 15,3 ms de los dos compresores de la mezcla (medido) + 6 ms del compresor maestro del motor. `latency` en la respuesta es el total (≈45 ms en este equipo). Las notas fuertes del cajón y la cajita (`exact`) caen **sin humanización** en el pulso.
- **Comprobación automática** (en la página de prueba): se renderiza cada jefe con solo la cajita y se detectan sus ataques; contra los pulsos de `beat()`: desfase máx. **0,09 ms** tras restar la latencia, 0 ataques sin pareja, beat monótono, y `beatInBar = 0` justo en el comienzo de cada compás.
- Los temas de jefe llevan la **cajita marcando cada pulso** (agudo en el 1) y cajón grave en el 1, para que el pulso se oiga claro.

## 2. Temas (ids, compás, tempo, tonalidad)

| id / ánimo | Nombre | Compás / pulso | bpm | Tono | Qué se oye |
|---|---|---|---|---|---|
| explore · zona `playa` | Playa al atardecer | vals 3/4 · negra | 92 | La menor → Do | guitarra criolla punteada + bordones + olas; contracanto en terceras desde I 0,35, cajón suave 0,55, palmas 0,75 |
| explore · `bajada`/`puente`/`ermita` | Bajada de Baños | vals 3/4 | 104 | Re menor → Fa | contracanto; cajón en **hemiola** (festejo suave 6/8 dentro del 3/4) en compases 4–6 y 12–13; palmas y quijada con I |
| explore · `parque` | Parque Municipal | vals 3/4 | 108 | Sol mayor | vals alegre, contracanto siempre, cajón desde I 0,1 |
| explore · `bohemia`/`pena` | Calles bohemias | vals 3/4 | 84 | Si menor | de noche: **peña lejana** (guitarra y cajón por un paso bajo que se abre con `setNear`), murmullo de gente continuo y **aplausos** cada 8 compases, guitarra suave de este lado |
| `chase` | Corre, que se arma la jarana | **festejo 6/8** · negra con puntillo, 2 por compás | 138 | Mi menor | cajón (grave, golpe, tapa), quijada, cajita, palmas, checo, bordones, rasgueo; coro «aah» con I ≥ 0,9 |
| `horde` | Landó de los muertos | **landó 12/8** · 4 por compás | 72 | Re menor → La frigio | bordones largos, arpegio amplio, cajón grueso, quijada lenta, coro grave «ooh», bajo sub |
| `jefe1` | Vals de la Voz de Oro | vals 3/4 | **100** | Sol menor | cajón fuerte en el 1, cajita en cada pulso, palmas, contracanto, quijada |
| `jefe2` | Festejo en la pista | **6/8, meter 2** | **108** (pulso) | La menor | todo el festejo + `setTempoMul` (el cajonero acelera hasta ×1,2 → 130 bpm) |
| `jefe3` | Landó del pecho | **12/8, meter 4** | **66** (pulso) | Mi menor | lento y pesado, coro grave, cajita marcando los 4 pulsos |
| `final` | La última jarana | vals lento 3/4 | 66 | Sol mayor | guitarra, bordones, rasgueo suave, **«mmm» tarareado** en octava baja doblando la melodía (sin cajón; 8 compases ≈ 22 s por vuelta, en bucle; sin cajita, pero `beat()` funciona igual) |
| `deseo` | jingle del deseo | — | — | — | arpegio de armónicos que sube, campanas y un «aah»; encima de la música |
| `title` | = playa con mezcla fija | | | | |
| `dead` | lamento de guitarra | 3/4 | 56 | La menor | 2 compases, no se repite |
| `won` | silencio | | | | el stinger `win` trae el final |

- `setBoss(true)` con ánimo `chase`/`horde` toca `jefe1` (compatibilidad); el jefe nuevo pide sus temas con `play()`.
- Cambios entre temas de exploración (zona): en el siguiente **compás**, sin cortar las colas (suena como cambio de sección). Si algún lado es urgente (chase, horde, jefes) o es `final`: en el siguiente **pulso**, con anacrusa de cajón, cortando la cola. El explore reanuda donde estaba (`resume`).
- **Noche** (`music.setNight`): sombra de agudos y más sala, sin cambiar el tempo (el reloj no se mueve).
- **Combo de la calle** (`diegetic(x,y,on)`): trío criollo (guitarra, bordón y cajón) en vals de La menor a 96 bpm, posicional.
- Stingers: los de siempre (`kill, hurt, horde, death, win, cobrador, boss.intro, boss.down, gong`) reescritos con guitarra/cajón/quijada/palmas/campana, y nuevos `br.atiempo`, `br.contrapunto`, `br.pregon`, `br.respuesta`, `br.deseo`.
- Carga: el primer tema arranca en ≈70 ms; los demás se calientan en pausas de 60 ms (maxGap del programador 29 ms, 0 tardíos, 0 descartados, 0 resincronizaciones). ~14 MB de cuerdas en caché.

## 3. Sonidos (`ACH.audio.emit(name, data)`; todos aceptan `data.delay`, posicionales con `x,y`, `boost 1..10`)

Los **nombres del contrato (§9)** y además los que ya usan `jaranon.js`, `objetos.js`, `vecinos.js` y `nivel.js` (alias). 87 recetas, todas renderizadas offline sin NaN ni excepciones (niveles comparables a los de `sfx-cv.js`).

- **Ambiente:** `br.gaviota`, `br.escalon {n}`, `br.puente.paso`, `br.puente.crujido`, `br.porton` (= `br.porton.abre`), `br.porton.cierra`, bucles `br.olas {intensity}` (oleaje de canto rodado con el castañeteo de piedritas) y `br.grillos {intensity}`.
- **Cajón:** `br.cajon {atiempo}` (el golpe del arma: palmada + onda que se abre, + campanita dorada si es a tiempo), `br.cajon.golpe`, `br.cajon.onda {tiempo, r}`, `br.cajon.atiempo`, `br.cajon.rompe` (= `br.cajon.roto`), `br.cajon.alza`.
- **Botellas:** `br.botella.lanza` (= `br.botella.tiro {charge}`), `br.botella.rompe {gold|dorada}` (= `.break`), `br.botella.vidrios`, `br.charco`, `br.resbalon {player}`, `br.caida`, `br.caja.rompe`, `br.mesa.rompe`.
- **Bohemios:** `br.poeta.murmullo`, `br.poeta.declama`, `br.letra.lanza`, `br.letra.golpe`, `br.letra.rompe`; `br.brochazo.lanza`, `br.brochazo.splat {hit}`, `br.mancha`, `br.caballete.rompe`; `br.musico.nota {kind: zampona|guitarra|cajon, n 0..4}` (+ `br.musico.zampona/.guitarra/.cajon`).
- **Parejas:** `br.pareja.suspiro`, `br.pareja.beso`, `br.pareja.despechado` (el grito), `br.pareja.llanto`. **Jaranero:** `br.zapateo {n}`, `br.zapateo.empuja`, `br.jaranero.llega`.
- **Peña:** `br.pena.aplausos {size}` (= `br.aplausos {n}`), `br.pena.eso`, `br.pena.risas`, `br.pena.brindis`, `br.pena.focos`.
- **Jaranón:** `br.jefe.entra`, `br.jefe.grito`, `br.jefe.voz {text}`, `br.jefe.nota {i|n 0..2}`, `br.jefe.panuelo`, `br.jefe.loseta.aviso`, `br.jefe.loseta.quema` (= `br.jefe.loseta`), `br.jefe.sostenida {dur}` (dura `dur` s), `br.jefe.sinaire`, `br.jefe.pisoton` (= `.zapateo`, `.stomp`), `br.jefe.pregon`, `br.jefe.herido {big}` (= `.hurt`, `.duele {aTiempo}`), `br.jefe.aturdido`, `br.jefe.cae` (= `.resbala`), `br.jefe.sienta`, `br.jefe.muere`, `br.cajonero.cae`, `br.cajonero.golpe`, `br.cajonero.duele`.
- **Ritmo:** `br.metronomo {accent}` (tic de madera), `br.atiempo` (= `br.tiempo`), `br.contrapunto`, `br.respuesta` (= `br.metronomo.responde`), `br.destiempo`.
- **Premios:** `br.deseo` (chispas + llama al stinger de música `br.deseo`), `br.dato`.
- **Director de ambiente** (`ACH.audio.br.amb`, solo con `ACH.nivel.id==='barranco'` y el juego en `playing`): oleaje según la zona (playa 0,9 · bajada 0,35 · puente 0,22 · ermita 0,28 · parque/bohemia/peña 0), gaviotas cada 8–18 s (no de noche), grillos en parque y ermita. `amb.enabled=false` / `start()` / `stop()` / `setBed(k)` / `state()`.
- Sin receta no suena nada (el motor lo ignora): lo que no esté en la lista no rompe.

## 4. Frases (`ACH.audio.say(id, {x, y, who?, always?, force?})`, también con `br.<id>`)

37 ids. **Zombis:** `br_poeta`, `br_poetaRojo`, `br_pintor`, `br_musico`, `br_pareja`, `br_despechado`, `br_jaranero`. **Jaranón** (zombie grave y pausado): `br_jaranonEntrada` «¡Silencio en la sala! ¡Que aquí canta la Voz de Oro!», `br_jaranonEntrada2`, `br_jaranonPregon` (sortea 6 versos inventados), `br_jaranonResponde`, `br_jaranonLuce`, `br_jaranonAire`, `br_jaranonEso`, `br_jaranonHerido`, `br_jaranonFase2`, `br_jaranonFase3`, `br_jaranonMuerte`. **Vendedores:** `br_tomas`, `br_rosa`, `br_lucho`, `br_celedonio`, `br_noAlcanza` «Fiado no hay, compadre, que la jarana se paga», `br_gracias`. **Alexander:** `br_barranco`, `br_cajon`, `br_atiempo`, `br_contrapunto`, `br_resbala`, `br_botella`, `br_botellaRota`, `br_deseo`, `br_sinRespirar`, `br_puente`, `br_cuaderno`, `br_peña` (= `br_pena`), `br_jaranonMuere` «Ya, maestro. Ya terminó la función.»
`ACH.audio.say` se envuelve para `who`: poeta, pintor, musico, novio, novia, pareja, jaranero, jaranon, bohemio → voz zombie; tomas, lucho, celedonio, vendedorBR → pasajero (hombre); rosa, lucia → señora (mujer).

## 5. Página de prueba `preview-br-audio.html`
Botones de ánimo, zona, cercanía, temas por nombre, tempo, silenciar cajón, silencio, stingers, los 87 sonidos, bucles, frases. **Reloj de compás** en vivo (pulsos dorados, el 1 rosa, fase, `toNext`, latencia, `onTime`) y un **tic de prueba** que programa un click en cada próximo pulso según `toNext` (en los temas de jefe debe sonar como un solo golpe con la cajita; calibración en ms). «CORRER PRUEBAS» renderiza cada tema/ánimo/cadena de cambios offline (pico, rms, NaN, recortes, tardíos), la comprobación de sincronía (ataques contra pulsos), la monotonía del reloj y cada receta de sonido.

## 6. Guía de escucha (para el QA humano)
1. `ACTIVAR AUDIO` → `explore` + zona `playa`, I = 0: guitarra de nailon suave con bordón y olas; sube I a 0,35 / 0,55 / 0,75 y entran el contracanto, el cajón suave y las palmas.
2. Zonas: `bajada` (vals más vivo; en los compases con hemiola el cajón «se vuelve festejo»), `parque` (alegre, Sol mayor), `bohemia` con «noche» activada (peña lejana, murmullo, aplausos cada ~11 s); sube «cercanía» a 1: la peña se abre.
3. `chase` (festejo rápido con quijada) y `horde` (landó oscuro, coro grave). `setBoss` + horde = jefe1.
4. Temas de jefe: `jefe1` vals pesado; `jefe2` con el deslizador de tempo a 1,2 («el cajonero acelera») y «silenciar cajón» («el cajonero se cayó»); `jefe3` landó lento. Activa **tic de prueba**: el click debe caer exactamente sobre la cajita (un solo golpe, no doble). Cambia entre jefes: el pulso no se descuadra.
5. `final`: guitarra con «mmm» tarareado, íntimo. `deseo`: chispas encima de la música.
6. Stingers y sonidos: cajón normal vs a tiempo (campanita), botella → vidrios → charco → resbalón → caída; poeta, pintor, músico (3 timbres), pareja (suspiro, beso, **despechado**); Jaranón (nota, pañuelo, losetas, **sostenida**, «sin aire», pisotón, muerte en paz).
7. Frases: la voz es speechSynthesis del sistema; los versos de Jaranón van lentos y graves.

## 7. Decisiones y límites
- **Meter de los jefes:** el festejo se cuenta en 6/8 con 2 pulsos por compás (negra con puntillo) y el landó en 12/8 con 4; jaranon.js ya lee `meter`/`bpm` del reloj, no hace falta nada más. Si algún sistema prefiere un pulso por corchea, puede multiplicar `meter` y `bpm` por 3 (no se hizo: 5–7 pulsos/s no se pueden jugar).
- `br.beat()` devuelve `null` si el contexto no corre (audio bloqueado): el reloj interno de `nivel.js` toma el relevo, como pide §1.
- La peña lejana, el murmullo y los aplausos viven en la propia música (zona bohemia); no hay samples de voces. Las risas están en `br.pena.risas` (síntesis de formantes).
- No se tocó ningún archivo ajeno. Las voces reusan las de `voces.js` (alex, zombie, señora, pasajero) vía un envoltorio de `A.say`, como `voces-cv.js`.
- Lo único que no se pudo verificar: la estética «de oído» (no hay altavoces en el entorno de QA automático). Los números (pico ≤ -4,4 dBFS, sin recortes, sin NaN) sí están medidos.
