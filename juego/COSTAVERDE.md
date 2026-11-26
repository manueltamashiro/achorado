# ACHORADO — Miraflores, nivel 2: el Malecón de la Costa Verde (contrato del arquitecto)

## 0. Lo que pidió el dueño
- **Cuándo se juega:** después de matar a la picaronera (Doña Chancaca) en el Parque Kennedy y entrar a la Calle de las Pizzas.
- **Dónde:** el **malecón de Miraflores**, sobre la Costa Verde, lo más fiel posible a la realidad.
  - Se avanza **de izquierda a derecha** por parques distintos que van apareciendo.
  - Están el **Parque del Amor** (con la estatua **El Beso**), un **centro deportivo** y varios parques más.
  - Termina en **Larcomar**, con sus tiendas y restaurantes **reales, con sus nombres**.
  - Larcomar **baja 2 o 3 niveles** por el acantilado. En el más bajo está el **jefe 1**.
- **Jefe 1: un chef chifa gigante y bien gordo.**
  - Tira **palitos chinos**.
  - Manda **dumplings** que atacan con la boca abierta y los ojitos cerrados.
  - Hay que esquivarlos y pegarles.
- **Vendedores**, sobre todo en Larcomar, para comprar cosas y armas.
- **Armas nuevas:**
  - **Pelota de fútbol:** se patea contra los zombies.
  - **Barra fosforescente** de fiesta: para golpear.
  - **Helados en barquillo:** se tiran, y se consiguen de los **heladeros** que pasan.
  - **Perritos** que pasean: se les da una patadita y **atacan a los zombies** que tengan delante. Después se van corriendo.
- **Final (segundo mensaje del dueño):**
  - Después del chef, Alexander va al borde del acantilado y **se tira en parapente**.
  - **Jefe 2, todo en caída:** otro jefe en su propio parapente, al frente.
    - Los dos bajan, se mueven **de arriba abajo**, esquivan y se disparan de un lado al otro de la pantalla.
    - El jefe tira **tablas de surf**. Alexander responde con **flechitas fosforescentes de colores**.
  - Al vencerlo: **video cinemático** de Alexander aterrizando como héroe en las **playas de Chorrillos**.
  - Ahí dice, triunfante: «Ya estoy cada vez más cerca de la ubicación de la cura de esta enfermedad».

**Investigación (manda en forma, orden y colores):**
- `../diseno/investigacion-costaverde-malecon.md`: orden real NO→SE, El Beso, mosaicos, faro, puentes, parques.
- `../diseno/investigacion-larcomar.md`: niveles, tiendas por nivel, logos.

Léanlas antes de empezar. Lo marcado «(sin confirmar)» se puede inventar con criterio.

**Arte:** se sigue la guía de `../diseno/revision-estetica.md` y la sección v0.4 de `SPEC.md`:
- 480×270, tiles de 16 px, 1 m = 16 px, alturas comprimidas;
- fuentes ACH5/7/12;
- luz de tarde con garúa.
- Miraflores es **limpio y con color**, como `MIRAFLORES.md` (pasto verde, flores, ladrillo rojo del parapeto, mar gris verdoso). El cielo sigue siendo panza de burro.

**Decisiones del arquitecto (avisadas al dueño):**
- **Orden real, compactado.** Se arranca en el **Faro La Marina** y se va hacia el SE: parapuerto → zona deportiva → Parque del Amor → Puente Villena → Intihuatana → Letonia → Parque Salazar → Larcomar. Los hitos van a tamaño real; los tramos entre ellos se acortan unas 4 veces.
- **«Centro deportivo»:** no existe uno solo en ese tramo. Va un **complejo deportivo** que junta:
  - el **gimnasio al aire libre** junto al parapuerto (real);
  - una **losa de fulbito** (de ahí salen las pelotas);
  - el **Club Tennis Las Terrazas**, que se ve abajo, en la Bajada Balta, bajo el puente (real).
- **El chef no es de un restaurante real.** Su local es el **«CHIFA GRAN DRAGÓN»**, inventado, en el nivel más bajo, al borde del acantilado (como Maestro Tzu en la vida real). En los pisos de arriba van las tiendas reales.
- **Ojitos de los dumplings:** cerrados en media luna, felices y glotones, como las mascotas de dumplings (^ ^). Ni el chef ni los dumplings llevan rasgos étnicos exagerados: el chef es un cocinero de chifa gigante con gorro, chaquetilla, bigote y barriga.
- **Perritos:** la «patadita» es un empujoncito con el pie. El perro no se hace daño, ladra contento y sale disparado contra los zombies.
- **Puente Villena:** sin chistes de caídas, por su historia real.

---

## 1. Arquitectura: una página aparte (igual que Miraflores)

- **Página propia:** `costaverde.html` → `build-costaverde.sh` (el mismo `awk` de `build-miraflores.sh`) → `dist/costaverde.html`.
- **Scripts:** copia la lista de **`miraflores.html` tal como esté al construir**, con estos cambios:
  - `js/miraflores/nivel.js` → `js/costaverde/nivel.js`;
  - `js/miraflores/mundo.js` → `js/costaverde/mundo.js`;
  - `js/miraflores/rock.js` → `js/costaverde/surf.js`;
  - se quitan `trabajadores.js`, `jefa.js` y `cargables.js` de Miraflores;
  - **se dejan** `inflables.js`, `arte-personajes.js`, `arte-parque.js`, `sfx-mira.js` y `voces-mira.js` de Miraflores, porque traen las definiciones de objetos que Alexander puede traer en la mochila. Si alguno estorba, se reporta;
  - se agregan los `js/costaverde/*` en el orden de §1.2, antes de `base/base.js`, `engine/pausa.js` y `engine/game.js`.
- **`index.html`, `miraflores.html`, `build.sh`, `build-miraflores.sh` y los archivos de `js/engine/*`, `js/miraflores/*`, `js/base/*`, `js/sprites/*` y `js/audio/*` NO SE EDITAN.**
  - Ahora mismo trabajan otras sesiones: «Kennedy Park nivel mejoras» (v0.11, `V011.md`) y «Árbol de habilidades» (`HABILIDADES.md`).
  - Lo que falte se extiende en tiempo de ejecución desde `js/costaverde/*`, a través de lo exportado: `ACH.nivel`, `ACH.armas.define`, `ACH.inv.defs`, `ACH.zvar`, `ACH.ent`, `ACH.sprites.*`, `ACH.tienda`, `ACH.vendedores`, `ACH.VENDEDORES_DATA`, `ACH.dialogo`, `ACH.extraDrawables`, `ACH.propHooks`, `ACH.drawHooks`, `ACH.viaje`.
  - Si algo es imposible sin editar un archivo ajeno, **se anota en tu nota** (`diseno/cv-<fase>.md`) y se sigue con una solución provisoria. Nunca se edita ese archivo.
