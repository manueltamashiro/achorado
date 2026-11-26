# Costa Verde: fase C1a (página, nivel, mapa, zombies, debug)

C1a es el único escritor de:
- `juego/costaverde.html`
- `juego/build-costaverde.sh`
- `juego/js/costaverde/nivel.js`
- `juego/js/costaverde/mundo.js`
- `juego/js/costaverde/zombis.js`

No se editó nada del motor, de Miraflores, de base, de sprites ni de audio.

Los marcadores vacíos de una línea `caida.js`, `chef.js`, `sfx-cv.js`, `surf.js` y `voces-cv.js` se crearon solo porque no existían. Hoy los dueños ya los llenaron.

**Probado** con `sh build-costaverde.sh` en el puerto 8711, sin errores ni avisos en la consola:
- `routeCheck().ok` y `spawnCheck() = []`.
- Se probaron con teletransporte y captura todos los lugares.
- Se probó:
  - la reja del chifa;
  - el punto de control al morir;
  - la llegada por `viaje`, que trae la vida;
  - la pareja que se separa;
  - el parapentista que cae;
  - `finish` con el cartel y las filas de perritos y helados;
  - `winGo` lleva al título;
  - `?cv=caida` encadena el salto de C1b y la caída de C4.

`dist/miraflores.html` y `dist/achorado.html` los reconstruyeron otras sesiones durante la prueba. `build-costaverde.sh` solo escribe `dist/costaverde.html`.

## Página
`costaverde.html` es una copia de `miraflores.html` con estos cambios:
- Título «ACHORADO · Costa Verde».
- Kicker «MALECÓN · COSTA VERDE».
- `lvl` «Nivel: Miraflores 2, el malecón».
- `winTitle` «¡ATERRIZASTE EN CHORRILLOS!».
- Dos filas nuevas: `winDogsRow`/`winDogs` («Perritos azuzados») y `winIceRow`/`winIce` («Helados lanzados»).

Los scripts van en el orden de §1.2:
- Primero `costaverde/nivel.js`.
- Arte CV después del arte de Miraflores.
- `surf.js` en lugar de `rock.js`.
- `sfx-cv` y `voces-cv` después de `voces-mira`.
- `costaverde/mundo.js`.
- Después de `hud.js`: `inflables`, `zombis`, `juguetes`, `chef`, `caida` y `chorrillos`.
- Se sacaron `trabajadores`, `jefa`, `cargables` y `rock`.

## API de `ACH.cv` (`=== ACH.mira`, el mismo objeto)

### Registro y utilidades
- `register(sys)` y `systems[]`. Un sistema puede tener `name`, `reset`, `onRespawn`, `update(G,dt)`, `mood`, `drawables(G,out)`, `drawTop(g,G,cx,cy)`, `onSwing(G,sw)`, `onProjectile` y `speedMul(G)`.
- Utilidades: `sfx(name,data)`, `toast(t)`, `say(id|texto,o,fallback)`, `brandName(id)`, `brandColors(id)`, `mk(w,h)`, `prov(...)`, `label(...)`, `safe(o,fn,...)`.
- Constantes y estado: `U = 10` (1 de daño del contrato), `stats {perros, helados, goles}` (compartido con C1c).

### `freeze(on)` / `frozen()`
- **Mecanismo:** usa el estado `'cine'` que ya existe en `game.js`. Ahí `update` no corre (ni mundo ni teclas), `render` sigue y la auto-pausa lo ignora.
- `freeze(true)`:
  - guarda el estado anterior (`playing` o `intro`; si era `dead`, guarda `playing`);
  - pone `G.state = 'cine'`;
  - llama `hud.setState('cine')` e `input.reset()`.
- `freeze(false)`:
  - vuelve al estado guardado y pone `hitstop = 0`;
  - llama `hud.setState`.
- Mientras está congelado, los sistemas propios (caída, Chorrillos) dibujan en su propia capa o lienzo.
- **Ojo:** congelado no se puede pausar.

