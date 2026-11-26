# QA + integración de Costa Verde (fase Q)

Página probada: `juego/dist/costaverde.html` (4,27 MB), servida en el puerto 8720 (ya apagado). Capturas en `diseno/qa-cv/`.

**Método.** El panel del navegador estaba oculto y sin foco. Con eso el rAF nativo casi no corre (1–4 fps) y la auto-pausa salta con `blur`.
Para probar sin tocar el código fuente, solo desde la consola de la página:
- se anularon `blur` y `visibilitychange`;
- se puso un rAF de reemplazo con un Worker a 60 Hz;
- se avanzó el juego con `ACH.game.step(n)` (síncrono) con teclas simuladas por eventos.

Las capturas son `canvas.toDataURL` de `#world` (400×300 en este panel), guardadas por un servidorcito Ruby que vive fuera de `juego/`.

## Resumen

| # | Chequeo | Resultado |
|---|---|---|
| 1 | Carga sin errores ni avisos; orden de scripts; sin bloques provisorios | **PASS** |
| 2 | Ruta y hitos en orden real; mar abajo; Beso, mosaicos, faro, quebrada solo por puentes; terrazas con marcas reales y parodia | **PASS** |
| 3 | Los 7 zombies nuevos aparecen donde toca y se portan | **PASS** |
| 4 | Pelota, barra, helado y heladero, perritos y 5 vendedores | **PASS** (1 bug arreglado) |
| 5 | Escaleras, cámara por terraza, puntos de control | **PASS** (1 bug arreglado) |
| 6 | Pelea con el chef completa, 3 fases, muerte y reinicio | **PASS** (duración y dificultad razonables; sin tocar chef.js) |
| 7 | Muerte del chef → borde → caída → Chorrillos → cartel → mapa | **PASS** |
| 8 | Audio: música por zona, tema del chef, de la caída y heroico; sfx | **PASS** |
| 9 | Rendimiento y lienzos | **PASS** (60 fps de sobra; ver cifras) |
| 10 | `dist/miraflores.html` y `dist/achorado.html` siguen cargando limpios | **PASS** |
| 11 | Capturas de cada zona, jefe, caída y cinemática | **PASS** (57 PNG) |
| extra (a) | ENTER o toque en el cartel de Costa Verde viaja al mapa | **PASS**, implementado |
| extra (b) | Traspaso Miraflores → Costa Verde y Costa Verde → mapa | **PASS** |

## Detalle por chequeo

### 1. Carga
- Consola limpia al cargar, tras ENTER del título y tras todo el diálogo de la intro (retrato, 4 líneas).
- `window.onerror` y `unhandledrejection` capturados: 0 en toda la sesión de pruebas.
- La lista de scripts de `costaverde.html` es la de `miraflores.html` (diff hecho) con los cambios del contrato. Va en el orden de §1.2, con `habilidades` y `melodias` en su misma posición.
- Se verificaron las claves de sprites del contrato §10 (`malecon`, `larco`, `pj`, lotes `cv_*`, skins `cv_trab_*` de las 23 marcas): 0 faltantes.
- Se recorrió todo `ACH.world.tiles`, `props`, `ACH.sprites.cv` y `lotArch` buscando `.prov === true`: 0 sprites provisorios.
- Al empezar sale un diálogo de «Oe… la guitarra suena distinto desde que empezó todo esto». Es el despertar de la guitarra de `habilidades.js` (otra sesión), no de este nivel. Ya lo había anotado C1b.