- **`ACH.nivel` (de `js/costaverde/nivel.js`):** la MISMA forma que el de Miraflores (`MIRAFLORES.md` §2: `id`, `intro`, `camPeek`, `noche`, `update`, `reset`, `onRespawn`, `mood`, `drawables`, `drawTop`, `onSwing`, `onProjectile`, `speedMul`, `win`), con `id: 'costaverde'`.
  - Los sistemas se registran con `ACH.cv.register(sys)` (lista `ACH.cv.systems`) y los despachadores los recorren en orden.
  - **Compatibilidad:** como `inflables.js` y el arte de Miraflores usan `ACH.mira` (`register`, `sfx`, `toast`, `brandName`), `nivel.js` crea **`ACH.mira` como alias** de los mismos sistemas (`ACH.mira.systems === ACH.cv.systems`) con esas funciones.
  - Así lo de Miraflores corre igual. `W.vendors = []` hace que Don Tito y Don Pepe no aparezcan.
- **Robustez:** cada archivo de Costa Verde funciona aunque falten los otros.
  - Si falta un sprite, va un bloque de color con su nombre en ACH5.
  - Si falta un sonido, no pasa nada.
  - Todo lo de afuera se llama protegido (`typeof … === 'function'` + try/catch).
- **Reglas del motor:**
  - sin `getImageData`, `shadowBlur`, `filter` ni degradados creados en cada cuadro dentro de los bucles: todo se **hornea** una vez;
  - los lienzos se crean con `ACH.lienzo` o `ACH.px.canvas` si existen (límite de lienzos de Chrome);
  - 60 fps.
- **Probar:** `sh build-costaverde.sh && cd dist && ruby -run -e httpd . -p <TU PUERTO> -b 127.0.0.1` (no hay node ni python; el panel no abre `file://`).
  - **Puertos:** C1a 8711 · C1b 8712 · C1c 8713 · C2a 8714 · C2b 8715 · C2c 8716 · C3 8717 · C4 8718 · C5 8719 · QA 8720.
  - Al terminar, apaga tu servidor.
- **Idioma:** todo lo visible en **castellano chalaco** (jerga sin groserías fuertes). Menús y paneles en estilo chicha (rosado, amarillo y verde fosforescente sobre negro), como el resto.
- **Nota final de cada fase:** al terminar, escribe en `../diseno/cv-<fase>.md` qué hiciste, la API real, qué falta y los problemas conocidos.

### 1.1 Archivos y dueños

| Archivo | Contenido | Dueño |
|---|---|---|
| `costaverde.html`, `build-costaverde.sh`, `js/costaverde/nivel.js`, `mundo.js`, `zombis.js` | Página, pantallas, ganchos, mapa, cámara por niveles de Larcomar, puntos de control, zombies nuevos, debug | **C1a** (Opus) |
| `js/costaverde/chef.js` | Jefe 1, palitos, dumplings, arena, barra de jefe, salto al parapente (disparo de la caída) | **C1b** (Opus) |
| `js/costaverde/juguetes.js` | Pelota, barra fosforescente, helados y heladeros, perritos, vendedores y sus datos, comidas nuevas | **C1c** (Opus) |
| `js/costaverde/arte-malecon.js` | Tiles, props y calcomanías del malecón y de la vista al mar | **C2a** (Sonnet) |
| `js/costaverde/arte-larcomar.js` | Terrazas, escaleras y fachadas de Larcomar con marcas, Chifa Gran Dragón, torres del lado tierra | **C2b** (Sonnet) |
| `js/costaverde/arte-personajes.js` | Chef, dumplings, palitos, perritos, heladero, vendedores, zombies nuevos, objetos, Alexander con las armas nuevas | **C2c** (Sonnet) |
| `js/costaverde/surf.js`, `sfx-cv.js`, `voces-cv.js` | Música, sonidos y frases | **C3** (Sonnet) |
| `js/costaverde/caida.js`, `js/costaverde/arte-caida.js` | Jefe 2 en caída libre: modo de juego propio y su arte | **C4** (Opus) |
| `js/costaverde/chorrillos.js` | Cinemática del aterrizaje en Chorrillos (arte grande, música heroica y diálogo) | **C5** (Sonnet) |
| `COSTAVERDE.md` | este contrato | arquitecto |

### 1.2 Orden de carga en `costaverde.html`
1. `js/costaverde/nivel.js` va **primero**.
2. Los sprites de siempre (como en `miraflores.html`).
3. Arte de Miraflores: `arte-parque.js`, `arte-negocios.js` y `arte-personajes.js`.
4. Arte de Costa Verde: `arte-malecon.js`, `arte-larcomar.js`, `arte-personajes.js` y `arte-caida.js`.
5. Audio: `sfx.js`, **`surf.js`**, `voces.js`, `motor.js`, `sfx-mira.js`, `voces-mira.js`, **`sfx-cv.js`**, **`voces-cv.js`**.
6. Motor, como en `miraflores.html`, con **`js/costaverde/mundo.js`** en vez de `world.js`.
7. Después de `hud.js`, lo que queda de Miraflores: `inflables.js` y lo que pida `V011.md`.
8. `zombis.js`, `juguetes.js`, `chef.js`, `caida.js` y `chorrillos.js`.
9. `js/cine/cima.js` si `miraflores.html` lo carga (por el mapa de la pausa).
10. `base/base.js`, `engine/pausa.js` y `engine/game.js` al final.

Si la sesión de habilidades agrega `habilidades.js` y `melodias.js` en `miraflores.html`, también van aquí, en su misma posición.

---

## 2. El mapa (`mundo.js`, C1a)

`ACH.world` tiene la **misma forma** que el de `js/miraflores/mundo.js`: todas sus claves y tipos, con `id: 'costaverde'`. Agrega estas claves:
- `places{}`: puntos con nombre, para `ACH.debug.cv.tp(nombre)` y para los otros sistemas: `faro, parapuerto, deporte, losa, amor, beso, puente, intihuatana, letonia, salazar, larcoA, larcoB, larcoC, arena, borde`.
- `terr[]`: las terrazas de Larcomar, `{id, r0, r1, c0, c1}`.
- `stairs[]`: las escaleras, `{x0, y0, x1, y1, dir:'S'}`.
- `checkpoints[]`.
- `heladeroPath[]`: polilíneas por donde pasan los heladeros.
- `dogZones[]`: zonas de paseo de los perritos.
- `vista`: la banda de mar (§2.3).
- `dynSolids[]`, igual que en Miraflores.