### `talk(lines, onDone)`
Congela, corre `ACH.dialogo.play` y descongela. Para diálogos en mitad del juego.

### `finish(stats)`
- Junta las estadísticas, descongela y fuerza `playing`.
- Llama `ACH.debug.win()`, que pasa por `doWin` → `nivel.onWin` → `hud.showWin` (envuelto con el título y el texto «ENTER para jugar de nuevo» de `ACH.nivel.win`, y llena las filas de perritos y helados).
- `onWin` llama `viaje.setDone('costaverde')`.
- Respaldo: `W._forceExit`.

### `runFinale('caida' | 'chorrillos')`
- Congela y llama `caida.start({onWin, onLose})`. Si gana: `chorrillos.play({onEnd})` y luego `finish()`.
- Si pierde: descongela, punto de control `borde`, vida llena y teletransporte al borde.
- Si falta C4 o C5, se salta ese paso.

### Puntos de control
- `setCheckpoint(name)` / `checkpoint()`. Cambia `W.start` en el mismo objeto; `game.respawn` lo usa.
- Solo suben, nunca bajan: `faro` → `amor` (col 104) → `salazar` (col 250) → `arena` (al abrirse la reja) → `borde` (se pone desde fuera).
- Cada uno avisa con el toast «Punto de control: …».

### Llegada
- Un `DOMContentLoaded` propio (carga antes que `game.js`) toma el `viaje` solo si `to === 'costaverde'`: primero el hash, después localStorage, y que tenga menos de 10 minutos.
- Luego hace `ACH.game.arrive(carry)`.
- `viaje.here()` devuelve `'main'` en esta página, así que `game.js` no lo consume.

### Teclas e intro
- Título: ENTER llama `startIntro(levelId())` sin volver a hornear el mundo. Se comen las teclas 2 y 3.
- `ACH.levels.gambetta` y `ACH.levels.costaverde` construyen `ACH.world`, para que «jugar de nuevo» funcione.
- La intro es el diálogo con retrato (4 líneas).

## `ACH.world` (`mundo.js`)

### Forma
- La misma de Miraflores, con `id: 'costaverde'`.
- Claves de §2: `terr`, `stairs`, `checkpoints`, `heladeroPath`, `dogZones`, `vista`, `quebrada`, `larco`, `tramos`, `vendorSpots`, `goals`, `ballSpots`, `shops`, `dynSolids`, `vendors: []` y `camUp`.
- Funciones: `terraceAt`, `isStairs`, `tramoAt`, `inLarco`, `respawnOk`, `progress`, `routeCheck`, `bakeExtra`.

### Mapa
300 × 86 tiles de 16 px. Las filas, de arriba abajo:

| Filas | Qué hay |
|---|---|
| 0–9 | Lotes |
| 10–11 | Vereda |
| 12–17 | Pista |
| 18 | Sardinel |
| 19–20 | Ciclovía |
| 21–32 | Parque |
| 33 | Parapeto |
| 34 en adelante | Vista (sólida) |

### Quebrada de Balta
- Columnas 150–172, sólida.
- Se cruza solo por los puentes: Villena (filas 12–17, la pista) y uno peatonal (filas 25–28).

### Larcomar (columnas 254–299)

| Terraza | Filas |
|---|---|
| A | 38–43 |
| B | 49–54 |
| C | 60–65 |
| D, la Arena | 73–79 |

- Las escaleras (`'S'`) cambian la velocidad: ×1.25 al bajar, ×0.8 al subir.
- Reja del chifa:
  - es un `dynSolid` en las columnas 258–260, fila 66, entre C y D;
  - se abre al acercarse, salvo que `CV.gate.hold`;
  - API `CV.gate.{open, close, isOpen}`.

### Lugares (`W.places`, en px)