### 2. Ruta
- `routeCheck().ok` es true (1328 pasos, 5312 px; pasa por todos los hitos) y `spawnCheck()` devuelve `[]`.
- Se visitó cada lugar con `tp`. Las capturas `01`–`18` confirman:
  - faro con 2 franjas blancas;
  - parapuerto con mangas de viento y parapentes pasando;
  - gimnasio y losa con arcos y pelotas;
  - Parque del Amor con El Beso sobre su pedestal, bancas-muro de mosaico con las frases y el sol;
  - puentes sobre la quebrada del Club Tennis Las Terrazas;
  - Intihuatana con sus huecos y perros;
  - tótem de espejo sobre adoquín amarillo;
  - Salazar con la fuente, la chimenea de vidrio y las fachadas de Larcomar asomando abajo;
  - terrazas A, B y C con letrero LARCOMAR y fachadas reales (NIKE, MANGOS, ASIAN, POPULAR, LA BONBONNIERE, CINÉPOLIS, H&M, MINISO, ADIDAS, FREDDO, SALAZAR FOOD & DRINKS, HÄAGEN-DAZS, MASTER KONG, FUENTE DE SODA);
  - arena con el CHIFA GRAN DRAGÓN, la caseta «PARAPENTE TANDEM» y el mar en el borde.
- Interruptor de marcas: `ACH.debug.marcas(false)` re-hornea. Salen MANGAZOS, POPULACHO, LA BOMBONERA, H&N, MINIZO, ADIDA, FREDO, HÄGEN-DAZE y MASTER KUNG (capturas `50`–`54`). `brandName('nike')` pasa de NIKE a NAIK. 0 errores al volver a `true`.
- La quebrada se probó caminando con teclas: las filas 20 y 31 chocan en la columna 149,7. Las filas 14 (Villena) y 26 (puente peatonal) cruzan hasta la columna ~189.
- Observación de diseño (no es un bug): al aparecer en el faro y en el Beso, la cámara baja para mostrar el mar. Desde el punto de tp se ve cortada la parte alta del faro y de El Beso. Caminando hacia el norte la cámara sube y se ven enteros (capturas `01-faro` y `06-beso`, tomadas con Alexander en filas 22–23).

### 3. Zombies
La distribución real a las 0:00 es:
- 14 caminantes;
- 6 corredores;
- 3 parejas en las columnas 110, 134 y 141 (Parque del Amor);
- 5 turistas en las columnas 124–268;
- 4 surfistas (2 en Amor, 2 en Letonia);
- 12 trabajadores (terrazas A–C);
- 4 de seguridad (B y C).

Comportamiento probado:
- **Corredor:** trota por su fila.
- **Pareja:** con 2,2 de daño se separa en 2 caminantes (3→2 parejas, 14→16 caminantes).
- **Turista:** dispara `cv.selfie` y pasa a perseguir.
- **Surfista:** golpe ancho, 40 de vida perdida en un contacto y empujón de ~500.
- **Parapentista:** `zombis.drop()` crea la caída y deja el parapente tirado (`parapentes: 1`).
- **Trabajadores y seguridad:** con skins por marca, visibles en las capturas de Larcomar.

### 4. Armas y NPCs
- **Pelota:**
  - 3 sueltas en la losa;
  - el toque da 240 px/s y la carga 380 px/s;
  - rebota contra un zombie con `bounces=1`;
  - E la recoge (`pelota` en mochila);
  - gol al arco: `stats.goles=1`, `cv.gol`.
- **Barra:**
  - golpe de 0,8 de daño y la durabilidad baja de 60 a 59;
  - F la tira y queda de señuelo;
  - de noche echa un halo verde (`20-barra-noche.png`).
- **Heladero y helado:**
  - pasa por `heladeroPath`;
  - E abre «TRICICLO D'ONOFRIO» con helado y paleta; comprar descuenta 1 sencillo;
  - el helado tirado hace 0,5 de daño y congela 3 s;
  - ESPACIO se lo come;
  - el charco queda de señuelo (ver el bug 3 de abajo).
- **Perritos:**
  - 6 perros en los parques;
  - E → patadita → mordida de 3 s → huida;
  - el perro vuelve a su zona a los 30 s;
  - `stats.perros` sube.