### 2.1 Giro y corte (de arriba hacia abajo, en filas)
El malecón real corre NO→SE con el mar al SO. En el juego **se gira**: se avanza al **este** (derecha), el **mar queda abajo** (sur) y los edificios de la tierra quedan arriba, con la **fachada mirando a la cámara**, como en la Gambetta. Mapa de unas **300 × 80 tiles**.

| Filas (aprox.) | Qué |
|---|---|
| 0–9 | **Manzana del lado tierra:** torres de departamentos y hoteles del malecón. Muchas de vidrio teal con franjas doradas, algunas casonas, el **JW Marriott** al llegar a Salazar. Sólidas, con la fachada al sur |
| 10–11 | Vereda norte |
| 12–17 | **Malecón Cisneros / de la Reserva:** pista de 2 carriles con autos abandonados que se rompen como en la Gambetta. En 2 o 3 puntos entra una calle desde el norte (Av. Jorge Chávez, Av. Diagonal / Malecón Balta…), como jirón |
| 18 | Sardinel |
| 19–32 | **La franja de parques**, que cambia por tramo (§2.2): caminos, pasto, ciclovía (pavimento rojizo), bancas, faroles verde oscuro con globo blanco, palmeras y ficus |
| 33 | **Parapeto del acantilado:** ladrillo rojo con pilastras. Es sólido |
| 34–79 | **Vista:** acantilado, Circuito de Playas, playa de piedras, mar, surfistas, parapentes (§2.3). **No se camina**, salvo en las columnas de Larcomar (§2.4) |

### 2.2 De oeste a este (columnas aproximadas; la investigación manda en el detalle)

| Cols | Tramo | Lo que tiene que haber |
|---|---|---|
| 0–30 | **Faro La Marina y Parque Raimondi** | El faro azul marino casi negro con 2 franjas blancas y su linterna. Inicio del nivel y primer punto de control |
| 30–70 | **Parapuerto** | Despegue de parapente con caseta y mangas de viento. Parapentes de colores pasan sobre el acantilado (calcomanía animada). Aquí empiezan a caer los **zombies parapentistas** |
| 70–100 | **Complejo deportivo** | Gimnasio al aire libre (máquinas verdes y amarillas), **losa de fulbito** con arcos, rejas y **3 pelotas sueltas**, más gradas. Llega la Av. Jorge Chávez |
| 100–150 | **Parque del Amor** | **El Beso** (12 × 3 m, terracota o salmón, pareja recostada) sobre su pedestal de azulejo oscuro, con seto y baranda color óxido. **Bancas-muro ondulantes de mosaico** (trencadís azul, rojo, naranja y amarillo) con frases de amor legibles en ACH5 y el **sol de rayos rojos**. Anfiteatro chico. La escultura roja de **Cupido**. Flores. Primer **heladero** y **Don Fosfo**, el ambulante de barras (§4). Segundo punto de control |
| 150–172 | **Puente Villena Rey y su mellizo, sobre la Bajada Balta** | La franja de parques se corta: la quebrada es sólida y solo se cruza **por los puentes**, que son el cuello de botella. Abajo, en la quebrada, se ve el **Club Tennis Las Terrazas** (canchas de arcilla, muros turquesa) |
| 172–215 | **Parque Intihuatana** (y Ferrero y Champagnat) | La escultura **Intihuatana** de concreto gris con huecos cuadrados y redondos. Senderos, bancas y perros |
| 215–250 | **Parque Letonia** | El **tótem de espejo** sobre adoquín amarillo y rojo. Es la zona de perritos (`dogZones`) |
| 250–285 | **Parque Salazar** | Pérgolas de madera ondulada, las **3 chimeneas de vidrio azul** de Larcomar asomando del pasto, la pileta con la **cabeza de cóndor**, el JW Marriott arriba. **Entrada a Larcomar**: bajada en escalera hacia el sur. Tercer punto de control |
| 280–300 | **Larcomar** | Hacia abajo, en las filas 34–79 (§2.4) |

**Larcomar (lo que sí se camina debajo del parapeto, cols ~250–300):**
- Las terrazas bajan **hacia el sur**, hacia el mar.
- Cada terraza tiene las **fachadas de las tiendas en su pared norte, mirando a la cámara**: es la pared de roca o concreto bajo la terraza de arriba.
- Al frente de cada terraza hay baranda de vidrio y el mar.

### 2.3 La vista al mar (`vista`)
- **Fuera de Larcomar, las filas 34–79 son una calcomanía grande que no se camina:**
  - el acantilado de tierra clara con malla y vegetación colgante;
  - el Circuito de Playas con autos quietos;
  - la playa de canto rodado;
  - las olas, en 3 cuadros, y el mar gris verdoso.
- Lleva un poco de **paralaje** (se mueve 0.85 con la cámara) para que se sienta altura.
- Detalles animados baratos: surfistas, gaviotas y pelícanos, parapentes, el muelle de la Rosa Náutica (de lejos, sin nombre).
- **La cámara no baja más de lo necesario.** Cuando Alexander camina por los parques, se ve la franja y unos 4 o 5 tiles de vista. Así se lee que estás arriba de un acantilado.

### 2.4 Larcomar en terrazas (de arriba hacia abajo)

| Nivel | Filas | Real | Qué tiene |
|---|---|---|---|
| **A · Ingreso** | 36–44 | Nivel de ingreso o -1 Plaza Coral | Pared norte con **Nike, Banana Republic, Tanta, Mangos (con terraza), KO Asian, Popular, La Bonbonniere, T.G.I. Friday's, Pardos Chicken**. Al centro, el **letrero LARCOMAR**. **Kiosco Larcomar** (vendedor) |
| **B · Plaza Central** | 47–55 | -2 | **Cinépolis** (fachada grande, cartelera), **H&M, Miniso, Adidas Originals, Starbucks, Freddo, Cinnabon**. Tienda deportiva (vendedor) |
| **C · Plaza del Mar** | 58–66 | -3 | El patio de comidas **Salazar Food & Drinks** (bar central), **Häagen-Dazs, Master Kong** y otros locales del Salazar. **Fuente de soda** (vendedor de comidas) |
| **D · Arena** | 69–79 | -4/-5, al borde | **CHIFA GRAN DRAGÓN** (inventado): fachada roja y dorada con faroles rojos, mesas redondas con giratorio, peceras. Abierto al mar, con baranda de vidrio. La **zona de salto al parapente** se abre al ganar. Cuarto punto de control, antes de entrar |

