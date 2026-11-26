# ACHORADO — Barranco (contrato del arquitecto)

## 0. Lo que pidió el dueño (2026-11-21)
- **Cuándo:** justo después de Costa Verde (Larcomar → chef → parapente → Tablazo).
- **Cambio en Costa Verde:** el parapente ya **no aterriza en Chorrillos sino en una playa de Barranco**, y el nivel Barranco arranca ahí.
- **Zonas:** la **Bajada de Baños** y el **Puente de los Suspiros**, el **Parque Municipal** y **La Ermita**, y los **bares y peñas** en casonas (Barranco bohemio). Murales y museos NO.
- **Hora:** empieza al **atardecer** en la playa y **se hace de noche** al llegar a los bares y la peña (faroles, casonas iluminadas).
- **Música:** **criolla de peña** (vals, festejo, landó; guitarra y cajón), toda **original** y sintetizada.
- **Zombies nuevos:** **bohemios** (poetas, pintores con caballete, músicos callejeros) y **parejas de enamorados** que atacan juntas.
- **Armas nuevas:** **cajón peruano** (lo golpeas y suelta una onda de sonido que empuja a los zombies) y **botellas de bar** (se lanzan, se rompen y dejan un charco donde resbalan).
- **Jefe:** un **cantante de peña zombie gigante**. Pelea de **ritmo + combate**: canta y ataca **al compás del cajón**; Alexander esquiva y responde con su guitarra/melodías **a tiempo** para dañarlo.
- **Al vencerlo:** **cinemática con diálogo de retrato**; el cantante, ya en paz, le da **una pista de la cura**, y se desbloquea **Chorrillos** en el mapa.
- **Gente viva:** sobrevivientes con **tienda**, un **viejo cantante criollo que le enseña una melodía nueva** antes del jefe y, ADEMÁS, **todos los sobrevivientes, cuando les hablas, te cuentan datos reales de Barranco**.
- **Nombres reales** de bares/peñas/restaurantes detrás del interruptor `ACH.cfg.marcasReales` (con parodia si se apaga), como en Callao y Miraflores.
- **Duración:** como Costa Verde, **15–25 min** con el jefe.

**Investigación (manda en forma, orden, colores y datos):** `../diseno/investigacion-barranco.md`. Léela antes de empezar. Lo marcado «(sin confirmar)» se puede inventar con criterio. **Ningún dato presentado como real puede ser inventado.**

**Arte:** guía de `../diseno/revision-estetica.md` y `SPEC.md` v0.4: 480×270, tiles de 16 px, 1 m = 16 px, alturas comprimidas, fuentes ACH5/7/12, contorno oscuro de 1 px. Barranco es **cálido y gastado**: casonas republicanas pastel descascaradas, buganvilias, madera, ladrillo, faroles de fierro, mar gris verdoso. Cielo panza de burro con **sol de atardecer** que rompe un poco en la playa y luego noche azul con faroles amarillos.

**Decisiones del arquitecto:**
- **Orden real, compactado ~4×** entre hitos (hitos a tamaño real): **playa → Bajada de Baños (subiendo, pasa por DEBAJO del Puente) → arriba de la bajada → se cruza el Puente → La Ermita y su mirador → (de vuelta por el Puente si la geografía real lo exige) → Parque Municipal → calles bohemias → peña del jefe**. Si la investigación dice otro orden real, manda la investigación (anótalo en tu nota).
- **Orientación (corregida con la investigación):** el **mar queda al OESTE = a la izquierda**; el nivel avanza **de oeste a este = de izquierda a derecha**. La playa (abajo a la izquierda) → la Bajada de Baños **sube en diagonal hacia arriba a la derecha** (real: NE; subir un poco más lento, `speedMul` 0.9 en escalones) → arriba, el Puente (E–O), la Ermita al oeste del puente y la Calle Ermita como mirador → el Parque Municipal al este → la Av. Grau → calles bohemias al noreste → la peña. Usa las posiciones de OpenStreetMap de la investigación (§1 y su mapa ASCII).
- **Playa real:** «Playa Barranco / Baños de Barranco», de **piedras y guijarro** (no arena), con restaurantes frente al mar y el **puente peatonal sobre el Circuito de Playas** al pie de la bajada. No hay rompeolas.
- **La peña del jefe es inventada:** **«PEÑA LA ÚLTIMA JARANA»**, al final de las calles bohemias. Las peñas y bares reales van como fachadas en el camino.
- **El jefe:** **«DON JARANÓN, la Voz de Oro de Barranco»**, cantante criollo inventado (no se parece a ningún cantante real). Toque triste: **la abuela de Alexander lo escuchaba en la radio todos los domingos**; Alexander lo reconoce.
- **El maestro:** **«DON CELEDONIO»**, viejo guitarrista que tocaba con Jaranón; se esconde cerca de la peña y le enseña a Alexander la melodía nueva **«LANDÓ DEL CONTRAPUNTO»**: «A Jaranón no se le gana gritando, se le gana respondiendo a tiempo».
- **Leyenda del puente (opcional, premio):** cruzar el Puente de los Suspiros **corriendo sin parar y sin recibir daño** («sin respirar») concede un deseo (§2.5).
- **Parejas:** dos zombies **separados que van de la mano**; si matas a uno, el otro queda **«despechado»** (humor negro): más rápido y más fuerte.
- Sin chistes con temas reales sensibles (ver la sección 9 de la investigación).

---

## 1. Arquitectura: página aparte (igual que Costa Verde)
- **Página propia:** `barranco.html` → `build-barranco.sh` (el mismo `awk` de `build-costaverde.sh`) → `dist/barranco.html`.
- **Scripts:** copia la lista de **`costaverde.html` tal como esté al construir** (incluidas las etiquetas v0.14 `volumen.js`, `postfx.js`, `ui-v014.js` y `css/pulido-v014.css`, en su misma posición), con estos cambios:
  - `js/costaverde/nivel.js` → `js/barranco/nivel.js`; `js/costaverde/mundo.js` → `js/barranco/mundo.js`; `js/costaverde/surf.js` → `js/barranco/criolla.js`;
  - se quitan `chef.js`, `caida.js`, `arte-caida.js`, `chorrillos.js`, `sobrevivientes.js`, `dron.js` y `zombis.js` de Costa Verde, y lo de Costa Verde que sea solo del malecón/Larcomar (`locales.js`, `arte-malecon.js`, `arte-larcomar.js`) **si no hace falta**;
  - **se dejan** `juguetes.js`, `arte-personajes.js`, `sfx-cv.js`, `voces-cv.js` de Costa Verde y lo que se dejó de Miraflores (`inflables.js`, `arte-*`, `sfx-mira.js`, `voces-mira.js`), porque traen las definiciones de objetos que Alexander puede traer en la mochila (pelota, barra fosforescente, helados, inflables…). **Si algo trae vendedores, perritos o heladeros al mapa de Barranco, se apaga desde `js/barranco/nivel.js`** (como `W.vendors = []` en Costa Verde). Si algo estorba, se reporta.
  - se agregan los `js/barranco/*` en el orden de §1.2.
