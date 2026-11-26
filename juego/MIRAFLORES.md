# ACHORADO — Nivel 3: Parque Kennedy, Miraflores (contrato del arquitecto)

Pedido del dueño, en resumen:
- Miraflores es el distrito «pituco»: turístico, limpio, gente de todos lados que va a pasear, tomarse fotos y comer.
- El nivel es el **Parque Kennedy** (con el Parque 7 de Junio, que está pegado), lo más fiel posible: la forma de cuña, las palmeras, los árboles y plantas, y **muchos gatos**.
- Alrededor van **Bembos, Starbucks, La Lucha («Don Lucha»), China Wok («China Walk»), Don Belisario, Wong, Ripley, Saga Falabella y Tai Loy**, con su logo y en su orden real.
- En la **rotonda** con asientos está la **zombie picaronera**. Es la **jefa**: no pega, manda **enjambres de abejas** que persiguen al jugador. Aparece **tapando la salida**, que es la **Calle de las Pizzas**.
- Armas: las mismas del Callao, más **juguetes inflables** que venden unos señores afuera de los juegos infantiles.
- Casi sin zombies: solo unos cuantos **trabajadores de los negocios**, más lentos que los demás.
- La música ya no es salsa: es **rock and roll pituco** miraflorino.

**Investigación (manda en forma, orden y colores):** `../diseno/investigacion-miraflores.md`. Léanla entera antes de empezar.

**Arte:** se mantiene la guía `../diseno/revision-estetica.md` y la sección v0.4 de `SPEC.md`:
- 480×270, tiles de 16 px, 1 m = 16 px en el suelo, alturas comprimidas;
- fuentes ACH5/7/12, luz de tarde con garúa y sombras al sureste.

Miraflores se ve **más limpio y con más color** que el Callao: pasto verde, flores rojas y amarillas, adoquín terracota. El cielo sigue siendo panza de burro. Casi no hay sangre ni basura.

**Nota del arquitecto:** en el parque **no hay Virgen del Pilar**. La iglesia es la **Parroquia Virgen Milagrosa** (investigación 2.3). En el juego va como **Virgen Milagrosa**.

---

## 1. Arquitectura: un nivel aparte que reusa el motor

- **Página propia:** `miraflores.html`.
  - Carga los mismos scripts que `index.html`, con dos cambios:
    - `js/engine/world.js` → `js/miraflores/mundo.js`;
    - `js/audio/musica.js` → `js/miraflores/rock.js`.
  - Agrega los archivos de `js/miraflores/`.
  - Su build es `build-miraflores.sh` → `dist/miraflores.html`, con el mismo `awk` de `build.sh`.
  - `index.html` y `build.sh` **no se tocan**.
- **`mundo.js` publica `ACH.world` con la MISMA forma** que `world.js`: todas las claves del objeto final de `world.js`, con sus mismos tipos.
  - Puede agregar claves, pero no quitar ninguna.
  - El suelo del parque se pinta con `W.over[r*COLS+c] = [[tileName, variante], ...]`, que `render.js` ya soporta. Así no hace falta tocar `render.js` para tiles nuevos.
- **Ganchos `ACH.nivel`:** son pocas líneas nuevas en el motor, todas protegidas. Si `ACH.nivel` no existe, la Gambetta funciona exactamente igual. Ver sección 2.
- **Otra sesión (nivel del cerro) está trabajando en los mismos archivos del motor.** Para no pisarla:
  - antes de tocar el motor, se respalda todo `juego/` (menos `dist/`) en `../respaldos/juego-antes-miraflores/`;
  - en archivos del motor, solo **Edit puntual** (nunca reescribir el archivo entero) y releer justo antes de cada edición;
  - si una línea cambió, se adapta, no se pisa.
- Los archivos `js/sprites/*`, `js/audio/*` y `js/engine/*` que no estén en la lista de ganchos **no se editan**. Lo que falte se extiende en tiempo de ejecución desde `js/miraflores/*`, a través de los objetos exportados (`ACH.ent.ZT`, `ACH.zvar`, `ACH.sprites.*`, `ACH.px`, etc.).
- Si algo es imposible sin editar un archivo ajeno, se **reporta**, no se edita.

### Archivos y dueños

| Archivo | Contenido | Dueño |
|---|---|---|
| `miraflores.html`, `build-miraflores.sh`, `js/miraflores/nivel.js`, `mundo.js`, `trabajadores.js`, `inflables.js` | Página, build, ganchos, mapa, zombies trabajadores, tienda, inflables, comidas, monedas de pileta, punto de control | **M1a** (motor, Opus) |
| Ganchos en `js/engine/game.js`, `noche.js`, `render.js`, `entities.js`, `armas.js`, `interaccion.js`, `inventario.js` | Solo las líneas de la sección 2 | **M1a** |
| `js/miraflores/jefa.js` | Picaronera, abejas, miel, barra de jefa, primer encuentro en la rotonda y apertura de la salida | **M1b** (jefa, Opus) |
| `js/miraflores/arte-parque.js` | Tiles y props del parque | **M2a** (Sonnet) |
| `js/miraflores/arte-negocios.js` | Arquetipos de lote (fachadas, logos, iglesia, municipalidad, pizzerías) y marcas real/parodia | **M2b** (Sonnet) |
| `js/miraflores/arte-personajes.js` | Trabajadores zombies, picaronera, carretilla, abejas, vendedores, inflables, comidas, Alexander con inflable | **M2c** (Sonnet) |
| `js/miraflores/rock.js`, `sfx-mira.js`, `voces-mira.js` | Música, sonidos y frases | **M3** (Sonnet) |
| `MIRAFLORES.md` | este contrato | arquitecto |

### Orden de carga en `miraflores.html`