- **Escaleras:** de una terraza a la siguiente, en 2 puntos por nivel (por ejemplo, una al oeste y una al este), anchas como las de Larcomar.
  - Escalera mecánica de adorno al lado (rota, quieta).
  - **Bajar es más rápido** (×1.25) y **subir, más lento** (×0.8), con `speedMul`, como en el Cerro.
- **Cámara:** sigue a Alexander. Al entrar a una terraza, centra esa terraza: la fachada arriba y la baranda con el mar abajo. Se hace con el gancho que haya (`camPeek: false` + lo que use `game.js` para el objetivo de cámara). Si no hay gancho, que la cámara normal baste y se anota.
- **La entrada a la arena** (escalera C→D) se cierra con una reja metálica de chifa (sólido dinámico) hasta llegar a ella. Al pasar: diálogo del jefe (§5.1) y empieza la pelea.

### 2.5 Mobiliario, gente y gatos
- **Faroles:** con `lamp`, como en Miraflores.
- **Bancas, basureros y bebederos.**
- **Parejas** sentadas (adorno, en el Parque del Amor).
- **Corredores** (zombies, §3).
- **Pocos gatos** (este no es el Kennedy).
- **Perritos** (§4.4).
- **Rejas de tenis** en la quebrada.
- **Props rompibles** (props de siempre): sombrillas de terraza, macetas, mesas del Salazar, carteles «MIRAFLORES» de la municipalidad. Al romperse sueltan monedas y comida.

### 2.6 Inicio, puntos de control, final
- **Inicio:** al pie del faro.
- **Intro con retrato** (`ACH.dialogo.play`, regla de diálogos con retrato), de 2 a 4 líneas. Por ejemplo:
  - «La Calle de las Pizzas me botó al malecón… ¡Qué tal vista, causa! Lástima los muertos.» (cara: sorpresa)
  - «Dicen que la pista de la cura sigue por la costa. A Larcomar, de frente.» (cara: serio)
- **Puntos de control:** faro, Parque del Amor, Parque Salazar y la entrada a la arena.
- **Final del nivel:** NO es un cartel de victoria al matar al chef. El orden es:
  1. chef muerto;
  2. borde y parapente;
  3. caída (C4);
  4. Chorrillos (C5);
  5. **ahí sí**, el cartel «¡ATERRIZASTE EN CHORRILLOS!», con tiempo, fans tumbados, muertes, perritos azuzados y helados lanzados;
  6. ENTER lleva al mapa: `ACH.viaje.setDone('costaverde')` y, si existe, `ACH.cima` desbloquea Barranco y Chorrillos. El enlace final lo hace el arquitecto al integrar; hasta entonces, ENTER = jugar de nuevo.
- **Si muere en la caída:** reaparece en el **inicio de la caída** (el borde), no en el faro, con la vida llena y la mochila igual. El chef sigue muerto.

### 2.7 Llegada desde Miraflores
- `nivel.js` lee `ACH.viaje.take()` si existe. Con `carry` (vida, mochila, guitarra, mano, habilidades), **salta el título** y arranca con la intro, como hace `miraflores.html`.
- Sin viaje (abierta directo), hay título: kicker «MALECÓN · COSTA VERDE» y la línea «Nivel: Miraflores 2, el malecón».
- **Ojo:** hoy `viaje.js` no conoce la página `costaverde`. Su `here()` solo distingue Miraflores, y lo maneja otra sesión. El arquitecto lo conecta al integrar. Hasta entonces, `nivel.js` ignora un viaje cuyo `to` no sea `'costaverde'`.

### 2.8 Debug obligatorio (`ACH.debug.cv`)
- `tp(place)`;
- `skip('chef' | 'caida' | 'chorrillos')`;
- `god(true)`;
- `give(id, n)`;
- `routeCheck()` (BFS de faro a arena, considerando muerto al chef);
- `spawnCheck()`;
- `state()`;
- `?cv=caida` y `?cv=chorrillos` en la URL para saltar directo.

---

## 3. Zombies nuevos (`zombis.js`, C1a)
**Densidad:** más que en el Kennedy (que estaba casi vacío) y menos que en el Callao. Todos usan el formato de `ACH.zvar`, como hace `js/miraflores/trabajadores.js`: léelo y copia el patrón sin editarlo.

| Tipo | Dónde | Comportamiento |
|---|---|---|
| **Corredor** | todo el malecón | Zombie con ropa deportiva y audífonos. Corre en línea recta por los caminos (rápido ×1.6). Vida baja (1.5), frena al chocar |
| **Pareja** | Parque del Amor | Dos zombies abrazados que se mueven como uno (vida 4). Al bajar a la mitad se separan en dos zombies normales |
| **Turista selfie** | Amor → Salazar | Palo de selfie. Cuando te ve, a veces hace un **flash** (destello de 0.3 s) que **avisa a los zombies** a 120 px. Lento |
| **Surfista** | tramos con bajadas a la playa (Amor, Letonia) | Con su tabla bajo el brazo. Golpe ancho (arco de 140°) que empuja. Vida 3 |
| **Parapentista** | parapuerto y Amor | **Cae del cielo:** sombra que crece 1.2 s como aviso, aterriza y deja el parapente tirado (prop que se rompe). Si cae encima, 1 de daño. Máximo 1 cada 15 s |
| **Trabajador de Larcomar** | terrazas A–C | Uniforme con colores de la tienda más cercana (skins por marca, como los trabajadores del Kennedy). Lento |
| **Seguridad** | terrazas B y C | Zombie de vigilante, con chaleco y gorra. Vida 5, lento, empuja fuerte |

---

## 4. Armas, objetos, perritos, heladeros y vendedores (`juguetes.js`, C1c)
Los objetos nuevos van en `ACH.inv.defs` (mira cómo lo hace `inflables.js`, con `use.fn` si hace falta). Las armas «en la mano» van con `ACH.armas.define` (lee `armas.js` y `V011.md` §2.2; respeta `ACH.cfg.durMul`). Los golpes pasan por `ACH.nivel.onSwing` y los proyectiles por `onProjectile` (kinds abajo), para que el chef y los dumplings los reciban.

### 4.1 Pelota de fútbol (`pelota`)
- **Es una entidad del mundo.** Hay 3 sueltas en la losa de fulbito y se compran (§4.5).
- **Conducir:** al caminar contra ella, la empuja adelante.
- **Patear con F:** si hay una pelota suelta a menos de 20 px delante, F la patea. Esto tiene **prioridad sobre lanzar lo de la mano**.
  - **Toque rápido:** 240 px/s, daño 1.
  - **Mantener F para cargar** (como la resortera): hasta 380 px/s y daño 2.