- **NO SE EDITAN** (salvo lo que §1.1 asigna explícitamente): `index.html`, `miraflores.html`, `costaverde.html`, los `build*.sh` existentes, `js/engine/*`, `js/miraflores/*`, `js/costaverde/*`, `js/base/*`, `js/sprites/*`, `js/audio/*`, `js/cine/*`.
  - **Ojo, otra sesión:** «Mejoras de experiencia del juego» tiene pendiente el pulido visual v0.14 (`V014.md`) y es dueña de `render.js`, `input.js`, `pausa.js`, `tactil.js`, `game.js`, `entities.js`, `luz.js`, `postfx.js`, `volumen.js`, `ui-v014.js`, `css/pulido-v014.css`. **Nadie de Barranco toca esos archivos.**
  - Lo que falte se extiende en tiempo de ejecución desde `js/barranco/*` a través de lo exportado (`ACH.nivel`, `ACH.armas.define`, `ACH.inv.defs`, `ACH.zvar`, `ACH.ent`, `ACH.sprites.*`, `ACH.tienda`, `ACH.vendedores`, `ACH.VENDEDORES_DATA`, `ACH.dialogo`, `ACH.objetivo`, `ACH.hab`, `ACH.extraDrawables`, `ACH.propHooks`, `ACH.drawHooks`, `ACH.viaje`, `ACH.cima`). Si algo es imposible sin editar un archivo ajeno, se anota en tu nota y se sigue con una solución provisoria.
- **`ACH.nivel`** (de `js/barranco/nivel.js`): la MISMA forma que el de Costa Verde (lee `js/costaverde/nivel.js` y `MIRAFLORES.md` §2), con `id: 'barranco'`. Los sistemas se registran con `ACH.br.register(sys)` (lista `ACH.br.systems`). **Compatibilidad:** igual que Costa Verde crea `ACH.mira` como alias, `nivel.js` crea **`ACH.mira` y `ACH.cv` como alias** de los mismos sistemas y funciones (`register`, `sfx`, `toast`, `brandName`, `talk`, `flag`, `zombis.popText` si aplica), para que `juguetes.js`/`inflables.js` corran igual.
- **Reloj del compás (lo usan el jefe, el cajón y la melodía nueva):** `nivel.js` expone
  ```
  ACH.br.beat() → { bpm, meter, beat /*nº de pulso, real*/, phase /*0..1 dentro del pulso*/, bar, beatInBar, toNext /*s al próximo pulso*/, src: 'audio'|'interno' }
  ACH.br.onTime(tol=0.12) → true si ahora está a ≤ tol s de un pulso
  ```
  Usa `ACH.audio.br.beat()` de `criolla.js` (B3) si existe y la música suena; si no, un reloj interno al `bpm` del tema actual (`ACH.br.setTempo(bpm, meter)`). **Así todo funciona aunque el audio esté bloqueado o falte.**
- **Robustez y reglas del motor:** idénticas a `COSTAVERDE.md` §1 (cada archivo funciona aunque falten los otros; bloque de color con nombre si falta un sprite; llamadas protegidas; sin `getImageData`/`shadowBlur`/`filter`/degradados por cuadro; hornear una vez; lienzos con `ACH.lienzo`/`ACH.px.canvas`; 60 fps).
- **Probar:** `sh build-barranco.sh` y servir **desde la fuente**: `cd juego && ruby -run -e httpd . -p <PUERTO> -b 127.0.0.1`, abrir `http://127.0.0.1:<PUERTO>/barranco.html` en el Browser pane (tu propia pestaña). No hay node ni python; sintaxis con `osascript -l JavaScript` o cargando la página.
  - **Puertos:** B1a 8731 · B1b 8732 · B1c 8733 · B2a 8734 · B2b 8735 · B2c 8736 · B3 8737 · B4 8738 · B5 8739 · QA 8740. Al terminar, apaga tu servidor.
- **Idioma:** castellano chalaco (sin groserías fuertes); los barranquinos hablan un poco más criollo/limeño antiguo («jarana», «compadre», «la cosa es así»). Menús en estilo chicha.
- **Nota final de cada fase:** `../diseno/br-<fase>.md` (qué hiciste, API real, claves de sprites reales, qué falta, problemas).

### 1.1 Archivos y dueños
| Archivo | Contenido | Dueño |
|---|---|---|
| `barranco.html`, `build-barranco.sh`, `js/barranco/nivel.js`, `mundo.js`, `zombis.js` | Página, títulos/intro, llegada por viaje, ganchos, `ACH.br.beat`, atardecer→noche, mapa, cámara, puntos de control, leyenda del puente, zombies nuevos, debug, final del nivel (cartel y viaje al mapa) | **B1a** (Opus) |
| `js/barranco/jaranon.js` | Jefe Don Jaranón, peña-arena, banda zombie, HUD del compás, contrapunto, muerte y disparo del final | **B1b** (Opus) |
| `js/barranco/objetos.js`, `js/barranco/vecinos.js`; **ediciones** en `js/engine/habilidades.js` y `js/audio/melodias.js` (solo la melodía 6) | Cajón, botellas y charcos, comidas, vendedores; sobrevivientes con datos reales, diario, mini-tarea, el maestro y la melodía nueva | **B1c** (Opus) |
| `js/barranco/arte-lugares.js` | Playa, mar, Bajada de Baños, Puente, Ermita, mirador, Parque Municipal, mobiliario, cielo atardecer | **B2a** (Sonnet) |
| `js/barranco/arte-casonas.js` | Casonas, fachadas de bares/peñas con marcas, la peña del jefe por fuera y por dentro, luces de noche | **B2b** (Sonnet) |
| `js/barranco/arte-personajes.js` | Jefe, banda, zombies nuevos, sobrevivientes, objetos, Alexander con cajón/botella | **B2c** (Sonnet) |
| `js/barranco/criolla.js`, `sfx-br.js`, `voces-br.js` | Música criolla con reloj de compás, sonidos y frases | **B3** (Sonnet) |
| **ediciones** en `js/costaverde/chorrillos.js`, `js/costaverde/nivel.js` (solo cartel final y viaje), `js/engine/viaje.js`, `js/cine/cima.js` (solo tablas de niveles), `preview-chorrillos.html` | Aterrizaje en Barranco y conexión del mapa | **B4** (Sonnet) |
| `js/barranco/final.js`, `preview-br-final.html` | Cinemática «La última jarana» | **B5** (Sonnet) |
| `BARRANCO.md` | este contrato | arquitecto |