1. `js/miraflores/nivel.js` va **primero**: define `ACH.nivel` y `ACH.mira = { systems: [] }`.
2. Después, sprites: `base.js`, `marcas.js`, `sprites.js`, `calle.js`, … `zombies.js` (los mismos de `index.html`).
3. Arte de Miraflores: `arte-parque.js`, `arte-negocios.js`, `arte-personajes.js`.
4. Audio: `sfx.js`, `rock.js` (en lugar de `musica.js`), `voces.js`, `motor.js`, y luego `sfx-mira.js` y `voces-mira.js`.
5. Motor: `input.js`, `tactil.js`, **`mundo.js` en vez de `world.js`**, `entities.js`, `zombies.js`, `interaccion.js`, `armas.js`, `inventario.js`, `social.js`, `noche.js`, `fx.js`, `render.js`, `hud.js`.
6. `trabajadores.js`, `inflables.js` y `jefa.js`.
7. `game.js`, al final.

**Robustez:**
- Cada archivo de Miraflores tiene que funcionar aunque falten los otros.
  - Si un sprite no existe, se dibuja un reemplazo provisorio legible: bloque de color con su nombre en ACH5.
  - Si falta un sonido, no pasa nada.
- Así los seis agentes trabajan en paralelo.

---

## 2. Ganchos `ACH.nivel` (contrato entre M1a, M1b y el motor)

`nivel.js` define este objeto:

```js
ACH.nivel = {
  id: 'miraflores',
  intro: ['¿Esto es Miraflores? Hasta los muertos se ven pitucos, compadre.',
          'Dicen que por aquí hay una cura... Primero, a la Calle de las Pizzas.'],
  camPeek: false,                       // apaga el «asomarse a la escalera» de la Gambetta (game.js camTarget, col 105)
  noche: { atTime: 360, atX: null },    // anochece a los 6 min; sin disparador por x
  // Despachadores: recorren ACH.mira.systems (cada sistema trae las funciones que necesite) en orden de registro.
  update(G, dt),        // game.js, cada paso fijo con estado 'playing', después de los zombies
  reset(G),             // game.js, al final de resetWorld()
  onRespawn(G),         // game.js, dentro de respawn(), antes de setState
  mood(G) → null | { m: 'explore'|'chase'|'horde', i: 0..1 },     // game.js computeMood: si no es null, manda
  drawables(G, out),    // render.js: empuja { y, draw(ctx, camX, camY) } al orden por y de entidades y props
  drawTop(ctx, G, camX, camY),          // render.js: después de Titina y gallinazos, antes de niebla y luz
  onSwing(G, sw) → n,   // entities/armas: cada golpe cuerpo a cuerpo (sección 2.1)
  onProjectile(G, pr) → bool,           // interaccion/armas/inflables: cada proyectil en vuelo, en cada paso (sección 2.1)
  speedMul(G) → número  // entities.updatePlayer: multiplica la velocidad de Alexander (miel = 0.5); producto de los sistemas
};
```

### Ganchos en el motor

Todos son de una o dos líneas, del estilo `var N = ACH.nivel; if (N && N.update) N.update(G, dt);`. Son los únicos cambios permitidos en el motor.

| Archivo | Gancho |
|---|---|
| `game.js` | `INTRO = (ACH.nivel && ACH.nivel.intro) \|\| [...]`; `camPeek === false` anula el ajuste de la col 105; `update`, `reset`, `onRespawn` y `mood` |
| `noche.js` | Mezclar `ACH.nivel.noche` sobre `CFG`, al cargar o en `reset`. `atX: null` = sin disparador por x |
| `render.js` | `drawables` en el orden por y; `drawTop` |
| `entities.js` | `onSwing` al resolver el golpe (guitarra y puñete); `speedMul` en `updatePlayer` |
| `armas.js` | `onSwing` para los golpes con objeto en la mano. **Tabla extensible de objetos en la mano**: si `armas.js` no exporta su tabla, exportarla (p. ej. `ACH.armas.HELD`) para que `inflables.js` registre los inflables |
| `interaccion.js` | `onProjectile` para las piedras de la resortera |
| `inventario.js` | Solo si no hay forma de registrar objetos nuevos desde fuera: exportar la tabla de objetos (`ACH.inv.ITEMS` o similar) |

### 2.1 Golpes y proyectiles contra la jefa y las abejas

La jefa y los enjambres **no están en `G.zombies`**. Así no cuentan como fans, no dejan cadáver de zombie y no los mueve la IA.

**`sw`** = `{ x, y, ang, range, arc, dmg, knock, kind, bees }`:
- `ang` y `arc` van en radianes;
- `kind` es `'guitar'`, `'punch'` o `'held:<id>'`;
- `bees` es el daño contra enjambres. Si falta, vale `dmg`.

**`onSwing` devuelve:**
- `n > 0`: cuántas cosas golpeó. El motor lo trata como golpe conectado: hitstop, sonido y desgaste.
- `0`: no golpeó nada.
- `-1`: rebotó contra la carretilla. El motor lo trata como golpe contra prop duro, que gasta 2 de guitarra.

**`pr`** = `{ x, y, r, dmg, kind, bees }`, donde `kind` es `'stone'`, `'bubble'` o `'throw:<id>'`. `onProjectile` devuelve `true` si el proyectil se consumió; entonces el motor lo quita.

---

## 3. El mapa (`mundo.js`)

### 3.1 Giro y escala

El motor necesita una avenida de oeste a este, con la manzana de arriba de frente a la cámara. Por eso **la cuña se gira 90° a la izquierda**:

| Realidad | Juego |
|---|---|
| norte (Óvalo de Miraflores) | **oeste**, el inicio |
| sur (Calle Schell) | **este** |
| Av. José Larco (lado este) | **arriba**: manzana norte con fachadas visibles. Ahí están Tai Loy, China Wok, Bembos y Don Belisario, que se leen enteros |
| Av. Diagonal (lado oeste) | **abajo y en diagonal**: baja de izquierda a derecha |

- La cuña queda **angosta a la izquierda** (el vértice del Óvalo) y **ancha a la derecha**.
- La Calle de las Pizzas sale de la Diagonal **hacia abajo**.