- **En vuelo:** rebota en zombies (hasta 3 rebotes, empujón 120), en paredes y props, frena con el roce y queda quieta para volver a patearla.
  - Proyectil `kind: 'ball'`.
  - Le pega a Alexander solo si rebota rapidísimo (no).
- **E** la recoge a la mochila. Usarla desde la barra la suelta a los pies.
- **Gol de lujo:** si entra en un arco de la losa, sale el cartel «¡GOOOL!» con 2 monedas. Una vez por arco.

### 4.2 Barra fosforescente (`barraFosfo`)
- **Arma en la mano** de 4 colores: verde, rosado, amarillo o celeste, al azar o según el pack.
- **Golpe:** daño 0.8, rápido (cd 0.18), alcance 26, arco de 120°, `bees` = daño. Dura 30 golpes (×durMul).
- **De noche** echa luz de su color, radio 44 px: se hornea un halo una vez por color y se dibuja en `drawTop`, o con la luz que soporte el render.
- **F la tira:** gira en el aire, daño 0.5 y queda en el suelo brillando 20 s. Los zombies a 70 px van a mirarla (señuelo).
- Son las mismas barras que en la caída se vuelven **flechitas fosforescentes** (C4): en la intro de la caída, Alexander las parte y las carga en la resortera.

### 4.3 Helados y heladeros (`helado`)
- **Heladeros:** personas vivas en **triciclo amarillo con sombrilla**. Modo real: logo D'Onofrio. Parodia: «D'ONOFRÍO».
  - Recorren `heladeroPath` de punta a punta: hay 1 en el mapa a la vez y aparece otro a los 40–70 s de irse.
  - Tocan su **corneta** (sonido `cv.corneta`) cada pocos segundos, para que se les busque.
  - Los zombies los ignoran.
  - **E cerca** (radio 24): se detienen y abren su tienda (`ACH.tienda.open('heladero')`), o un panel propio si no hay `ACH.tienda`.
- **Helado en barquillo:** pila de 6, 1 sencillo.
  - Desde la barra rápida se pone en la mano. **F lo lanza** en arco corto (la misma carga que la resortera si es fácil).
  - **Al pegar:** daño 0.5 y el zombie queda **congelado** (lento ×0.4) por 3 s. Proyectil `kind: 'throw:helado'`.
  - **Al caer al suelo:** charquito de helado; los zombies a 80 px van a **lamerlo** 3 s (señuelo).
  - **ESPACIO con el helado en la mano** = comérselo: +8 de vida y el cartel «¡CEREBRO CONGELADO!».

### 4.4 Perritos
- **Perros vivos** que pasean por `dogZones` y los caminos: chusco marrón, salchicha, golden, pug, peruano sin pelo y un husky que jadea. Entre 5 y 7 en el mapa. Se les puede acariciar (contador).
- **E cerca de un perro = patadita** (empujoncito con el pie, animación corta de Alexander):
  - el perro ladra («¡GUAU!») y **sale disparado** en la dirección en que mira Alexander;
  - busca al zombie más cercano en un cono de 60° y 140 px adelante;
  - lo muerde 3 s (0.5 de daño por mordida, el zombie queda aturdido mientras lo muerde);
  - luego **huye corriendo** fuera de cámara y reaparece en su zona a los 30 s.
  - Si no hay zombie adelante, corre ladrando 2 s (hace ruido y atrae) y huye igual.
  - **Enfriamiento** por perro: 20 s.
  - Los zombies pueden golpearlo: el perro chilla y huye sin daño visible.
- **Contra el chef:** muerde a los dumplings. Al chef le hace 0.3 por mordida.

### 4.5 Vendedores (con `ACH.tienda` de V011)
Se registran **en tiempo de ejecución** en `ACH.VENDEDORES_DATA` con `nivel: 'costaverde'`. Se ponen en el mundo con la API que deje escrita `diseno/v011-B.md` (por ejemplo `ACH.vendedores.add({id, x, y})`). Si no existe, se dibujan y atienden desde `juguetes.js`.

| id | Quién | Dónde | Stock (precio en sencillos) |
|---|---|---|---|
| `heladero` | El heladero | triciclo | helado 1 (n 1), paleta de agua 1 (+5 vida) |
| `fosfo` | **Don Fosfo**, ambulante de luces de fiesta | Parque del Amor | barraFosfo 2, pack de 3 barras 5, pelota 4, cuerdas 2 |
| `kioscoLarco` | **Kiosco Larcomar** | terraza A | pelota 4, barraFosfo 2, uhu 6, Inca Kola, cuerdas 2 |
| `deportes` | **Deportes Malecón** (tienda inventada; no Nike ni Adidas) | terraza B | pelota 3, «pelota de cuero» (daño +50 %) 8, canilleras (−25 % daño por 90 s) 6 |
| `fuente` | **Fuente de soda del Salazar** | terraza C | arroz chaufa (+40 vida) 5, wantán frito (+15 y corre más 20 s) 3, chicha morada (+20 aliento) 2, helado 1 |

- Cada uno dice **una línea de presentación** la primera vez (globo o toast del vendedor, no retrato).
- **Frase de «no alcanza»:** «Aquí es precio Larcomar, joven».

---

## 5. Jefe 1: El Maestro Wantán (`chef.js`, C1b)
Lee `js/miraflores/jefa.js` (ya resuelto en v0.11: «jefa justa») y copia su patrón: barra de jefe, golpes por `onSwing`/`onProjectile`, `dynSolids`, punto de control y reinicio en `reset`/`onRespawn`. No está en `G.zombies`.

### 5.1 Quién es
- **Cocinero de chifa gigante** (~2.4 veces una persona) y **bien gordo**: gorro alto blanco, chaquetilla blanca con ribete rojo, mandil, bigote, cucharón al cinto y un wok a la espalda.
- Lleva un manojo de **palitos** en cada mano.
- Sale de la cocina del Chifa Gran Dragón.
- **Entrada:** diálogo con retrato de Alexander (cara: miedo y luego picaro) más 1 o 2 líneas del chef en globo:
  - **Nada de imitar acentos.** El chef habla como un maestro cocinero criollo:
  - «¡Mesa cuatro, un cantante al vapor! ¡Y bien cocido!»
  - «En mi cocina nadie toca guitarra, compadre.»

### 5.2 La pelea (vida 40; con guitarra al 100 % y 2 comidas se gana en menos de 2.5 min)
**Fase 1 (100–60 %):**
- **Abanico de palitos:** levanta los brazos 0.5 s como aviso y tira 5 palitos en abanico de 50° hacia Alexander. Rápidos (260 px/s), 1 de daño, se clavan en el piso 1 s.
- Cada 8 s **llama a 3 dumplings:** destapa una vaporera gigante y salen saltando.