- **Vendedores:**
  - Don Fosfo (barraFosfo 2, pack 5, pelota 4, cuerdas 2);
  - Kiosco Larcomar (pelota 4, barra 2, uhu 6, gaseosa 2, cuerdas 2);
  - Deportes Malecón (pelota 3, pelota de cuero 8, canilleras 6);
  - Fuente de soda (chaufa 5, wantán 3, chicha 2, helado 1);
  - heladero.
  - Todos abren con E y venden. Sin plata sale «Aquí es precio Larcomar, joven.».

### 5. Escaleras, cámara y puntos de control
- Escalera: 50 px bajando, 32 subiendo y ~40 en plano. Son ×1,25 y ×0,8, como pide el contrato.
- La cámara se centra por terraza: `cam.y` = 488, 664, 840 y 1040 en A, B, C y D.
- Morir en el parapuerto → vuelve al Parque del Amor (1728, 440) con la vida llena.
- Morir en Salazar → vuelve a Salazar.
- Morir en la pelea → vuelve a la entrada de la arena con el chef reiniciado (`cocina`, 40 de vida, 0 dumplings, reja abierta, sin música).

### 6. Jefe 1: pelea completa en la arena real
Secuencia verificada:
- la reja se abre al acercarse;
- la reja se cierra al entrar;
- `cv.gong` suena;
- el chef sale de la puerta y el globo dice «Mesa cuatro»;
- diálogo con retrato;
- segundo globo;
- empieza la pelea con la música `chef`;
- se alcanzan las fases 1 y 2, y las ondas de wok y la barra del jefe se leen bien;
- hasta 6 dumplings a la vez.

Muerte del chef:
- cae de espaldas;
- el wok rueda en el piso;
- línea de Alexander con retrato;
- se abre «¡AL BORDE!» con la caseta TANDEM.

**Duración y dificultad.** Se usó un bot que solo golpea y se acerca (sin esquivar bien). Con `god` activado mata al chef en **55,8 s de pelea**, con 197 golpes dados. Eso es un piso: un jugador real que se aleja de los abanicos y del wok suma más tiempo. Estimación para un jugador normal: 70–110 s, dentro del rango que se buscaba (60–120 s).

Sin `god`, el mismo bot muere en 32–60 s, con el chef en 11–20 de 40. El daño recibido es casi todo de dumplings (120–190 de 140–280). Eso es esperable: el bot se queda en medio de las mordidas. Conclusión: no es demasiado fácil. No se tocó `chef.js`.
Observación: si el dueño la siente dura, el ajuste cómodo es bajar `K.biteDmg`, `K.biteCD` o `K.summonN` en `ACH.cv.chefK`.

El tiempo con guitarra y 2 comidas de verdad no se pudo medir con una persona. El bot no sabe esquivar palitos.

### 7. Final: chef → caída → Chorrillos → cartel
- E en el borde abre el diálogo (serio → risa), corre y salta.
- **Caída C4 dentro de la página real:**
  - `.cvc-root` sobre `#stage`;
  - `G.state = 'cine'` (congelado) y `frozen() = true`;
  - música `caida`;
  - tablas, flechas, 3 fases, furia a 30 m y victoria del bot sin errores;
  - la vida se leyó como 10 corazones y se escribió de vuelta (60 → 100);
  - frame de la caída: 0,12–0,21 ms de media (máx. 1,2 ms).
- **Perder la caída** (`debug.hp(0)`): Alexander vuelve al borde (4704, 1242) con 100 de vida. El chef sigue `muerto` y `edgeOpen`. El punto de control queda en `borde`; se quitó el DOM (`roots = 0`) y se restauró el panel táctil. Un segundo E salta sin diálogo.
- **Cinemática de Chorrillos:**
  - música `heroe`;
  - diálogo con retrato con las 4 líneas, incluida literalmente «Ya estoy cada vez más cerca de la ubicación de la cura de esta enfermedad.»;
  - cartel «¡ATERRIZASTE EN CHORRILLOS!» con TIEMPO 6:13, FANS TUMBADOS, MUERTES, PERRITOS AZUZADOS y HELADOS LANZADOS.