**Conversión desde la tabla 2.1 de la investigación** (x hacia el este y y hacia el norte, en metros):
- `col ≈ (200 − y) / 2.2`;
- la fila se reparte entre la vereda del parque del lado de Larco (fila 22) y el borde de la Diagonal, `D(col)`, en proporción a la distancia a Larco.

Es una compresión de ~2,2 m por columna a lo largo y algo más a lo ancho. Se conserva el orden de todo y el ángulo de la Diagonal.

**Tamaño:** **160 columnas × 80 filas** (2560 × 1280 px).

### 3.2 Corte (de arriba hacia abajo)

| Filas | Contenido |
|---|---|
| 0–10 | **Manzana de Larco** (lado `N`, vitrina): fachadas al sur |
| 11–13 | Vereda de Larco, del lado de las tiendas (losetas claras) |
| 14 | Sardinel N |
| 15–19 | Pista de Larco: 3 carriles, sentido al este, raya discontinua |
| 20 | Sardinel S, pintado de **amarillo** |
| 21 | **Ciclovía roja** |
| 22 | Vereda del parque |
| 23 … `D(c)−1` | **Parque** |
| `D(c)` … `D(c)+9` | Avenida **Diagonal**: vereda del parque · sardinel amarillo · pista de 5 filas · sardinel · vereda de los restaurantes (2 filas) |
| `D(c)+10` … 79 | **Manzana de la Diagonal** (lado `S`): azoteas, con letreros de azotea y toldos que se leen desde arriba |

- **`D(c) = 27 + floor(c / 4.2)`**: vale 27 en la col 0, 51 en la col 101 y 64 en la col 159.
- La Diagonal baja **en escalera**, una fila cada ~4 columnas. M2a entrega tiles de esquina para que los escalones se vean como una curva diagonal y no como dientes: `curbDiagA`, `curbDiagB`, `veredaDiag` y `pastoDiag`.

### 3.3 De oeste a este (hitos, col aproximada)

| Col | Larco (arriba, fachadas) | Parque | Diagonal (abajo) |
|---|---|---|---|
| 0–11 | **SAGA FALABELLA** (esquina del Óvalo, 4 pisos, verde lima) | **Inicio:** Óvalo con la pileta grande, cortada por el borde oeste; **pérgola curva salmón** de entrada (col ~3) | café de esquina (genérico) |
| 12–39 | hotel, torre gris de 12 pisos (comprimida a 5), tienda de ropa genérica | Parque 7 de Junio: **Torito de Pucará azul con flores** (36, 27), palmeras en la entrada y a lo largo de Larco | cine genérico; **mesas de ajedrez** en la vereda (col 26) |
| 40–43 | jirón (calle que sale al norte, termina en barricada) | — | — |
| 44–51 | **TAI LOY** | **juegos infantiles chicos** (30, 28), con el vendedor de inflables **Don Tito**. Licencia: en la realidad los juegos están solo en Kennedy | — |
| 52–91 | farmacia genérica (cruz verde), pollo frito genérico, edificios, galería, banco genérico | **Busto de Benavides** con mesas de concreto (46, 30) · **ROTONDA / anfiteatro Chabuca Granda** (57, 35), radio ~4 tiles, 3 gradas concéntricas beige, 6 palmeras alrededor, vasija amazónica (55, 31) · busto Placencia (78, 38) · baños públicos (78, ~42) · **Calle Virgen Milagrosa**, sendero peatonal de adoquín que cruza en diagonal de (86, 23) a (76, D) · pileta chica con mástiles (85, 25) | **LA LUCHA** (Diagonal 308, col 60–66) · **STARBUCKS** (col 67–72) · heladería y sánguchería genéricas |
| 92–98 | **CHINA WOK** | **Iglesia Virgen Milagrosa**, lote dentro de la banda del parque (cols 90–101, filas 25–36, fachada al sur): neocolonial, crema y blanca, con torre. Plazuela al frente, filas 37–39 | — |
| 99–105 | **BEMBOS** | **Municipalidad** (cols 103–116, filas 23–31, fachada al sur, balcones y banderas) · plazuela y busto de Porras (114, 33) | **ENTRADA A LA CALLE DE LAS PIZZAS** (cols 99–102), con arco o letrero encima |
| 106–112 | **DON BELISARIO** («frente a la Municipalidad») | Parque Kennedy: **plaza circular del Mercado de Pulgas** (100, 45), radio 5: toldos de artesanía, cilindros de granito, senderos en asterisco · kiosko de golosinas con sombrilla roja y blanca (95, 44) · busto Quiñones (86, 43) | pizzerías a los dos lados de la calle |
| 113–117 | heladería genérica | **Cat Park** (110, 43): la mayor concentración de gatos, con cajas de cartón · busto de Kennedy (113, 50) · caballetes del **Paseo de los Pintores** en la vereda del parque sobre la Diagonal (cols 108–125) | — |
| 118–121 | jirón (Diez Canseco). Abajo de Larco sigue como **calle peatonal** hasta el parque, entre la municipalidad y las galerías | — | — |
| 122–129 | **LA LUCHA** (local de Larco y Diez Canseco) | galerías y tiendas genéricas (cols 122–145, filas 23–30, fachada al sur, mirando a Kennedy) | — |
| 130–137 | **STARBUCKS** (Larco) | **JUEGOS INFANTILES** de Kennedy (128, 46): columpios, tobogán y sube-baja de fierro. Al lado, el vendedor de inflables **Don Pepe** | — |
| 138–145 | churrería genérica | **pileta chica SO** (136, 57), cerca de la Diagonal | — |
| 146–149 | jirón **Schell**: sale al norte y además baja de Larco a la Diagonal, cerrando Kennedy | — | — |
| 150–159 | **RIPLEY** (4 pisos, gris oscuro, letras serif finas) | **WONG** (supermercado): lote en la banda del parque (cols 150–159, filas 23 … D−1), con la fachada abajo, mirando a la vereda de la Diagonal | azoteas |