### 1.2 Orden de carga en `barranco.html`
1. `js/barranco/nivel.js` **primero**.
2. Sprites de siempre (como `costaverde.html`), luego el arte de Miraflores y de Costa Verde que se deja.
3. Arte de Barranco: `arte-lugares.js`, `arte-casonas.js`, `arte-personajes.js`.
4. Audio: lo de `costaverde.html` con **`js/barranco/criolla.js`** en lugar de `surf.js`, y al final `sfx-br.js`, `voces-br.js`.
5. Motor como en `costaverde.html`, con **`js/barranco/mundo.js`** en vez del `mundo.js` de Costa Verde.
6. Lo que se deja de Miraflores/Costa Verde (`inflables.js`, `juguetes.js`…) en su posición.
7. `zombis.js`, `objetos.js`, `vecinos.js`, `jaranon.js`, `final.js`.
8. `js/cine/cima.js`, `base/base.js`, `engine/pausa.js`, `engine/game.js` al final, como en `costaverde.html`.

---

## 2. El mapa (`mundo.js` + `nivel.js`, B1a)
`ACH.world` con la **misma forma** que `js/costaverde/mundo.js` (todas sus claves), `id: 'barranco'`, más:
- `places{}`: `playa, orilla, bajadaPie, bajadaMedio, bajoPuente, bajadaCima, puenteA, puenteB, ermita, mirador, parque, biblioteca, iglesia, grau, bohemia1, bohemia2, celedonio, penaPuerta, penaEscenario` (ajusta a la investigación y documenta).
- `zona(x, y) → 'playa'|'bajada'|'puente'|'ermita'|'parque'|'bohemia'|'pena'`, usada por música, hora y zombies.
- **Tamaño:** del mismo orden que Costa Verde (mídelo) para 15–25 min con el jefe.

### 2.1 Tramos (la investigación manda en el detalle)
1. **Playa Barranco / Baños de Barranco** (al pie de la bajada): canto rodado y guijarro, orilla animada, restaurantes de playa, torre de salvavidas, sombrillas rotas, **el parapente rosado y amarillo tirado** donde aterrizó. Para subir a la bajada se cruza el **puente peatonal sobre el Circuito de Playas** (pista con autos abandonados). Vista del **Morro Solar** al sur (horneada en el fondo). Pocos zombies (playeros, algún músico).
2. **Bajada de Baños** subiendo: escalones de piedra/adoquín, muros con buganvilias, casitas y restaurantes a los lados, faroles; quebrada verde. **Se pasa por DEBAJO del Puente de los Suspiros** (el puente se dibuja en la capa `air`, por encima de Alexander, con su sombra en el piso).
3. **Arriba / Puente / Ermita:** el **Puente de los Suspiros** de madera cruzando la bajada; al otro lado **La Ermita** (fachada en ruinas) y el **mirador** al mar. Muchas **parejas**. Anticuchera.
4. **Parque Municipal:** forma real, fuente, bancas, la **Biblioteca Municipal**, la **iglesia** del parque, quioscos. Poetas y pintores.
5. **Calles bohemias:** casonas convertidas en bares y peñas reales (fachadas con marcas), mesas afuera, músicos zombies. Ya es **de noche**. Don Celedonio escondido cerca de la peña.
6. **Peña La Última Jarana:** portón; adentro, **tabladillo** con la banda zombie, mesas, barra, pista de baile = **arena del jefe** (cerrada hasta que hables con Don Celedonio o, si lo saltas, abierta igual con aviso).

### 2.2 Atardecer → noche (`nivel.js`)
- La hora **avanza con el recorrido** (no con el reloj): playa = atardecer dorado-naranja con sol bajo detrás de la neblina; bajada = crepúsculo morado; desde el puente = noche azul; calles bohemias y peña = noche cerrada con faroles y ventanas encendidas.
- Usa el mecanismo de noche que exista (`ACH.nivel.noche`, `js/engine/noche.js`, luz horneada de `render.js`); si hace falta un tinte extra, **horneado por tramo** y mezclado con alfa (nada por píxel en cada cuadro). Los `lamp` se prenden de noche.
- Los zombies se vuelven más fuertes de noche como en el resto del juego (lo que el motor ya haga).
- Debug: `ACH.debug.br.hora(0..1)` fuerza la hora.

### 2.3 Inicio, intro y puntos de control
- **Llegada desde Costa Verde:** `nivel.js` lee `ACH.viaje.take()` (con el mismo respaldo por `#viaje=` que usa `js/costaverde/nivel.js`). Con `carry`, salta el título y arranca con la intro. Sin viaje, título con kicker «BARRANCO · BAJADA DE BAÑOS» y la línea «Nivel: Barranco, la noche bohemia».
- **Intro con retrato** (regla de diálogos con retrato), 3–4 líneas, junto al parapente tirado. Por ejemplo:
  - (sorpresa) «¡Barranco, causa! Aterricé en la playa con todo y paloma.»
  - (serio) «El sol ya se está yendo. De noche los muertos se ponen más bravos.»
  - (pícaro) «Dicen que aquí todos cantan. A ver si me dejan un sitio en la jarana.»
- **Puntos de control:** playa, cima de la bajada, Parque Municipal, puerta de la peña.

### 2.4 Final del nivel
Jefe muerto → `ACH.br.final.play({ onEnd })` (B5) → `onEnd` → cartel **«¡BARRANCO SE QUEDÓ EN PAZ!»** (tiempo, fans tumbados, muertes, datos escuchados X/Y, deseo del puente sí/no) → ENTER: `ACH.viaje.setDone('barranco')` y `ACH.viaje.go('main', carry, { mapa: true })` como hace Costa Verde (el mapa ya muestra Chorrillos desbloqueado, §7). Sin B5, directo al cartel.