**Fase 2 (60–25 %):**
- **Lluvia de palitos:** 8 sombras en el piso, 0.7 s de aviso, y caen.
- Alterna con el abanico de 7.
- Llama a 4 dumplings, uno de ellos **baozi grande** (vida 3).

**Fase 3 (<25 %):**
- **Salto de wok:** salta y cae donde estaba Alexander (sombra de 1 s). Onda de choque de 40 px que empuja, 1.5 de daño.
- Después **se sienta cansado** 2.5 s («¡Un tecito, un tecito!»): **recibe el doble de daño**.

**Dumplings** («wantancitos» y siu mai):
- Pelotitas de masa con pliegues arriba, **boca enorme abierta** con dientitos y **ojitos cerrados en media luna**.
- Saltan hacia Alexander (hop cada 0.6 s) y muerden: 1 de daño, rebotan.
- Vida 1.5. Mueren con cualquier golpe fuerte; con la pelota, el helado o el perro también.
- Máximo 6 a la vez.

**Contra el chef:**
- Lo dañan la guitarra, el puñete, las armas en la mano, la pelota (`ball`: daño ×1.5, ¡sí le gusta el fútbol!), los helados (lo **ralentizan** 2 s, máximo cada 6 s), la barra fosforescente y los perros.
- Siempre se puede ganar solo con guitarra o puñetes. Nada de «¡CLANC!» injusto (V011 §8.1).

**Muerte:**
- Cae de espaldas como una montaña. El wok rueda por la terraza y suelta 12 monedas y 2 arroces chaufa.
- Línea de Alexander con retrato (cara: risa): «Ese pedido salió crudo, maestro.»

### 5.3 Al borde y al parapente
- Al morir el chef, se abre la baranda de la punta de la arena: **parapente de alquiler** de la caseta «VUELOS TANDEM», con una flecha chicha «¡AL BORDE!».
- **E en el borde** → diálogo con retrato (2 líneas, cara: serio y luego risa). Por ejemplo:
  - «¿Y si me tiro? Peor es quedarme con los muertos.»
  - «Titina, agárrate fuerte. ¡Ahí vamos!»
- Animación corta de carrera y salto en el mundo (0.8 s).
- Luego `ACH.cv.caida.start({ onWin, onLose })` (C4).
- `onWin` → `ACH.cv.chorrillos.play({ onEnd })` (C5) → `onEnd` → cartel de victoria (§2.6).
- **Sin C4 o C5:** se salta lo que falte y se va directo al cartel.
- El estado del juego mientras corre la caída o la cinemática: el mundo **no se actualiza** ni lee input. Usa el mecanismo que exista (el estado `'base'` de V011 §4.4, un estado de cinemática de `game.js`, o un `update` del nivel que congele). Explica en tu nota cuál usaste.

---

## 6. Jefe 2: El Tablazo, en caída libre (`caida.js` + `arte-caida.js`, C4)
Es un **modo de juego propio**, como la cinemática de la cima (`js/cine/cima.js`): tiene su propio lienzo encima de `#stage` (480×270, mismo escalado pixel), su propio bucle y su propio input. Al terminar, se quita todo sin dejar basura.

```
ACH.cv.caida = { start({onWin, onLose}), stop(), isOn(), debug: { win(), hp(n), god(b) } }
```

### 6.1 Cómo se ve
- **Vista de costado**, cayendo: el fondo sube con paralaje en 4 capas.
  1. Cielo panza de burro con nubes y garúa.
  2. La costa de Lima de lejos: Barranco y Chorrillos, y el **Morro Solar** al fondo con su cruz, que se va acercando.
  3. El acantilado de la Costa Verde con su malla verde y el Circuito de Playas.
  4. Gaviotas, pelícanos y jirones de neblina que pasan rápido.
- Abajo, el mar se acerca de a pocos: una barra de **altura** de 300 m a 0 m.
- **Alexander** cuelga de su parapente en el **tercio izquierdo**, con Titina en el hombro.
  - Vela del parapente: **rosado y amarillo chicha**, con el logo del juego.
  - Se mueve de **arriba abajo** (W/S y flechas) y un poco de lado (A/D, ±30 px).
  - Va inclinado y con la ropa flameando.
- **El Tablazo** cuelga de su parapente en el **tercio derecho**: zombie surfista con traje de neopreno roto, pelo decolorado y un montón de tablas colgando de su arnés. Se mueve arriba y abajo. Su vela es turquesa con la palabra «SURF».

### 6.2 Cómo se juega (90–150 s)
**Alexander dispara flechitas fosforescentes:**
- **ESPACIO** o **clic** dispara una flechita con la resortera: horizontal hacia la derecha, **de colores que van rotando** (verde, rosado, amarillo, celeste), con estela brillante horneada.
- Enfriamiento 0.22 s.
- **Mantener 0.8 s:** abanico de 3.
- Munición infinita. Si en la mochila hay barras fosforescentes, cada una da **+10 % de daño** a las flechas (tope +50 %), con el cartel «¡LUCES DE FIESTA!».

**El Tablazo tira tablas de surf** (vida 30):

| Fase | Ataque |
|---|---|
| **1** | **Tabla recta:** 0.4 s de aviso (se le ve sacar la tabla) y sale girando hacia la izquierda, 1 de daño |
| **2 (<66 %)** | **Ráfaga de 3** a distintas alturas, con un hueco para pasar. A veces la **tabla bumerán**: sale y vuelve por otra altura |
| **3 (<33 %)** | **Ola de tablas:** 5 en columna, con un solo hueco que se mueve. Además pasan **pelícanos** (obstáculos que solo empujan) |

- Las flechitas **rompen tablas** en el aire (2 flechas por tabla): así se puede defender.
- **Vida de Alexander:** la del juego. Al llegar a 0, `onLose`: reaparece en el borde de la arena, con la caída de nuevo.
- **La altura baja con el tiempo.** Si llega a 30 m sin ganar, el Tablazo se pone **furioso**, ataca más rápido y la altura **se queda en 30 m** hasta que muera. No se pierde por tiempo.
- **Muerte del Tablazo:** su vela se rompe y cae dando vueltas hasta el mar, con un **¡SPLASH!**. Alexander grita «¡Tabla rasa, compadre!» en el cartel y luego llama a `onWin`.
- **Dificultad:** intermedia. Tiene que ganarse en 2 o 3 intentos.
- **Táctil:** si `ACH.tactil` está activo, la mitad izquierda de la pantalla mueve y el botón derecho dispara. Si es difícil, se anota.
- **Música:** `cv.caida` de `surf.js`. Si no existe, nada.