**Reglas para esta tabla:**
- Las posiciones son aproximadas. Se ajustan ±3 tiles para que los caminos funcionen y nada se pise.
- **Se conserva el orden.**
- Los negocios que no están en el pedido (KFC, Popeyes, Inkafarma, Topitop, Haití, Pinkberry, etc.) van **genéricos y sin marca real**, para que no compitan con los nueve del pedido.

### 3.4 Calle de las Pizzas (la salida)

- Calle peatonal de 4 tiles (cols 99–102). Baja desde la vereda sur de la Diagonal (fila ~61) hasta el borde del mapa (fila 79).
- A los dos lados, lotes de pizzería (lado `S`, cols 92–98 y 103–109):
  - columnas rojiblancas tipo bastón;
  - **cortinas de luces** colgando sobre la calle (capa alta);
  - toldos marrones y muros verdes;
  - mesas, sillas y atriles con el menú en la calle (props).
- **Arco o letrero «CALLE DE LAS PIZZAS»** sobre la entrada (prop alto, capa alta).
- **Salida:** `inExit(x, y)` es verdadero solo si **la jefa está muerta** (`ACH.mira.jefa && ACH.mira.jefa.dead`) y Alexander está en las filas 74–79, cols 99–102.
- Mientras la jefa vive, su carretilla **tapa** la entrada (filas 59–62). Es sólida.

### 3.5 Vegetación, mobiliario y gatos

- **Palmeras** altas de tronco liso gris claro (datilera o canaria):
  - en fila a lo largo de Larco (fila 22–23, cada ~6 cols);
  - en la pérgola de entrada;
  - alrededor de la rotonda;
  - 2 o 3 **«decapitadas» y secas** cerca de la entrada del Óvalo (la investigación lo menciona).