### 2.5 La leyenda del Puente de los Suspiros
- Al pisar el puente por primera vez: toast «Cuentan que si cruzas sin respirar, se cumple tu deseo…».
- **Reto:** cruzar el puente de punta a punta **corriendo sin soltar correr, sin pararte y sin recibir daño** (si se acaba el aliento, falla). Ganarlo una vez: chispas, sonido de deseo y **un deseo al azar**: vida máxima +10 por el resto del nivel, o sabor lleno + 1 botella dorada (daño ×2), o 10 monedas. Diálogo corto con retrato (risa): «¡Deseo concedido! Pedí que la cura exista… y que me paguen por cantar.»
- Se puede intentar las veces que quieras hasta ganarlo; se guarda en la bandera `barranco.deseo`.

### 2.6 Debug obligatorio (`ACH.debug.br`)
`tp(place)`, `skip('jefe'|'final')`, `god(true)`, `give(id, n)`, `hora(t)`, `routeCheck()` (BFS playa → peña), `spawnCheck()`, `state()`, y `?br=jefe`, `?br=final`, `?br=noche` en la URL.

---

## 3. Zombies nuevos (`zombis.js`, B1a)
Formato `ACH.zvar` (copia el patrón de `js/costaverde/zombis.js` sin editarlo). Densidad parecida a Costa Verde, más alta de noche en las calles bohemias.

| Tipo | Dónde | Comportamiento |
|---|---|---|
| **Poeta** | parque, Ermita, bohemia | Lento. Cada tanto **se para a declamar** 1.5 s: suelta 3–4 **letras flotantes** que avanzan despacio hacia Alexander; si lo tocan, **lo ralentizan** (×0.6, 1.5 s). Las letras se rompen con un golpe. Vida 3 |
| **Pintor** | parque, mirador | Con caballete. A distancia (≤110 px) **lanza un brochazo de pintura** (arco corto, aviso 0.5 s): 1 de daño y deja una **mancha** en el piso que frena. El caballete es un prop rompible que suelta monedas. Vida 3 |
| **Músico callejero** | playa, bajada, bohemia | Toca zampoña, guitarra o cajón (skin). Mientras toca, los zombies a ≤90 px van **+25 % más rápido** (notitas que lo delatan). No persigue mucho; si lo atacas, pelea con el instrumento. Vida 2.5 |
| **Pareja de enamorados** | puente, Ermita, parque | **Dos zombies separados de la mano** (novio y novia): avanzan juntos y **flanquean** (uno por cada lado). Si matas a uno, el otro queda **«despechado»**: grito, lágrimas, ×1.5 velocidad y ×1.5 daño hasta morir. Vida 2.5 cada uno. Distinta de la pareja abrazada de Costa Verde |
| **Jaranero** | bohemia, peña | Zombie de fiesta con pañuelo que **zapatea** y baila; su zapateo empuja si estás pegado. Vida 2, rápido a ratos |
| Zombies de siempre | todo | Algunos playeros/caminantes de Lima, pocos |

XP de los nuevos en `ACH.hab` (si hay tabla de XP por tipo, regístralos por API; si no, anótalo).

---

## 4. Armas, objetos, tiendas (`objetos.js`, B1c)
Objetos en `ACH.inv.defs`, armas en la mano con `ACH.armas.define` (respeta `ACH.cfg.durMul`), golpes por `ACH.nivel.onSwing`, proyectiles por `onProjectile` (kinds abajo) para que el jefe los reciba. Mira cómo lo hacen `js/costaverde/juguetes.js` e `inflables.js`.

### 4.1 Cajón peruano (`cajon`)
- **Arma en la mano** (se ve a Alexander cargándolo; al usarlo, se sienta un instante y lo golpea).
- **Golpe (botón de ataque):** **onda de sonido 360°** de radio 56 px: daño 0.5, empujón 160, aturde 0.5 s. Enfriamiento 1.1 s. Dura 15 golpes (×durMul).
- **A tiempo** (`ACH.br.onTime()`, o el reloj de la melodía en otras páginas): radio 72, aturde 1 s y anillo dorado «¡A TIEMPO!». Así enseña el ritmo antes del jefe.
- Proyectil/área `kind: 'cajon'`. Rompe props livianos dentro de la onda.
- Se compra (Don Celedonio, Lucho) y hay uno en la playa con el músico zombie.

### 4.2 Botellas de bar (`botella`, `botellaDorada`)
- **Se lanzan** apuntando con el mouse (como el helado de Costa Verde o el molotov sin fuego: arco corto, carga opcional). Táctil: el botón de lanzar que ya exista.
- Al romperse: **daño 1** (dorada 2), vidrios, y un **charco** de 40 px que dura 4 s: los zombies que lo pisan **resbalan** (patinan 0.4 s y **caen** 1 s, aturdidos). **Alexander también resbala un poquito** si corre encima (patina, no cae ni se daña).
- Proyectil `kind: 'botella'`. Se apilan en la mochila. Las cajas de cerveza vacías de los bares son props rompibles que sueltan 1–3 botellas.

### 4.3 Comidas y bebidas nuevas
`anticucho` (+30 vida), `picarones` (+20 vida y +15 sabor), `chichaMorada` si no existe ya (+20 aliento), `pescadoFrito` (+40 vida), `emoliente` (+15 vida, cura la lentitud). Íconos en B2c.

### 4.4 Vendedores (con `ACH.tienda`)
Se registran en `ACH.VENDEDORES_DATA` con `nivel: 'barranco'` y se ponen en el mundo con la API de vendedores (como `juguetes.js`). Los vendedores también son **sobrevivientes** (§5): la tienda se abre desde su menú de charla.

| id | Quién | Dónde | Stock (precio en sencillos) |
|---|---|---|---|
| `tomas` | **Don Tomás**, viejo pescador | playa | pescadoFrito 4, emoliente 2, botella 1 |
| `rosa` | **Doña Rosa**, anticuchera | cima de la bajada / junto al puente | anticucho 3, picarones 3, chichaMorada 2 |
| `lucho` | **Lucho**, barman de una casona | calles bohemias | botella 1, pack de 3 botellas 3, botellaDorada 5, cajon 8, Inca Kola, cuerdas 2 |
| `celedonio` | **Don Celedonio** (el maestro) | cerca de la peña | cuerdas 2, cajon 7, emoliente 2 |

Frase de «no alcanza»: «Fiado no hay, compadre, que la jarana se paga».