---

## 7. Cinemática del aterrizaje en Chorrillos (`chorrillos.js`, C5)
Mismo enfoque que `js/cine/cima.js` (léelo): lienzo de 960×540 con arte más grande y detallado que el del juego, y el Alexander claro estilo Stardew de esa cinemática.

```
ACH.cv.chorrillos = { play({onEnd}), stop(), isOn() }
```

- **Investiga cómo se ven las playas de Chorrillos** antes de dibujar: Agua Dulce, Pescadores, La Herradura, el Malecón de Chorrillos, el **Morro Solar** con la **Cruz** y el **Cristo del Pacífico**, el Club Regatas, los botes pesqueros de colores y el muelle de pescadores. Escribe lo que encuentres en `../diseno/investigacion-chorrillos.md`.
- **Duración:** 15–20 s, con estos planos:
  1. Plano general de la bahía de Chorrillos con el Morro Solar. El parapente rosado y amarillo baja en diagonal contra el cielo gris; el sol rompe un poco la panza de burro (único rayo de luz del juego hasta ahora).
  2. Plano medio: baja planeando sobre los botes de colores. Las gaviotas se abren.
  3. Contrapicado del aterrizaje heroico en la arena: los pies tocan, se levanta una nube de arena, una rodilla al suelo y la vela cae detrás como una capa. Titina aterriza en su hombro.
  4. Alexander se para y mira al horizonte, con el pelo al viento, en pose heroica cómica: la guitarra a la espalda y el pecho inflado.
- **Después,** el **diálogo con retrato** (`ACH.dialogo.play`, obligatorio):
  - Alexander (cara: feliz): «¡Chorrillos, causa! ¡Aterricé como un campeón!»
  - Alexander (cara: serio): «Ya estoy cada vez más cerca de la ubicación de la cura de esta enfermedad.»
  - Alexander (cara: risa): «¡Aguanta, Lima, que ya llego!»
  - Titina (cara: feliz, si existe): «¡Gurú-gurú!»
- **Primera vez sin saltar.** Ya vista, ESC o ENTER la saltan (como la cima). Guarda `'achorado.cine.chorrillos.v1'` en localStorage, con try/catch.
- **Música heroica:** tema propio en Web Audio dentro de `chorrillos.js` o en `surf.js` (`cv.heroe`). Criollo con guitarra rasgueada y surf rock épico, original.
- Página de prueba: `preview-chorrillos.html` (en `juego/`, tuya).

---

## 8. Música, sonidos y frases (C3)
- **`surf.js`:** reemplaza a `rock.js`, con la **MISMA API pública** que `musica.js`/`rock.js`. Léelos y respeta los moods `explore`, `chase` y `horde`.
  - **Malecón:** surf rock miraflorino (guitarra con trémolo y reverb horneada, bajo, batería surf; brisa de mar).
  - **Larcomar:** algo más de bossa o lounge de centro comercial que se va ensuciando.
  - **Pelea del chef:** rock con escala pentatónica, gong y percusión de wok y cucharón (`cv.chef`).
  - **Caída:** surf épico rápido (`cv.caida`).
  - **Heroico:** `cv.heroe`, si C5 lo pide.
  - Todo **original** y sintetizado con Web Audio, sin samples.
  - API extra para pedir un tema: `ACH.audio.cv.play(id)` / `stop()`, o lo que encaje con la API existente. Documéntalo.
- **`sfx-cv.js`:**
  - olas y viento (ambiente), gaviotas, corneta del heladero;
  - patada a la pelota, rebote, «¡GOOOL!»;
  - zumbido y golpe de la barra fosforescente;
  - helado que se lanza y se aplasta («splat»), lamidas;
  - ladridos de 3 o 4 perros (chico, grande, pug), gemido;
  - flash de selfie, golpe de tabla de surf;
  - palitos (silbido y «toc» al clavarse), dumpling (salto «boing» y mordida «ñam»), gong, wok;
  - viento de parapente, flechita («fiuu» brillante), tabla girando, splash.
  - Mira cómo `sfx-mira.js` registra sus sonidos y copia el patrón.
- **`voces-cv.js`:** frases chalacas cortas con `speechSynthesis`, como `voces-mira.js`:
  - corredores: «¡Un kilómetro más!»;
  - turistas: «¡Selfie, selfie!»;
  - heladero: «¡Heladooos!»;
  - chef: las líneas de §5.1 y «¡Pedido listo!»;
  - Tablazo: «¡Se viene la ola, causa!», «¡Tablazo!».

---

## 9. Fases

| Fase | Trabajo | Modelo | Corre con |
|---|---|---|---|
| C1a | Página, build, nivel.js, mapa, cámara, terrazas, zombies, puntos de control, debug | Opus medium | todas |
| C1b | Chef, dumplings, palitos, borde y parapente | Opus medium | todas |
| C1c | Pelota, barra, helados, heladeros, perritos, vendedores, comidas | Opus medium | todas |
| C2a / C2b / C2c | Arte de malecón, Larcomar y personajes | Sonnet high | todas |
| C3 | Música, sonidos y frases | Sonnet high | todas |
| C4 | Caída: El Tablazo (modo, arte y lógica) | Opus medium | todas |
| C5 | Cinemática de Chorrillos | Sonnet high | todas |
| Q | Integración y QA: ruta completa, rendimiento, peleas, capturas de arte; páginas viejas intactas | Sonnet high | después |

**Hecho cuando:**
1. `sh build-costaverde.sh` genera `dist/costaverde.html`, que abre sin errores en la consola.
2. Se juega del faro a la arena pasando por todos los parques en su orden real.
3. Funcionan las 4 armas nuevas y los vendedores.
4. Se puede ganarle al chef, tirarse en parapente, ganarle al Tablazo y ver la cinemática con el diálogo y el cartel final.
5. `dist/achorado.html` y `dist/miraflores.html` siguen igual (no se tocaron).

---

## 10. Claves de sprites (contrato entre arte y motor)
Todo bajo `ACH.sprites.cv`. Cada sprite lleva `ax`/`ay`; cada prop lleva `ax`/`ay`/`fw`/`fh` (`tall: true` si es alto, `.broken` si se rompe, `lamp` si alumbra). Contorno oscuro de 1 px. **Sin el arte, el motor dibuja un bloque provisorio con el nombre**: el motor nunca se cae por una clave que falta.