- **Ficus** grandes de tronco gris retorcido en los dos parques, y **jacarandás** de flor morada.
- **Setos bajos**, **parterres** de salvia roja y cempasúchil amarillo, y rejita negra baja.
- **Caminos** de adoquín en espiga, terracota (#A8735A) y gris (#8A8A8A), de 4–6 m. Bordillos claros (#C9B8A3).
- **Bancas:**
  - de madera con espaldar;
  - muros-banca de piedra beige;
  - cilindros de granito en la plaza circular.
- **Faroles** negros de globo blanco, simples y dobles (son las luces del mapa de luz).
- **Gatos: ~26.**
  - 8 en el Cat Park;
  - el resto sobre el pasto, los muros-banca y las gradas de la rotonda;
  - 3 o 4 en el 7 de Junio.
  - Usa `catSpawns` y los modos que ya existen en `interaccion.js`.
  - **Los gatos les bufan a las abejas** (ver 5.3).
- **Vehículos abandonados**, usando los props que ya existen:
  - ~6 en Larco y ~6 en la Diagonal: autos, taxis y una cúster. Casi ninguna combi: esto es Miraflores.
  - Unos pocos con alarma (`interaccion.js`).
- **Ambiente:**
  - ≤ 1 mancha de sangre por pantalla;
  - poca basura;
  - en vez de gallinazos, pocas palomas (si `birdSpawns` solo tiene gallinazos, poner 2 o 3 nomás).
- **Perros:** 1 o 2 perritos pitucos (`dogSpawns`).
- Una nevera escondida con Inca Kola y Cola Inglesa (`hiddenLoot`), detrás de la iglesia.

### 3.6 Inicio y punto de control

- **Inicio:** col 4, fila ~25, en la pérgola del Óvalo, mirando al este.
- **Punto de control:** cuando Alexander pasa la col 88 por primera vez:
  - toast: «Punto de control: la Virgen Milagrosa te cuida, causa»;
  - `ACH.world.start` se mueve a la plazuela de la iglesia (col ~95, fila ~38). Se muta el mismo objeto, porque `game.js` lee `ACH.world.start` en `respawn`.
  - `reset` lo devuelve al Óvalo.

### 3.7 Debug obligatorio

- `ACH.debug.routeCheck(12)` va del inicio a la salida, **con la jefa marcada como muerta durante la prueba**.
- `spawnCheck()` vacío y `bakeMs < 600`.
- Nuevos: `ACH.debug.mira = { jefa(), killJefa(), bees(), shop(), tp(nombre) }`. `tp` acepta `'rotonda'`, `'iglesia'`, `'pizzas'`, `'juegos'`, `'catpark'`, `'ovalo'` y `'wong'`.

---

## 4. Zombies trabajadores, tienda e inflables (M1a)

### 4.1 Trabajadores (`trabajadores.js`)

- Son lo **único** que hay en el nivel, aparte de la jefa: **12 zombies** y **ninguna reaparición**.
- **Tipo** nuevo en `ACH.ent.ZT.trabajador`: `{ hp: 2, speed: 22, anim: 6, sight: 75, dmg: 8, blind: false, lunge: false }`. Es un 30 % más lento que un caminante. De noche se multiplica igual que los demás.
- **Skins** `trab_<marca>`, con `<marca>` ∈ `bembos, starbucks, lalucha, chinawok, belisario, wong, ripley, saga, tailoy`:
  - los dibuja M2c en el formato de skin de `ACH.zvar`;
  - si no existen todavía, se usa el skin normal con un mandil del color de la marca.
- **Reparto:**
  - 2 en Bembos;
  - 1 en cada uno de Starbucks Larco, Starbucks Diagonal, La Lucha Larco, La Lucha Diagonal, China Wok, Don Belisario, Tai Loy, Wong, Ripley y Saga.
- **«Siguen en su chamba»:** deambulan a menos de ~40 px de la puerta de su local hasta que ven u oyen a Alexander.
  - Al verlo, dicen su frase (sección 6.3).
  - Al morir sueltan la comida de su marca (60 %) o 1–2 `sencillo`.

### 4.2 Comidas y objetos nuevos

Se registran en el inventario; los dibuja M2c. El nombre de la marca sale del registro real/parodia (sección 5.2).

| id | Nombre (modo real) | Efecto | Le cae mal | De dónde sale |
|---|---|---|---|---|
| `hamburguesaBembos` | Hamburguesa Bembos | +20 vida | 10 % | trabajador de Bembos |
| `cafeStarbucks` | Café de Starbucks | aliento lleno y subidón de 15 s | — | Starbucks |
| `sangucheLucha` | Sánguche de La Lucha | +25 | 10 % | La Lucha |
| `polloBelisario` | Pollo a la brasa Don Belisario | +30 | 10 % | Don Belisario |
| `chaufaWok` | Arroz chaufa China Wok | +20 | 15 % | China Wok |
| `cintaTailoy` | Cinta de embalaje Tai Loy | +10 de durabilidad a la guitarra si no está rota («la emparchaste, causa») | — | Tai Loy |
| `picarones` | Picarones con miel | +25 | 15 % («¡Esa miel tenía abeja adentro!») | la jefa (4) |
| Wong · Ripley · Saga | — | sueltan `gaseosa` (Inca Kola), `colaInglesa` rara y `sencillo` (el «vuelto») | — | sus trabajadores |

- **Monedas en las piletas:**
  - E en la pileta del Óvalo, la NE o la SO = sacas 3 `sencillo`, una vez por pileta;
  - frase: «¿Quién tira plata a una pileta en pleno fin del mundo?».
- Alexander **empieza con 3 `sencillo`**.

### 4.3 Vendedores de inflables y tienda

- **Don Tito** (juegos del 7 de Junio) y **Don Pepe** (juegos de Kennedy) son **señores vivos**, no zombies. Llevan un **palo lleno de juguetes inflables**: martillos, espadas, globos genéricos. **Nada de personajes con licencia.**
- **E cerca** abre un panel HTML estilo afiche chicha: «PUESTO DE INFLABLES — DON PEPE».
  - Muestra los 3 productos con su ícono, precio y descripción corta.
  - Se compra con 1–3, con clic o con toque. ESC o E cierran.
  - Sin plata: «Aquí es precio Miraflores, joven».
  - El juego queda en pausa mientras el panel está abierto. Funciona en táctil.
- Lo comprado va a la mochila como objeto **equipable**. Usarlo = tomarlo en la mano (`p.held`).

| id | Nombre | Precio | Golpe en la mano | Contra abejas | Durabilidad | Especial |
|---|---|---|---|---|---|---|
| `martilloInflable` | Martillo inflable | 4 | daño 0.5, alcance 24, arco 130°, empuje 90, enfriamiento 0.28 s | 2 | 30 golpes | **aturde 0.6 s**; chillido «¡piii!» en cada golpe; al acabarse, «¡PUM!», se revienta |
| `espadaInflable` | Espada de globo | 3 | daño 0.4, alcance 30, arco 110°, empuje 50, enfriamiento 0.16 s | 1.5 | 35 | rápida; el golpe suena a globo frotado |
| `pistolaBurbujas` | Pistola de burbujas | 6 | **dispara**: 3 burbujas en abanico de 20°, alcance 110 px, enfriamiento 0.35 s | 1 por burbuja (la abeja queda atrapada en la burbuja) | 40 disparos | contra zombies no hace daño: quedan **embobados** 1.5 s mirando la burbuja |

- **F** = lanzar el inflable.
  - Rebota sin hacer daño. Los zombies a menos de 80 px van a mirarlo 3 s (señuelo silencioso).
  - Se puede volver a agarrar.
- Las burbujas son proyectiles de `inflables.js`. Pasan por `ACH.nivel.onProjectile`, así la jefa recibe las que le tocan a las abejas.
- El golpe de los inflables debe pasar por `ACH.nivel.onSwing`, con `bees` según la tabla.

---

## 5. La jefa: Doña Chancaca, la picaronera (M1b, `jefa.js`)

Es una zombie señora con mandil y pañuelo, cucharón y su carretilla de picarones: paila, hornilla y sombrilla rayada roja y blanca.
- **No pega con las manos.**
- Grita sus pregones: «¡Picarones, picarones calientitos!», «¡Con su miel de chancaca, caserito!».
- Ataca mandando **enjambres de abejas**, que vienen atraídas por la miel.

### 5.1 Primer encuentro: la rotonda

- **Disparo:** cuando Alexander está a menos de 110 px del centro de la rotonda (57, 35), una sola vez por partida. Se reinicia con `reset`.
- Ella está **vendiendo en la grada**.
- Grita, y sale **un enjambre chico** (vida 2, dura 8 s), que sirve de tutorial.
- Toast: «¡Abejas! Pégales, corre o métete al agua».
- A los 4 s empuja su carretilla y se va (sale de pantalla hacia la Diagonal, o desaparece en una nube de abejas).
- Toast: «La picaronera se fue para la Calle de las Pizzas…».

### 5.2 La pelea: tapando la Calle de las Pizzas

**Dónde está y cuándo empieza:**
- Está plantada en la entrada de la calle (~col 100.5, fila 60), con la carretilla sólida delante.
- La pelea arranca cuando Alexander está a menos de 130 px.
- Al arrancar:
  - aparece la **barra de jefa** (HTML chicha arriba al centro, «DOÑA CHANCACA · LA PICARONERA»);
  - sale el stinger `boss.intro`;
  - `ACH.nivel.mood` devuelve `{m: 'horde', i: 1}`;
  - se llama a `musicEngine.setBoss(true)` si existe.

**Vida y defensa:**
- **Vida 24.** Un guitarrazo quita 1.
- **La carretilla la cubre de frente:**
  - los golpes dentro de un arco de 100° frente a ella **rebotan** (`onSwing` → −1, sonido `boss.block`, «¡Clanc!»);
  - ella gira hacia Alexander a 70°/s, así que hay que rodearla;
  - por los costados y por la espalda sí le entra.

**Fritura:**
- Cada 9 s se voltea a la paila **2,5 s** (de espaldas a la cámara, removiendo). Mientras fríe, **le entra de cualquier lado**.
- La paila salpica aceite a menos de 20 px delante de la carretilla: 10 de daño.

**Las fases:**

| Fase | Vida | Enjambres | Extra |
|---|---|---|---|
| 1 | 100–60 % | 1 cada 7 s, máximo 2 a la vez | — |
| 2 | < 60 % | 1 cada 5 s, máximo 3 | **lanza picarones** en arco cada 4 s: 10 de daño, y dejan un **charco de miel** de 6 s que frena a Alexander al 50 % (`speedMul`) |
| 3 | < 25 % | de a 2, máximo 4 | grita «¡Último picarón, casero!»; la fritura baja a 1,8 s |

**La muerte:**
- «¡Se me acabó la masa…!»
- Se desploma y la carretilla queda volteada (prop roto).
- Suelta **4 picarones y 5 `sencillo`**.
- Los enjambres se dispersan.
- `jefa.dead = true` y el arco se ilumina.
- Afiche: «¡LA CALLE DE LAS PIZZAS ESTÁ LIBRE!».
- Stinger `boss.down`, y `setBoss(false)`.

**Si Alexander muere:**
- la jefa vuelve a vida completa y se borran abejas y charcos;
- Alexander despierta en el punto de control.

**Debug:** `ACH.debug.mira.jefa()` (estado), `killJefa()` y `bees()`.

### 5.3 Los enjambres de abejas

- **Cuerpo:** una nube de 10–14 abejas (2–3 px, amarillo y negro) que orbitan un centro con temblor, más puntitos de sombra en el piso. Radio de contacto: 10 px.
- **Vuelan por encima de todo:** ignoran sólidos y solo respetan el borde del mapa. Se dibujan en `drawTop`.
- **Velocidad:**
  - más rápidas que Alexander caminando y más lentas que corriendo (M1b lee las velocidades en `ACH.ent.CFG`);
  - correr las deja atrás, pero gasta aliento.
  - Aceleran y frenan con inercia.
- **Daño:** 5 cada 0,5 s mientras tocan a Alexander. No lo aturden, pero sale la tinta del «picado» y el sonido `bees.sting`.
- **Vida:** 3 por enjambre (2 el del tutorial). Duran 14 s y después se dispersan solas.
- **Golpes:** guitarra 1, puñete 0.5, piedra 1, burbuja 1, inflables según la tabla.
  - Cada golpe deja la nube más rala (menos abejas dibujadas).
- **Cómo librarse** (que el jugador lo descubra, y que los toasts den pistas):
  - **meterse al agua de una pileta**: el enjambre pierde el rastro y da vueltas 3 s;
  - **Titina (Q):** el enjambre que esté más cerca la sigue 4 s;
  - **invisibilidad** (Cola Inglesa);
  - **charcos de miel:** un enjambre que pasa a menos de 30 px de un charco se queda 2 s «comiendo» (carnada);
  - **gatos:** si un enjambre pasa a menos de 18 px de un gato, el gato bufa y le quita 0.5 de vida, y el enjambre se distrae 1 s;
  - alejarse a más de 220 px durante 3 s.

---

## 6. Música, sonidos y frases (M3)

### 6.1 `rock.js`: rock and roll pituco

- **API:** implementa **exactamente la misma API** que `js/audio/musica.js` y se registra en el **mismo lugar** donde `motor.js` busca el motor de música (leer `musica.js` y `motor.js`). La API incluye `start`, `setMood`, `setIntensity`, `stinger`, `setNight`, `night`, `diegetic`, `setListener`, `band`, `stop`, `state` y lo que más use `motor.js`. Agrega `setBoss(on)`.
- **Síntesis:**
  - todo sintetizado con Web Audio y sin samples, realista como `musica.js` (reusar sus técnicas: Karplus-Strong, envolventes, reverb);
  - **guitarra eléctrica limpia con trémolo y reverb de resorte**, bajo, batería con escobillas o palos, **piano boogie**, palmas, saxo (síntesis de caña) y órgano tipo combo de los 60.
- **Composiciones originales.** Nada que se parezca a una canción existente.
- **Mezcla:** pico a −3 dBFS y sin recortes, pareja con la música de la Gambetta.

| Ánimo | Tema | Carácter |
|---|---|---|
| `explore` | «Twist del Malecón» | Rock and roll de los 60 con swing, ~138 bpm, Mi mayor. Guitarra twang que lleva la melodía, bajo caminante, escobillas, piano boogie y chasquidos de dedos. La intensidad suma saxo y un coro de «uuh-uh» sintetizado |
| `chase` | «Corre, pituco, corre» | ~172 bpm, recto, La mayor. Riffs de guitarra en dobles cuerdas, bajo a corcheas, backbeat fuerte, glissandos de piano y bocinazos de saxo |
| `horde` | «Picarones de fuego» | Rock garaje, ~150 bpm, Mi menor. Guitarra con fuzz, órgano combo, toms y pandereta |
| jefa | — | Con `setBoss(true)`, sobre el `horde` entra un **motivo de la jefa**: un riff cromático descendente «pegajoso como miel» y un pregón de órgano |
| noche | — | `setNight`: más lento y con más reverb, órgano de salón, lo mínimo |

- **Stingers:**
  - `kill`, `hurt`, `horde`, `death` (los mismos nombres de siempre);
  - `win`, como un final de rock and roll: acorde de séptima, golpe de batería y la última nota que se queda sonando;
  - `boss.intro` y `boss.down`.

### 6.2 `sfx-mira.js`: sonidos nuevos

Se registran **sin editar `sfx.js`**: hay que mirar cómo despacha `ACH.audio.emit`. Si no se puede extender, se reporta.

- **Abejas:** `bees.spawn`; `bees.loop`, un zumbido en bucle, posicional y con volumen según cuántas abejas quedan; `bees.sting`, `bees.hit`, `bees.die`.
- **Jefa:** `boss.yell`; `boss.fry`, chisporroteo en bucle; `boss.throw`, `miel.splat`; `boss.block`, un clanc de lata; `boss.hurt`, `boss.down`.
- **Tienda:** `shop.open`; `shop.buy`, caja registradora; `shop.nomoney`.
- **Inflables y piletas:** `inflable.swing`; `inflable.hit`, un chillido de juguete; `inflable.pop`, globo que revienta; `burbujas.shot`, `burbujas.pop`; `pileta.coins`, monedas en el agua.
- **Ambiente:** las **campanas de la iglesia** cada ~90 s y posicionales; el murmullo de las piletas; palomas zureando; maullidos y bufidos de los gatos (reusar los que ya existen si hay).

### 6.3 `voces-mira.js`: frases

Se registran en el sistema de `voces.js` (speechSynthesis) **sin editarlo**: mirar su API. El tono es peruano limeño, con humor y sin groserías.

**Pregones de la jefa:**
- «¡Picarones, picarones calientitos!»
- «¡Con su miel de chancaca, caserito!»
- «¡Pruebe, pruebe, no sea tímido!»
- «¡Último picarón, casero!»
- «¡Se me acabó la masa…!»

**Trabajadores** (uno o dos cada uno; frases típicas del oficio, sin eslóganes con marca registrada):

| Trabajador | Frases |
|---|---|
| Bembos | «¿Lo agrandamos?» |
| Starbucks | «¿Su nombre para el vaso?» |
| La Lucha | «¿Chicharrón o lechón, casero?» |
| China Wok | «¿Para llevar o para comer aquí?» |
| Don Belisario | «¿Un cuarto con papas?» |
| Wong | «¿Tiene su tarjeta de puntos?» |
| Ripley / Saga | «¿Desea sacar la tarjeta?», «Tenemos ofertas…» |
| Tai Loy | «Útiles escolares, joven» |

**Vendedores:**
- «¡Martillos, espadas, burbujas! ¡Pa' los chiquitos y pa' reventar muertos!»
- «¡Gracias, joven, vuelva pronto!»

**Alexander:**
- «¿Esto es Miraflores? Hasta los zombies se ven pitucos.»
- «¡Abejas no, abejas no!»
- «Michi, michi… tú no muerdes, ¿no?»
- «Aquí hasta la miel es de marca.»

---

## 7. Arte (M2): claves del contrato

**Reglas para todo el arte:**
- Cada sprite lleva `ax`/`ay` y cada prop `ax`/`ay`/`fw`/`fh` (`tall: true` si es alto, `.broken` si se rompe).
- Contorno oscuro de 1 px en personajes y props.
- **Logos:** en modo real (`ACH.cfg.marcasReales`), aproximación en pixel art del logo y los colores reales (investigación, sección 5). En modo parodia, el mismo color con el nombre cambiado (tabla 7.2).

### 7.1 `arte-parque.js` (M2a): `ACH.sprites.tiles.*` y `ACH.sprites.props.*`

**Tiles** (16×16, con variantes en arreglo):
- pasto: `pasto[n]`, `pastoFlor[n]`;
- adoquín y losetas: `adoquinEspiga[n]` (terracota y gris), `adoquinGris[n]`, `veredaMira[n]` (losetas claras);
- ciclovía y bordes: `ciclovia[n]` (roja), `bordilloAmarilloN`, `bordilloAmarilloS`;
- esquinas de la Diagonal en escalera: `curbDiagA`, `curbDiagB`, `veredaDiag`, `pastoDiag`;
- `pisoRotonda[n]`.

**Calcomanías grandes** (lienzo, en `ACH.sprites.mira.decals`):
- `plazaCircular` (r 5 tiles, con los senderos en asterisco);
- `rotonda` (piso con 3 anillos de grada; las gradas sólidas van como props en segmentos);
- `virgenMilagrosaSendero`.

**Props:**

| Grupo | Claves |
|---|---|
| Palmeras y árboles | `palmera[3]`, `palmeraSeca`, `ficus[2]`, `jacaranda` |
| Plantas | `seto`, `parterreRojo`, `parterreAmarillo`, `rejita` |
| Asientos | `banca` (madera), `muroBanca`, `cilindroGranito` |
| Faroles | `farolGlobo`, `farolGloboDoble`. Llevan `lamp` como los postes: mirar cómo `render.js` arma las luces desde los props |
| Piletas | `piletaOvalo` (grande, cortada al borde; agua animada en 3 cuadros), `piletaChica` (agua animada). Cada una lleva `water: {x, y, r}` en px relativos, para que la jefa sepa dónde está el agua |
| Rotonda | `gradaRotonda[4]`: 4 cuartos de anillo, sólidos, para sentarse |
| Esculturas | `toritoPucara` (azul con flores), `busto` (pedestal genérico, con `name`), `vasija`, `mastilBandera` |
| Juegos infantiles | `columpio`, `tobogan`, `subeBaja` |
| Feria y vereda | `toldoFeria[3]`, `caballetePintor[3]`, `mesaAjedrez`, `kioscoGolosinas` (sombrilla roja y blanca), `basureroMira` |
| Gatos y entrada | `cajaGatos`, `pergolaSalmon` (pérgola curva de concreto de la entrada; alta, con capa alta) |
| Calle de las Pizzas | `arcoPizzas` (letrero «CALLE DE LAS PIZZAS»), `cortinaLuces`, `mesaPizzeria`, `atrilMenu` |

### 7.2 `arte-negocios.js` (M2b): arquetipos de lote

Registra `ACH.sprites.lotArch.*`:
- `mf_tienda`, con la ficha `f.brand` ∈ `bembos, starbucks, lalucha, chinawok, belisario, wong, ripley, saga, tailoy`;
- `mf_generico`, con `f.giro` ∈ `farmacia, polloFrito, ropa, banco, heladeria, churreria, cafe, cine, galeria, hotel, sangucheria`;
- `mf_torre` (edificio moderno de 6–12 pisos, comprimido);
- `mf_iglesia` (Virgen Milagrosa: neocolonial, crema y blanca, torre, portón de madera);
- `mf_muni` (Municipalidad: neocolonial, balcones de madera, banderas);
- `mf_pizzeria`, `mf_banos`.

**Los dos lados de cada arquetipo:**
- **Lado `N`:** fachada completa con logo, toldo, vitrinas y luces en `lights`.
- **Lado `S`** (la Diagonal):
  - azotea con **letrero de azotea mirando a la cámara**, con el logo;
  - **toldos que se ven desde arriba con el logo impreso**;
  - sombrillas de terraza.
  - Así La Lucha y Starbucks de la Diagonal también se reconocen.

**Marcas:**
- Si `marcas.js` no tiene API para registrar marcas, se lleva una tabla propia en `ACH.mira.marcas`. Lee `ACH.cfg.marcasReales` y escucha `ACH.px.onMarcas`.
- **Parodias:** BEMBOS → BOMBOS · STARBUCKS → ESTARBAKS · LA LUCHA → LA LUCHITA · CHINA WOK → CHINA WAK · DON BELISARIO → DON BELICOSO · WONG → WANG · RIPLEY → RIPLAY · SAGA FALABELLA → SAGA FALABOLA · TAI LOY → TAI LOI.

**Colores** (investigación 5.1):

| Marca | Colores |
|---|---|
| Bembos | azul #1100CF, amarillo #FFB500 |
| Starbucks | verde #00704A |
| La Lucha | carbón, letras blancas y banderitas peruanas |
| China Wok | rojo #E30613, verde #1F862C, ícono de wok |
| Don Belisario | rojo #E5133A, gallo |
| Wong | rojo #EC1C24 |
| Ripley | gris oscuro #333, serif fino |
| Saga Falabella | verde lima ~#8DC63F |
| Tai Loy | verde #00A160 |

### 7.3 `arte-personajes.js` (M2c)

| Qué | Claves y detalle |
|---|---|
| **Trabajadores zombies** | Skins `trab_<marca>` en el formato de `ACH.zvar` (leer `js/sprites/zombies.js`). Uniformes propuestos en la investigación 5.2: gorra o visera, polo y mandil con los colores de la marca; Ripley y Saga con terno o chaleco de vendedor |
| **Picaronera** | `ACH.sprites.mira.picaronera = { idle[2], grita[2], frie[3] (de espaldas, removiendo), lanza[3], camina[4], hurt, dead }`. Escala ~1,15 veces una persona, mandil, pañuelo, cucharón. Mira de frente; el motor la voltea |
| **Carretilla de picarones** | `carretillaPicarones = { ok, broken }`, ~2,2 m: paila, hornilla, sombrilla rayada roja y blanca, cartel «PICARONES» |
| **Abejas y miel** | `abeja[2]` (2–3 px), `charcoMiel[3]` (decal), `picaron[2]` (proyectil) |
| **Vendedores** | `vendedor = { idle[4] }`, señor vivo con gorra y el **palo de inflables**; dos variantes de color, para Don Tito y Don Pepe |
| **Inflables** | Ícono `.big` para la mochila y la tienda de `martilloInflable`, `espadaInflable` y `pistolaBurbujas`. `burbuja[3]` (vuela y revienta) |
| **Alexander con inflable** | `ACH.sprites.alexInflable[toyId][bird\|nobird] = { walk: {dir: [4]}, swing: {dir: [3]} }`, con los mismos tamaños y anclas que `walk`/`attack`. Se compone sobre los cuadros «sin guitarra» de Alexander (`g3`, si existen) |
| **Comidas** | Ícono y `.big` de cada objeto de la tabla 4.2 |

---

## 8. Pantallas (M1a, en `miraflores.html`)

- **Título:**
  - kicker «PARQUE KENNEDY · MIRAFLORES»;
  - ACHORADO, con el mismo subtítulo;
  - un renglón: «Nivel: Miraflores, el distrito pituco».
- **Victoria:**
  - «¡LLEGASTE A LA CALLE DE LAS PIZZAS!»;
  - estadísticas: tiempo, fans y muertes, más «gatos acariciados» si existe la cuenta (si no, se omite);
  - «ENTER para jugar de nuevo».
- **Panel de la tienda y barra de la jefa:** con el estilo chicha de `css/game.css`. El CSS extra va en un `<style>` dentro de `miraflores.html`, o en `css/miraflores.css` (de M1a).
- El hint de controles agrega: «E comprar/agarrar».
- **Más adelante:** el mapa de distritos (`CIMA.md`, de otra sesión) abrirá `miraflores.html`. No se toca ahora.

---

## 9. Fases

| Fase | Trabajo | Modelo | Corre en paralelo con |
|---|---|---|---|
| M1a | Página, build, ganchos, mapa completo, trabajadores, tienda, inflables, comidas, punto de control y debug | Opus medium | M1b, M2a–c, M3 |
| M1b | Jefa y abejas (contra los ganchos de la sección 2) | Opus medium | todos |
| M2a / M2b / M2c | Arte de parque, negocios y personajes | Sonnet high | todos |
| M3 | Rock, sonidos y frases | Sonnet high | todos |
| Q | Integración y QA (`routeCheck`, `spawnCheck`, rendimiento a 60 fps, pelea completa, Gambetta intacta) y revisión de arte con capturas | Sonnet high | después |

Nada se publica sin QA.

**Hecho cuando:**
1. `sh build-miraflores.sh` genera `dist/miraflores.html`, que abre sin errores en la consola.
2. Se puede jugar del Óvalo a la Calle de las Pizzas: la jefa en la rotonda, la tienda, los inflables, la pelea, y ganar.
3. `dist/achorado.html` (Gambetta) sigue funcionando igual.