---

## 5. Sobrevivientes, datos de Barranco y el maestro (`vecinos.js`, B1c)
### 5.1 Datos reales al hablarles (pedido expreso del dueño)
- Cinco sobrevivientes: **Don Tomás** (playa), **Doña Rosa** (bajada/puente), **Lucía, la poeta** (Ermita/mirador), **Lucho** (bohemia), **Don Celedonio** (peña).
- Cada uno tiene **6 datos reales** de la investigación (los de su zona; Don Celedonio cuenta los de música criolla y peñas). **Copia los datos de `../diseno/investigacion-barranco.md`, en lenguaje sencillo y con la voz del personaje; no inventes ninguno.**
- **E** al hablarles: la primera vez, presentación (diálogo con retrato de Alexander; el sobreviviente por nombre). Después, cada **E** abre un menú corto: **«CUÉNTAME DE BARRANCO» / «COMPRAR» (si vende) / «CHAU»**. «Cuéntame» da **el siguiente dato** (1 lámina del sobreviviente + a veces una reacción corta de Alexander con retrato). Al acabarse: «Ya te conté todo, joven. Ahora anda y vívelo».
- Cada dato nuevo: **+5 XP**, y se guarda en el **diario** (`ACH.objetivo.diario`, sección «DATOS DE BARRANCO», X/30). Los 6 de un mismo sobreviviente: un regalito (1 comida o 2 monedas). Banderas de partida `barranco.datos.<id>`.

### 5.2 Pistas de la cura
Siguen la numeración del diario (mira la última que usa Costa Verde: `cura-4/5/6`) → `cura-7` Lucía, `cura-8` Don Celedonio, `cura-9` Don Jaranón (lo da B5 al final). Todas apuntan a **Chorrillos / Morro Solar**, coherentes con lo que dijeron los parapentistas de Costa Verde (léelo en `js/costaverde/sobrevivientes.js`).

### 5.3 Mini-tarea de Lucía
Un **poeta zombie** le robó su **cuaderno de poemas** («¡ahí están todos mis versos, y algunos son buenos!»). El poeta está marcado (sombrero rojo) por el parque; al matarlo suelta el `cuaderno`; **E con el cuaderno** → gracias, `cura-7`, y regala **2 botellas doradas**.

### 5.4 Don Celedonio y la melodía nueva
- Escondido en un zaguán cerca de la peña. Diálogo con retrato (5–7 láminas): fue guitarrista de Jaranón 30 años; Jaranón «se quedó cantando» cuando llegó la plaga; **le enseña la melodía**: «Él canta, tú respondes. Un golpe a tiempo vale por tres a destiempo».
- Al terminar: `ACH.hab` aprende **LANDÓ DEL CONTRAPUNTO** rango 1 (con el toast «Don Celedonio te enseñó…» que ya existe) y se abre la peña. Mini-práctica opcional: 4 golpes de cajón/guitarra a tiempo contra un muñeco de práctica con el metrónomo visible → +20 XP.

### 5.5 Melodía 6: «LANDÓ DEL CONTRAPUNTO» (ediciones en `habilidades.js` y `melodias.js`)
- `contrapunto: { name: 'LANDÓ DEL CONTRAPUNTO', short: 'LANDÓ', key: 'KeyT', k: 'T', cost: 50, cd: 14, col: '#3ad6ff', t: [6, 8, 10], mul: [1.5, 1.75, 2], tol: [0.12, 0.16, 0.2] }` (comprueba que `T` no choca; si choca, `Y`, y anótalo).
- **Efecto:** durante `t` s aparece un **metrónomo** alrededor de Alexander (anillo celeste que late con `ACH.br.beat()` o, en otras páginas, con un reloj propio de 100 bpm). Cada golpe que conecta **a tiempo** (≤ `tol` s del pulso) hace daño ×`mul`, suelta «¡A TIEMPO!» y devuelve +4 sabor. Contra Don Jaranón, además ensancha la ventana del contrapunto (§6.3).
- **Se aprende solo con Don Celedonio:** en el árbol aparece como sexta melodía con el candado **«TE LA ENSEÑA DON CELEDONIO (BARRANCO)»**; no se le pueden poner puntos antes. Después sube de rango con puntos como las demás. Debe funcionar en **todas las páginas** (persistencia `achorado.habilidades.v1`, sin romper partidas viejas: si falta la clave, rango 0).
- La pantalla del árbol, el HUD de íconos y el abanico táctil (si lee la lista de melodías) deben mostrar 6 melodías sin descuadrarse. **Ediciones pequeñas** en `habilidades.js`; si el táctil necesita cambios en `tactil.js`, **no lo toques** (es de v0.14): anótalo.
- `melodias.js`: melodía original corta (≤1.8 s) con aire de landó (6/8 lento, cajón + guitarra punteada). Sin melodías reales.
- Expón `ACH.hab.onCast(fn)` (fn(id, rank)) si no existe un evento equivalente; el jefe lo usa.

---

## 6. Jefe: Don Jaranón, la Voz de Oro de Barranco (`jaranon.js`, B1b)
Lee `js/costaverde/chef.js` y `js/miraflores/jefa.js` y copia su patrón (barra de jefe, golpes por `onSwing`/`onProjectile`, `dynSolids`, punto de control, `reset`/`onRespawn`, «jefe justo» de V011 §8.1). No va en `G.zombies`.

### 6.1 Quién es
- **Cantante criollo zombie gigante** (~2.3 veces una persona): terno o guayabera criolla blanca con pañuelo, bigote fino, peinado engominado (algo despeinado por la plaga), piel verdosa, ojos con brillo, **micrófono antiguo de pedestal** que usa como bastón. Atrás, en el tabladillo, su **banda zombie**: un **guitarrista** y un **cajonero** (no peleables, salvo §6.3 fase 2).
- **Entrada:** se encienden las luces del tabladillo, aplausos zombies, diálogo con retrato de Alexander (sorpresa → triste → serio):
  - «¿Don Jaranón? ¿La Voz de Oro? Mi abuela lo escuchaba en la radio todos los domingos…»
  - «Y ahora está… así. Perdón, maestro, pero vamos a tener que hacer jarana de la brava.»
  - Jaranón (por nombre, en globo): «¡Silencio en la sala! ¡Que aquí canta la Voz de Oro!» / «¿Un muchacho con guitarra? ¡A ver si me respondes, compadre!»