- La primera vez no se puede saltar (`skippable: false`, Esc y Enter ignorados). Con `achorado.cine.chorrillos.v1 = '1'` ya se salta con Esc o Enter.
- `?cv=caida` y `?cv=chorrillos` en la URL arrancan directo.
- ENTER en el cartel viaja a `index.html` y abre el mapa de Lima (`cima.active() = true`, progreso `{costaverde: true}`).
- Lo que no se pudo ver: el Barranco y Chorrillos del mapa siguen bloqueados. Es la parte que el arquitecto conecta (§2.6.6).

### 8. Audio
- Música por zona: `ACH.audio.cv.info().zone` da `malecon` en faro, Salazar y Amor, y `larcomar` en A (suciedad 0,14), C (0,81) y arena (1,0).
- Tema `chef` en la pelea, `caida` en la caída y `heroe` en la cinemática (`cv.playing()` lo confirma). Los tres se apagan al terminar (`playing() = null`).
- Se buscaron en el código todos los literales `cv.*` y los sfx genéricos que llama (`checkpoint`, `grab`, `item.eat`, `kill`, `prop.break.cart`, `shop.buy`, `shop.nomoney`, `ui.ok`, `whiff`, `zombie.alert`, `zombie.idle`): 57 nombres más los alias. Todos existen en `ACH.audio.recipes` (243 recetas). Faltantes: **0**. No hizo falta tocar `sfx-cv.js`.
- 0 avisos de Web Audio en consola en toda la sesión. El contexto quedó `running`.
- No se pudo oír nada; la parte musical la juzga el dueño (nota de C3 §5).

### 9. Rendimiento
CPU por cuadro, `update + render`, en el panel, promedio de 120 cuadros:

| Sitio | update | render | total |
|---|---|---|---|
| Parque del Amor (zombis) | 0,18 ms | 0,58 ms | **0,75 ms** |
| El Beso | 0,09 ms | 0,24 ms | 0,33 ms |
| Larcomar terraza C | 0,09 ms | 0,27 ms | 0,36 ms |
| Larcomar terraza A | 0,12 ms | 0,32 ms | 0,44 ms |
| Salazar | 0,08 ms | 0,27 ms | 0,35 ms |
| Pelea con 6 dumplings | 0,08 ms | 0,21 ms | 0,29 ms (peor cuadro 4 ms, por GC) |
| Caída (`avgFrameMs`) | | | 0,12–0,21 ms (máx. 1,2 ms) |

El presupuesto es 16,7 ms. Con el Worker de 60 Hz el contador del juego (`G.fps`) marcó 60.

**Lienzos.** Chrome tiene un límite de ~2000. `lienzo.js` los parcha a memoria y se miden así:
- Costa Verde: 3889 lienzos «trackeados» al cargar, 4269 tras la pelea con el chef. Hasta 5499 `cpu`.
- Miraflores: 3328 al cargar.
- DOM: 37–40 `<canvas>` vivos. `gpu = 1–4`, `lost = 0`, `rebakes = 0`.

El conteo se queda quieto en estado estable (600 pasos + 300 renders: 4269 → 4269). Sube solo al abrirse la pelea (+130: sprites del chef y retratos). No hay fugas por cuadro.

### 10. Páginas viejas
Por indicación del arquitecto reconstruí `dist/miraflores.html` con `build-miraflores.sh`. `dist/miraflores.html` y `dist/achorado.html` cargan con la consola limpia (título, mundo y 37 canvas). El `index.html` del mapa también abre. No se tocó ningún build ajeno más.