### 10.1 `ACH.sprites.cv.malecon` (C2a)
- **tiles** (16×16, arreglos de variantes): `pasto[n]`, `pastoFlor[n]`, `caminoLadrillo[n]` (senderos rojizos), `ciclovia[n]`, `veredaCV[n]`, `adoquinLetonia[n]` (amarillo y rojo), `losa[n]` y `losaLinea[n]` (losa deportiva), `mosaicoPiso[n]`, `pedestalBeso[n]`.
- **props:**

| Grupo | Claves |
|---|---|
| Faro y borde | `faro` (alto), `parapeto` (segmento de 16 px de ladrillo con pilastra), `parapetoPilastra` |
| Mobiliario | `farolCV`, `bancaCV`, `basureroCV`, `bebedero`, `cartelMiraflores` (se rompe) |
| Plantas | `palmeraCV[3]`, `ficusCV[2]`, `setoCV`, `flores[3]` |
| Parque del Amor | `beso` (grande), `muroMosaico[5]` (segmentos con frases), `solMosaico`, `cupido`, `gradaAnfi` |
| Parapuerto | `casetaParapente`, `mangaViento`, `parapenteCaido` (se rompe) |
| Complejo deportivo | `maquinaGym[4]`, `arcoFulbito`, `rejaCancha`, `gradaDeporte` |
| Intihuatana, Letonia y Salazar | `intihuatana`, `totemEspejo`, `pergolaOndulada[2]`, `chimeneaVidrio`, `cabezaCondor` (pileta) |
| Puente | `barandaPuente` |

- **Vista al mar:** `vista = { draw(ctx, camX, camY, t, W) }`, la banda de mar animada y horneada por partes (§2.3). Además `quebradaBalta = { draw(...) }`, la quebrada con el club de tenis.
- **Parapentes del cielo:** `parapenteCielo[4]`, de colores, para el cielo de la vista.

### 10.2 `ACH.sprites.cv.larco` (C2b)
- **Lado tierra:** `ACH.sprites.lotArch.cv_torre` (vidrio teal con franjas doradas), `cv_casona` y `cv_hotel` (con `f.name`, para el JW MARRIOTT), en el mismo formato de lote que usa `render.js` (mira `arte-negocios.js` de Miraflores).
- **`fachada(brand, wTiles) → { cv, ax, ay, lights }`:** la fachada de una tienda en la pared norte de una terraza. Alto: 3 tiles de pared con vitrina, más un letrero.
  - **Marcas** (`brand`) en modo real, con su parodia: nike → NAIK · bananarepublic → BANANA REPÚBLICA · tanta → TANTITA · mangos → MANGAZOS · koasian → K.O. ASIÁTICO · popular → POPULACHO · bonbonniere → LA BOMBONERA · fridays → T.G.I. JUEVES · pardos → PARDOS POLLITO · cinepolis → CINEPOLIZ · hm → H&N · miniso → MINIZO · adidas → ADIDA · starbucks → ESTARBAKS · freddo → FREDO · cinnabon → CINNABUN · salazar → SALAZAR FOOD & DRINKS (lugar real, no es marca: se queda) · haagendazs → HÄGEN-DAZE · masterkong → MASTER KUNG.
  - **Inventadas** (siempre igual): `kiosco` «KIOSCO LARCOMAR», `deportes` «DEPORTES MALECÓN», `fuente` «FUENTE DE SODA», `granDragon` «CHIFA GRAN DRAGÓN» (portón grande rojo y dorado).
  - Lee `ACH.cfg.marcasReales` y vuelve a hornear con `ACH.px.onMarcas` si existe.
- **tiles:** `pisoLarco[n]` (piedra crema), `deck[n]` (madera), `escalera[n]`, `paredRoca[n]` (relleno de la pared de terraza), `pisoChifa[n]`.
- **props:** `barandaVidrio` (segmento), `letreroLarcomar` (grande), `escaleraMecanica`, `macetaLarco`, `sombrillaTerraza` (se rompe), `mesaSalazar` (se rompe), `barCentral`, `farolRojo` (con `lamp`), `mesaRedonda`, `pecera`, `rejaChifa` (portón cerrado y abierto: `.open`), `casetaTandem`, `vaporeraGrande`.

### 10.3 `ACH.sprites.cv.pj` (C2c)
- **Chef:** `chef = { idle[2], alza[2], lanza[3], llama[3], salta[3], cae, sentado[2], hurt, dead }`, ~2.4 veces una persona, mirando de frente (el motor lo voltea).
- **Ataques del chef:**
  - `palito = { vuela, clavado }`;
  - `dumpling = { hop[3], muerde[2], dead }`, `baozi` (lo mismo, más grande);
  - `sombra[3]` (aviso de caída).
- **Perros:** `perro[raza] = { walk: {dir: [4]}, run: {dir: [4]}, bite[2], sit }`, con raza ∈ `chusco`, `salchicha`, `golden`, `pug`, `singpelo`, `husky`. `dir` ∈ `down`, `up`, `left`, `right`: el mismo nombre de direcciones que use Alexander (míralo en `sprites.js`).
- **Heladero:** `heladero = { ride[4], stop }`, con el triciclo amarillo y la sombrilla, de perfil (el motor lo voltea).
- **Vendedores:** `npc.fosfo`, `npc.kioscoLarco`, `npc.deportes` y `npc.fuente`, cada uno `{ idle[4] }`.
- **Zombies:** skins en el formato de `ACH.zvar`:
  - `cv_corredor`, `cv_turista`, `cv_surfista`, `cv_parapentista`, `cv_seguridad`;
  - `cv_trab_<brand>` (para las marcas de 10.2);
  - `pareja = { walk: {dir: [4]}, hurt }`: sprite doble.
- **Objetos:** cada uno con su ícono y su `.big`, en el formato que usen los objetos de `inflables.js`:
  - `pelota`, `pelotaCuero`;
  - `barraFosfo` (4 colores: `barraFosfo_verde`, `_rosado`, `_amarillo`, `_celeste`) y `packFosfo`;
  - `helado`, `paleta`;
  - `chaufa`, `wantan`, `chicha`, `canilleras`.
- **En el mundo:** `pelotaSuelta[4]` (rueda), `barraSuelta[color]` (brilla), `heladoVuelo`, `charcoHelado[2]`.
- **Alexander:**
  - `alexHeld[id][bird|nobird] = { walk: {dir: [4]}, swing: {dir: [3]} }` para `barraFosfo_<color>` y `helado`. Mismo formato que `ACH.sprites.alexInflable` de Miraflores.
  - `alexKick[bird|nobird][dir][2]`: la patadita a la pelota y a los perros.