### 6.2 El compás (lo central)
- Toda la pelea va al **compás** de `ACH.br.beat()` (B3 hace que el tema del jefe dé el pulso; si no hay audio, reloj interno). Abajo al centro, un **metrónomo-cajón** que late en cada pulso, más grande en el 1 del compás.
- Los ataques **salen siempre en un pulso** y se **avisan un pulso antes** (destello en el piso, brillo en el micrófono): quien sigue el ritmo, esquiva.
- **Contrapunto:** cada **4 compases**, Jaranón canta un **«pregón»** (globo con un verso inventado y chalaco). Luego viene **1 compás de «RESPUESTA»** (letrero chicha «¡RESPONDE!» y el anillo del metrónomo se pone celeste): si Alexander **le pega a tiempo** (≤0.12 s del pulso; con el Landó del Contrapunto, su `tol`) o **toca cualquier melodía** durante ese compás, «¡CONTRAPUNTO!»: Jaranón queda **aturdido 2 s y recibe daño ×2**. Si le pega fuera de tiempo, daño normal. Si no responde, Jaranón «se luce» y su siguiente ataque es más grande.
- Accesibilidad: con `ACH.cfg` de dificultad fácil (lo que exista en `dificultad.js`), ventana ×1.5.

### 6.3 La pelea (vida 48; con guitarra al 100 % y 2 comidas se gana en < 3 min, aunque nunca se acierte un contrapunto)
**Fase 1 — vals (3/4, ~100 bpm), 100–60 %:**
- **Notas de vals:** en el 1 de cada compás, 3 notas musicales en abanico (180 px/s, 1 de daño).
- **Pañuelazo:** en el 3, barrido de pañuelo en arco de 120° delante de él (aviso un pulso antes), empuja.

**Fase 2 — festejo (6/8, más rápido), 60–25 %:**
- **Pista de baile:** las losetas de la pista se **iluminan en un patrón** un pulso antes y «queman» en el pulso (1 de daño): hay que bailar entre ellas.
- Llama a **2 parejas de jaraneros** zombies (máximo 4 a la vez).
- El **cajonero** acelera el tempo cada 4 compases (hasta +20 %); **si le pegas al cajonero** (vida 4) se cae de la silla y el tempo vuelve a la normalidad durante la fase.

**Fase 3 — landó (lento y pesado), < 25 %:**
- **Nota sostenida:** cono de sonido de 50° que **barre** lentamente la peña durante 2 compases: hay que **esconderse detrás de mesas y columnas** (`dynSolids`) o rodearlo. 1 de daño por pulso dentro.
- **Zapateo:** pisotón en el 1 del compás, onda de 48 px que empuja.
- Después de cada nota sostenida, **se queda sin aire** 2.5 s («¡Aire, aire, compadre!»): daño ×2.

**Contra Jaranón** valen la guitarra, el puñete, las armas en la mano, el cajón (`cajon`: a tiempo daño ×2), las botellas (`botella`: el charco lo hace **resbalar** y caer 1.5 s, máx. cada 8 s), la pelota y helados de Costa Verde, y las melodías (efectos normales; nada de inmunidades injustas).

### 6.4 Al vencerlo
- No explota: **se sienta en el borde del tabladillo**, el brillo de los ojos se apaga a medias, la banda deja de tocar. Silencio.
- Retrato de Alexander (triste): «Ya, maestro. Ya terminó la función.»
- Suelta 12 monedas, 1 picarones y la **bandera** `barranco.jefe`.
- Dispara el final: `ACH.br.final.play({ onEnd })` (B5) → `onEnd` → cartel (§2.4). El mundo queda congelado mientras corre (mismo mecanismo que Costa Verde con la caída/cinemática; explica cuál usaste).
- Si Alexander muere: reaparece en la **puerta de la peña** con la vida llena; Jaranón vuelve a vida completa (fase 1).
- Debug: `ACH.debug.br.jefe.{start, fase(n), win, state}`.

---

## 7. Aterrizaje en Barranco y mapa (B4)
### 7.1 Costa Verde aterriza en Barranco (`js/costaverde/chorrillos.js`)
- **Misma API y mismo archivo** (`ACH.cv.chorrillos.play/stop/isOn`); agrega el alias `ACH.cv.aterrizaje`. Mismo tempo, misma estructura de planos y misma música heroica (no rehagas lo que funciona), pero **el lugar cambia a Barranco**:
  1. Plano general desde el mar: el acantilado de Barranco con sus **casonas**, la **quebrada verde de la Bajada de Baños**, la silueta del **Puente de los Suspiros** y **La Ermita** arriba, la playa al pie; al fondo, al sur, el **Morro Solar** con su cruz (sigue ahí: es el destino). El sol de **atardecer** rompe la panza de burro.
  2. Plano medio: baja planeando sobre la orilla de piedras, los restaurantes de playa y el puente peatonal del Circuito de Playas (no los botes de pescadores de Chorrillos).
  3. Contrapicado del aterrizaje en el **canto rodado** (la Playa Barranco es de piedras: nube de polvo y piedritas en vez de arena).
  4. Pose heroica cómica (igual que ahora), con las casonas y faroles de Barranco detrás.
- **Diálogo:** «¡Barranco, causa! ¡Aterricé como un campeón!» (feliz) / «Ya estoy cada vez más cerca de la ubicación de la cura de esta enfermedad.» (serio, es la frase del dueño: no cambiarla) / «¡Aguanta, Lima, que ya llego!» (risa) / Titina «¡Gurú-gurú!».
- Nueva clave `'achorado.cine.aterrizaje.v2'` (la primera vez del nuevo aterrizaje no se salta). Investigación reutilizable: `../diseno/investigacion-chorrillos.md` (Morro Solar) y `../diseno/investigacion-barranco.md`.
- Actualiza `preview-chorrillos.html` para verla.

### 7.2 Final de Costa Verde (`js/costaverde/nivel.js`, solo esto)
- Cartel: **«¡ATERRIZASTE EN BARRANCO!»**.
- ENTER: `setDone('costaverde')` y luego **`ACH.viaje.go('barranco', carry)`** (directo al nivel, con la mochila). Si la página `barranco` no existe en `ACH.viaje.PAGES`, vuelve al mapa como hoy.