### Extra (a) y (b): traspasos
- **(a)** `js/costaverde/nivel.js` (líneas ~150–176):
  - ENTER (flanco, con `wonT ≥ 0,6`) o clic en `#winGo`, en estado `won` y con `ACH.viaje.go` disponible, llama a `ACH.viaje.setDone('costaverde')`.
  - Luego congela y hace `ACH.viaje.go('main', ACH.game.carryState(), {mapa: true})`.
  - Se intercepta con el `keyGate` en captura y con un `click` en captura: no se toca `game.js`.
  - El texto de `win.go` pasa a «ENTER — VOLVER AL MAPA» (`winGoText()`). Sin `ACH.viaje` queda «ENTER para jugar de nuevo» y `game.js` hace su `winGo` normal. Si `go` falla, se descongela y vuelve a `won`.
  - Probado: Costa Verde `won` → ENTER → `index.html` con el mapa abierto.
- **(b)** `miraflores.html`, tras `ACH.debug.win()` y ENTER (`winGo` con `viaje`), navega a `costaverde.html`. Llega en estado `intro` (se salta el título), con `hp = 77` (el valor puesto antes) y `nivel.id = 'costaverde'`, sin errores.
  - Limitación de la prueba: en esa página mi bucle propio no corría el rAF nativo y hubo que dar el último paso con `game.step`. Es un artefacto del panel oculto, no del juego.
  - No se pudo verificar la mochila: la bolsa vino vacía en esa prueba (no puse objetos de verdad).

## Bugs arreglados

| # | Dónde | Qué pasaba | Arreglo |
|---|---|---|---|
| 1 | `js/costaverde/mundo.js:892` | El punto de control «arena» nunca se ponía. `chef.js` abre la reja a < 56 px, antes de que el chequeo de mundo corriera (que exigía reja cerrada). Morir en la pelea te mandaba hasta Salazar, lejísimos. | Ahora sube el punto de control aunque la reja ya esté abierta, en la franja x ±40 y y de −48 a +120 de la reja. Probado: `checkpoint() = arena`; morir en la pelea reaparece en (4192, 1002). |
| 2 | `js/costaverde/nivel.js:142–176` | Pedido del arquitecto (a): ENTER/toque en el cartel no llevaba al mapa. | Ver extra (a) arriba. |
| 3 | `js/costaverde/juguetes.js:641` | El helado nunca era «lamido»: el zombi se detenía a ~8 px del charco y la condición exigía `d < 7`. | `d < 11`. Probado: 105 cuadros con `cvLickT` activo (~1,75 s, hasta que el zombi se sale del radio). |

Se borraron `juego/preview-cv-chef.html`, `juego/preview-cv-juguetes.html` y `juego/dist/preview-cv-juguetes.html`. Se conservaron las demás `preview-*`.

## Pendientes y avisos (ninguno bloquea)

- **`index.html` / mapa** (arquitecto): los distritos Barranco y Chorrillos siguen bloqueados tras ganar Costa Verde. `ACH.viaje.progress()` ya dice `{costaverde: true}`; falta que `cima`/mapa lo lea. `js/engine/*` y `js/cine/*`: no se tocaron.
- **`js/engine/game.js`** (otra sesión): con el estado `'cine'` no se puede pausar mientras corren la caída y la cinemática. Está documentado desde C1a.
- **Despertar de la guitarra** (`js/engine/habilidades.js`): el diálogo puede saltar en plena pelea o al empezar el nivel. No es de este nivel.
- **Cámara** (`js/costaverde/mundo.js`, `camFor`): al aparecer con `tp` (y al reaparecer en el faro y en el Beso) se ve cortada la parte alta del faro y de El Beso. Es buena la intención (se ve el mar), pero conviene que el arquitecto decida si sube unos píxeles la cámara en esas dos paradas.
- **Chef** (`js/costaverde/chef.js`): la dificultad queda a juicio del dueño, ver §6. No hay medición con una persona real.
- **`debug.cv.tp('arena')`** dispara la entrada del chef aunque se llegue por teleport. Es solo de depuración.
- **Mochila al traspasar:** no se verificó con objetos de verdad (solo `hp`).
- **Audio:** como dice la nota de C3, la mezcla y el gusto musical no se pueden validar sin oído.