| Lugar | x, y |
|---|---|
| faro | 136, 424 |
| parapuerto | 768, 440 |
| deporte | 1216, 416 |
| losa | 1440, 440 |
| amor | 1728, 440 |
| beso | 2000, 474 |
| puente | 2576, 429 |
| puenteVillena | 2576, 232 |
| intihuatana | 2960, 440 |
| letonia | 3712, 467 |
| salazar | 4160, 456 |
| ingreso | 4280, 512 |
| larcoA | 4416, 650 |
| larcoB | 4416, 826 |
| larcoC | 4464, 1002 |
| rejaChifa | 4152, 1034 |
| arena | 4416, 1232 |
| borde | 4704, 1258 |

### Cámara
- `W.camUp` se recalcula en cada cuadro.
- En los parques, la cámara baja hasta mostrar la vista hasta la fila 41.
- En Larcomar, se centra en la terraza.

### Arte
- Tiles de CV con alias `tiles.cv_<nombre>`; props con alias `props.cv_<nombre>`. Si falta el arte, va un bloque provisorio con el nombre.
- Las fachadas son lotes con `arch: 'cv_fachada'` → `larco.fachada(marca, ancho)`.
- El letrero LARCOMAR (184 px) se dibuja a la mitad para que entre en el hueco de 6 tiles.

## Zombies (`zombis.js`)

### Tipos y comportamiento
- Los tipos se agregan en tiempo de ejecución a `ACH.ent.ZT`, con `ACH.zbeh[tipo]`. Los 7 de §3:
  - **corredor:** trota por su fila y frena al chocar.
  - **pareja:** con la mitad de la vida se separa en 2 caminantes.
  - **turista:** flash de selfie que avisa a los zombies a 120 px.
  - **surfista:** golpe de 140° que empuja.
  - **parapentista:** sombra de 1.2 s antes de caer, 1 de daño si cae encima, deja el parapente tirado (se rompe y suelta sencillo). Solo en las columnas 30–70 y 100–150, uno cada 15 s o más.
  - **trabajador:** con la skin `cv_trab_<marca>`, atado a la puerta de su local.
  - **seguridad:** vida 5, empuja fuerte.
- Si C2c no trae la skin, se usa una de color horneada.

### Cantidad
- 48 al empezar: 14 caminantes, 6 corredores, 3 parejas, 5 turistas, 4 surfistas, 12 trabajadores y 4 de seguridad.
- `CFG.respawnBelow = 16`.

### API
- `ACH.cv.zSpawns()`
- `ACH.cv.zombis.{state(), drop(x,y), crew()}`

## Debug: `ACH.debug.cv`
- `tp(lugar)`
- `skip('chef' | 'caida' | 'chorrillos')`
- `god(bool)`
- `give(id,n)`
- `routeCheck()`
- `spawnCheck()`
- `state()`
- `finish(stats)`
- `freeze(bool)`
- URL: `?cv=<lugar> | chef | caida | chorrillos`

## Problemas abiertos
- **C2a:** `vista.draw` y `quebradaBalta.draw` llevan dentro un alto de pantalla fijo de 270, pero la vista es de 400×300.
  - La vista ahora se dibuja en dos pasadas.
  - La quebrada se hornea con el lienzo trasladado (`draw(g, x0, y0, 0, 480)`).
  - Sus filas 34–45 se pintan en cada cuadro encima de la vista.
  - Las filas 0–18 de la quebrada quedan con el respaldo provisorio de C1a.
  - Mejor sería que C2a lea el alto real de la vista.
- **Mapa:** debajo de la fila 80 (Larcomar), la vista se acaba: el arte llega solo hasta y = 1280 y debajo queda una banda lisa.
- **Pausa:** congelado (`'cine'`) no se puede pausar. Con el panel del navegador oculto, la auto-pausa por `blur` salta enseguida; para probar, en la consola se quitó el oyente de `blur` y se falseó `document.hidden`.
- **Pendiente:**
  - Las parejas sentadas de decoración no están hechas.
  - Cambiar las marcas en caliente (rehornear) no está cubierto.
  - Hacer clic en el título rehornea una vez.