### 7.3 Viaje y mapa (`js/engine/viaje.js`, `js/cine/cima.js`: ediciones mínimas)
- `viaje.js`: `PAGES.barranco = 'barranco.html'`, `NAMES.barranco = 'Barranco'`; lo que haga falta para que `here()`, `progress()` y `setDone('barranco')` funcionen igual que con Costa Verde.
- `cima.js`: `NIVELES.barranco = ['barranco']`; `TRAS = { costaverde: ['barranco'], barranco: ['chorrillos'] }` (Chorrillos se abre recién al ganar Barranco; queda «Próximamente»); ganar Barranco lo marca visitado; escoger Barranco en el mapa → `barranco.html`. Revisa `derive()` para el progreso por `#hash`. No cambies nada más del mapa.
- Verifica la ruta: Costa Verde (`?cv=chorrillos`) → aterrizaje → cartel → ENTER → `barranco.html` llega con la mochila; y mapa → Barranco.

---

## 8. Cinemática final «La última jarana» (`final.js`, B5)
Mismo enfoque que `js/cine/cima.js` y `js/costaverde/chorrillos.js` (léelos): lienzo 960×540 encima del juego, arte más grande y detallado, el Alexander claro estilo Stardew de esas cinemáticas.
```
ACH.br.final = { play({ onEnd }), stop(), isOn() }
```
- **Duración** 18–24 s, de noche:
  1. La peña casi a oscuras, un solo foco: Don Jaranón sentado en el borde del tabladillo, más pequeño y cansado; las mesas volteadas.
  2. Alexander se sienta a su lado con la guitarra; Titina se posa en el cajón. Empiezan a tocar **juntos**, bajito (vals original lento: guitarra de Alexander + la voz tarareada de Jaranón sintetizada como un «mmm» suave, sin letra).
  3. Los zombies del público dejan de gruñir y **se mecen** al compás. Por la ventana, a lo lejos, la **cruz del Morro Solar** iluminada.
  4. Jaranón mira la ventana y señala.
- **Diálogo con retrato** (Alexander con retrato; Jaranón por nombre), sin saltar la primera vez:
  - Jaranón: «Hace días pasaron por aquí unos de bata blanca, con neveras. Cantaban bajito pa' que no los oyéramos.»
  - Jaranón: «Iban para el Morro Solar, muchacho. Allá arriba, en Chorrillos.»
  - Alexander (triste): «Mi abuela lo quería un montón, maestro. Gracias por la última jarana.»
  - Jaranón: «Anda, y cántales a todos. Que esta ciudad no se muera callada.»
  - Alexander (serio → risa): «Chorrillos, ¡allá voy!»
- Al terminar: `ACH.objetivo.diario('cura-9', …)` con la pista, `localStorage 'achorado.cine.barranco.v1'` (ya vista → ESC/ENTER la saltan), y `onEnd`.
- Música: el vals lento dentro de `final.js` o como `br.final` de `criolla.js` (coordina por API: si existe `ACH.audio.br.play('final')`, úsala; si no, la tuya). Original.
- Página de prueba `preview-br-final.html` (tuya).

---

## 9. Música, sonidos y frases (B3)
- **`criolla.js`:** reemplaza a `surf.js` con la **MISMA API pública** que `musica.js`/`rock.js`/`surf.js` (léelos; moods `explore`, `chase`, `horde`) y además:
  - **Reloj de compás:** `ACH.audio.br.beat()` con la forma de §1 (`bpm`, `meter`, `beat`, `phase`, `bar`, `beatInBar`, `toNext`, `src:'audio'`), sacado del mismo programador de notas (`ctx.currentTime`), exacto.
  - `ACH.audio.br.play(id)` / `stop()`; ids: `explore` por zona, `jefe1` (vals ~100 bpm, 3/4), `jefe2` (festejo 6/8, tempo variable: `setTempoMul(m)` para el cajonero), `jefe3` (landó), `final` (vals lento), `deseo` (jingle corto).
  - **Exploración:** playa al atardecer = vals criollo suave con guitarra y bordones, olas; bajada/parque = vals con contracanto y algo de festejo suave; calles bohemias de noche = ruido de peña lejana mezclado (aplausos, cajón, risas); persecución = festejo rápido con cajón, quijada y palmas; horda = landó oscuro y pesado.
  - Todo **original** con Web Audio (guitarra Karplus-Strong o como lo haga `sfx.js`/`melodias.js`, cajón sintetizado: grave + slap), sin samples ni melodías reconocibles.
- **`sfx-br.js`** (copia el patrón de `sfx-cv.js`): olas y gaviotas; escalones; golpe y onda del cajón (normal y «a tiempo»); botella lanzada, vidrios, charco, resbalón y caída; letras del poeta (murmullo), brochazo; notas del músico zombie; pareja: suspiro, beso tronado, grito de despechado; zapateo; aplausos y «¡eso!» de peña; notas del jefe, pañuelo, losetas que queman, nota sostenida, «sin aire»; chispas del deseo; campanita del metrónomo («¡A TIEMPO!», «¡CONTRAPUNTO!»).
- **`voces-br.js`** (como `voces-cv.js`): poeta «¡Oh, luna de Barranco!», «¡Escucha mis versos!»; pintor «¡No te muevas, que te pinto!»; músico «¡Una monedita pa'l artista!»; pareja «¡Mi amor!», despechado «¡¿Por quéee?!»; jaranero «¡Jarana, jarana!»; Jaranón: las de §6.1, «¡Responde, compadre!», «¡Aire, aire!», «¡Eso es jarana!».

---

## 10. Claves de sprites (contrato entre arte y motor)
Todo bajo `ACH.sprites.br`. Cada sprite con `ax`/`ay`; cada prop con `ax`/`ay`/`fw`/`fh` (`tall`, `.broken`, `lamp` como en Costa Verde). Sin el arte, el motor dibuja un bloque provisorio con el nombre. **Versión de noche:** los props con ventanas o letreros que se encienden exponen `.noche` (variante horneada) y/o `lights[]` (puntos de luz para el motor). Si cambias o agregas claves, documéntalas en tu nota.

### 10.1 `ACH.sprites.br.lugar` (B2a)
- **tiles** (16×16, arreglos de variantes): `arena[n]`, `canto[n]` (canto rodado), `orilla[n]` (espuma; o animada dentro de `mar`), `adoquin[n]`, `escalon[n]`, `tierraQuebrada[n]`, `pasto[n]`, `vereda[n]`, `pista[n]`, `losetaParque[n]`, `tablasPuente[n]`, `pisoErmita[n]`.
- **fondos horneados:** `mar = { draw(ctx, camX, camY, t, W) }` (banda de mar animada al atardecer/noche) y `morro = { draw(...) }` (Morro Solar con la cruz al fondo, se prende la cruz de noche).
- **props:** `torreSalvavidas`, `sombrillaPlaya` (se rompe), `restoPlaya[2]`, `puentePeatonal` (sobre el Circuito de Playas), `autoAbandonado[2]`, `parapenteTirado` (rosado y amarillo), `farolBR` (lamp), `bancaBR`, `basureroBR`, `buganvilia[3]` (sobre muro), `muroBajada[n]`, `palmeraBR[2]`, `ficusBR[2]`, `casitaBajada[3]`, `puente = { piso, baranda, sombra, pilar }` (el piso del puente va en la capa `air` cuando se pasa por debajo), `ermita` (grande, en ruinas), `barandaMirador`, `fuenteParque`, `estatuaCantora` (si la investigación la ubica en el recorrido), `kioscoParque`, `carritoAnticuchos`, `pergola` (si existe), `cajaCervezas` (se rompe, suelta botellas), `munecoPractica`.
- **lotes:** `ACH.sprites.lotArch.br_biblioteca`, `br_iglesia` (formato de lote de `render.js`, como Costa Verde).

### 10.2 `ACH.sprites.br.casona` (B2b)
- **lotes:** `ACH.sprites.lotArch.br_casona1..6` (pastel descascarado, balcones de madera, rejas, puertas altas; versión `.noche` con ventanas encendidas).
- **`fachada(brand, wTiles) → { cv, ax, ay, lights, noche }`** como la de Costa Verde (`ACH.sprites.cv.larco.fachada`): bares, peñas y restaurantes **reales** de la investigación con su parodia (lee `ACH.cfg.marcasReales` y rehornea con `ACH.px.onMarcas`). Inventadas fijas: `ultimaJarana` «PEÑA LA ÚLTIMA JARANA» (portón grande, guirnaldas de focos), `barLucho` (la casona de Lucho, nombre según investigación o inventado), `zaguanCeledonio`.
- **interior de la peña** (arena del jefe): tiles `pisoPena[n]`, `pistaBaile[n]` (con variante encendida `pistaBaileOn[n]` para el ataque), `tabladillo[n]`; props `mesaPena` (se rompe y sirve de cobertura), `sillaPena`, `barraPena`, `columnaPena`, `focoPena` (lamp), `cortinaEscenario`, `guirnalda`, `cuadroCriollo[3]` (cuadros genéricos de músicos en la pared, sin caras reales).

### 10.3 `ACH.sprites.br.pj` (B2c)
- **Jefe:** `jaranon = { idle[2], canta[3], pregon[2], notas[2], panuelo[3], zapateo[3], sostenida[2], sinAire[2], aturdido[2], hurt, sentado }`, ~2.3 veces una persona, de frente (el motor lo voltea). `nota[3]` (proyectiles), `onda` (anillo), `conoSostenida` (horneado, se rota/estira).
- **Banda:** `guitarristaZ = { toca[4] }`, `cajoneroZ = { toca[4], cae }`.
- **Zombies** (formato `ACH.zvar`): `br_poeta`, `br_poetaRojo` (el del cuaderno), `br_pintor` (+ `caballete` prop y `brochazo`, `mancha`), `br_musico_zampona`, `br_musico_guitarra`, `br_musico_cajon`, `br_novio`, `br_novia` (con pose de **ir de la mano**: `mano` frames, y variantes `.despechado` con lágrimas), `br_jaranero` (pañuelo, zapateo). `letra[4]` (letras flotantes del poeta).
- **Sobrevivientes:** `npc.tomas`, `npc.rosa`, `npc.lucia`, `npc.lucho`, `npc.celedonio`, cada uno `{ idle[4], habla[2] }`.
- **Objetos** (ícono + `.big`, formato de `inflables.js`): `cajon`, `botella`, `botellaDorada`, `packBotellas`, `anticucho`, `picarones`, `pescadoFrito`, `emoliente`, `chichaMorada` (si no existe), `cuaderno`. `charco` (prop de piso), `vidrios[3]`.
- **Alexander:** `alex.cajon = { carga: {dir:[4]}, golpe[3] }` (carga el cajón; golpe = se sienta un instante y lo golpea), con el mismo nombre de direcciones que en `sprites.js`. Para lanzar la botella, la pose de lanzar que ya exista.

---

## 11. Fases
| Fase | Trabajo | Modelo | Cuándo |
|---|---|---|---|
| R | Investigación (`../diseno/investigacion-barranco.md`) | Sonnet high | primero (hecha antes de lanzar las demás) |
| B1a | Página, build, nivel, mapa, hora, zombies, puente, puntos de control, debug, final | Opus medium | en paralelo |
| B1b | Don Jaranón y la peña | Opus medium | en paralelo |
| B1c | Cajón, botellas, comidas, vendedores, sobrevivientes con datos, maestro, melodía 6 | Opus medium | en paralelo |
| B2a / B2b / B2c | Arte de lugares, casonas y personajes | Sonnet high | en paralelo |
| B3 | Música criolla con reloj, sonidos y frases | Sonnet high | en paralelo |
| B4 | Aterrizaje en Barranco + viaje y mapa | Sonnet high | en paralelo |
| B5 | Cinemática «La última jarana» | Sonnet high | en paralelo |
| Q | Integración y QA: ruta completa Costa Verde → Barranco → mapa, peleas, datos, melodía en otras páginas, rendimiento, capturas | Sonnet high | después |

**Hecho cuando:**
1. `sh build-barranco.sh` genera `dist/barranco.html`, que abre sin errores en la consola.
2. Costa Verde termina con la cinemática en Barranco y ENTER lleva a `barranco.html` con la mochila.
3. Se juega de la playa a la peña pasando por la Bajada (bajo el puente), el Puente, La Ermita, el Parque y las calles bohemias, con el atardecer que se vuelve noche.
4. Los 5 sobrevivientes cuentan sus 6 datos reales cada uno, se guardan en el diario, y las tiendas funcionan.
5. Don Celedonio enseña el Landó del Contrapunto; funciona en Barranco y en las otras páginas, y el árbol muestra 6 melodías.
6. Funcionan el cajón y las botellas; se puede ganar a Don Jaranón (con y sin contrapuntos); se ve la cinemática final y el mapa abre Chorrillos («Próximamente»).
7. `index.html`, `miraflores.html` y `costaverde.html` siguen funcionando (salvo el cambio pedido del aterrizaje).
