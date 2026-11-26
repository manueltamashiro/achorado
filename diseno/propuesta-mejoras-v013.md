# ACHORADO — Propuesta de mejoras (revisión v0.12 → v0.13)

Fecha: 2026-11-20. Revisión de solo lectura del código, los contratos (SPEC, V010, V011, HABILIDADES, MIRAFLORES, COSTAVERDE, CIMA) y las notas de QA. Nada se implementó todavía.
Esfuerzo: **S** = horas · **M** = una tanda de agentes · **L** = fase propia con arte + QA.

---

## Diagnóstico en una frase por área

| Área | Lo que está bien | El problema principal |
|---|---|---|
| Global | Ambientación, diálogos con retrato, árbol de melodías, cuarto, viaje entre páginas | **Muy fácil y sin consecuencias.** H (cuarto) cura al 100 % en cualquier momento, incluso contra jefes; morir no cuesta nada; el dinero casi no sirve; Alexander no se vuelve más fuerte (vida 100, daño 1 de principio a fin). Además no hay CONTINUAR: cerrar la pestaña pierde mochila y sencillos. |
| Gambetta | Mapa muy rico (32 lotes, 20 vehículos, orquesta, noche) | **Es un pasillo de 20 s.** Se cruza corriendo hasta la escalera. No hay sobrevivientes (Doña Charo, Don Eusebio y DJ Fosforito no existen en el código), ni jefe, ni tutorial de la combi. Dura 4–8 min contra los 30–60 del diseño. |
| El Cerro | Verticalidad, señoras con contragolpe, carretillas, escoba/molotov/tele | **La densidad está al revés** (16 enemigos a media altura, solo 4 arriba, 0 en la cima). La escalera recta permite subir en ~40 s. La cima termina vacía y sin clímax. |
| Parque Kennedy | Tiendas reales, jefa justa, inflables y cargables | **El jugador que sigue el camino no ve ni un zombi** (12 oficinistas lejos de la ruta, sin reaparición). La jefa se gana en ~15 s machacando; los contadores (agua, Titina, gatos) no hacen falta. |
| Costa Verde | El nivel más completo: 7 tipos de zombi, 2 jefes, caída libre, cinemática | **Valles largos** (faro, puente, Intihuatana–Letonia casi vacíos). La historia es casi nula: 0 personajes vivos y 0 pistas de la cura en todo el malecón. El abanico de la caída casi no sirve y el chef no da XP. |

---

## A. 5 mejoras globales (experiencia de usuario)

### G1. Guardado real con CONTINUAR — M
- **Qué:** guardar en un solo espacio (`achorado.partida.v1`) la mochila, los sencillos, la vida, el estado de la guitarra, el nivel, el último punto de control, los fans y las muertes. En el título: **CONTINUAR** y **PARTIDA NUEVA** (con confirmación).
- **Por qué:** hoy solo se guardan el árbol y el cuarto. Si cierras la pestaña pierdes el botín, y «ENTER para empezar» siempre arranca una Gambetta nueva. El aviso de «Salir al título» promete que la mochila se queda y no es así (`pausa.js:105` contra `game.js:544`). También quitar del título el botón de prueba «NIVEL 2 (tecla 2)», que regala molotov y resortera.
- **Archivos:** `game.js` (carryState/resetWorld), `inventario.js`, `viaje.js`, `index.html`, `pausa.js`.

### G2. Dificultad con consecuencias, y un selector — M
- **Cuarto (H):** se bloquea durante peleas de jefe y en persecución. La cama cura una sola vez por nivel; después solo descansa el aliento. Hoy se puede entrar con H en plena pelea, dormir y volver con la vida llena (`game.js:314`).
- **Muerte como en el diseño original:** al morir se cae una **bolsa** con el 50 % de los sencillos y la comida en el lugar de la muerte. Si mueres otra vez antes de recogerla, se pierde.
- **Puntos de descanso en la Gambetta,** que hoy no tiene ninguno: bodega, segundo jirón y botica.
- **Selector en opciones:** **Tranqui** (como hoy), **Achorado** (el recomendado: zombis +30 % de daño y bolsa de muerte) y **Bravazo** (zombis +1 de vida, menos comida y noche más dura).
- **Archivos:** `game.js`, `base/base.js`, `entities.js`, `inventario.js`, `world.js`, `pausa.js`.

### G3. Progresión con poder real y dinero que sirve — M
- **Rama pasiva del árbol:** «Cuerpo de combi»: vida +10/+20/+30, aliento +15/+30, y guitarrazo más fuerte (1 → 1,25 → 1,5). Hoy todo el árbol son melodías activas y Alexander termina igual de frágil que al empezar.
- **Taller del cuarto,** como sumidero de sencillos:
  - mochila de 12 → 16 → 20 casillas;
  - guitarra reforzada (+30 de durabilidad);
  - cuerdas de acero (más daño);
  - correa (golpe más rápido).
  - Precios de 15 a 40 sencillos.
- **XP de todos los jefes:** el chef y el Tablazo hoy no dan nada (ninguna llamada a `ACH.hab` en `costaverde/*`). Los jefes nuevos que se proponen abajo también darían XP.
- **Ajuste de números:** con estas fuentes se llega a NV10–11 de 15 al final. Hay que volver a medir el SABOR con los números vigentes, porque el QA midió los viejos.
- **Archivos:** `habilidades.js`, `entities.js:6-9`, `base/base.js`, `base/catalogo.js`, `tienda.js`, `armas.js`, `costaverde/chef.js`, `costaverde/caida.js`.

### G4. Hilo de historia hacia «El gran concierto» — M
- **Objetivo visible:** una línea corta en el HUD («Llega al cerro», «Encuentra a Doña Charo»…) y un **diario** en la pausa con lo vivido y las pistas de la cura.
- **Piezas del concierto:** cada nivel entrega una pieza que se coloca y se ve en el cuarto. Gambetta: el setlist. Cerro: el parlante. Kennedy: el micrófono. Costa Verde: el amplificador. El cuarto se va volviendo la sala de ensayo del final.
- **Pista de la cura en cada nivel:** hoy la cinemática de la cima dice «creo que escuché…» sin que nadie lo haya dicho antes, y Kennedy y Costa Verde casi no la nombran.
- **Archivos:** `hud.js`, `pausa.js`, `base/*`, `catalogo.js`, `dialogo.js` y un gancho por nivel.

### G5. Aprender jugando + menú de opciones — M
- **Tutorial contextual:** cada acción se explica la primera vez que aparece y el aviso se repite hasta que la usas. Ejemplos: el primer carrito explica E, el primer skate explica F, la primera resortera explica R, el primer nivel subido explica K. Hoy todo va en una franja de 10 s que se pierde durante la intro.
- **Intros saltables al rejugar:** se reutiliza la bandera `seen` de la cinemática de la cima. La primera vez se siguen viendo completas, según tu regla.
- **Opciones:**
  - tecla **P** de pausa, porque en pantalla completa Chrome se come el ESC;
  - remapeo de teclas;
  - reducir sacudida y destellos;
  - tamaño de texto, y subir el contraste del gris `#8a8494`;
  - el selector de dificultad de G2.
- **Táctil:** botones de 44 px como mínimo (hoy el de victoria mide 23 px, las tarjetas del mapa 33 px y el VOLVER del árbol 90×18), `?touch=1` que se mantenga entre páginas, y acceso directo al recetario y al cuarto.
- **Archivos:** `hud.js`, `input.js`, `pausa.js`, `tactil.js`, `dialogo.js`, `game.css`, `fx.js`.

---

## B. Nivel 1 — Av. Gambetta

### B1. Los 3 sobrevivientes del cuaderno — M (L con arte)
- **Doña Charo** (Bodega Doña Luz): cántale y te da comida, y aprendes el Huayno del Alivio.
- **Don Eusebio** (patio de contenedores): tráele chatarra, jebe y tablas, y aprendes el Vals. Así el recetario y los materiales cobran sentido en el nivel 1.
- **DJ Fosforito** (atrapado en el último tercio): lo rescatas y aprendes la Cumbia del Mareo.
- **Cómo:** diálogos con retrato. Cada uno **desbloquea** su melodía en el árbol.
- **Decisión tuya:** hoy todas las melodías se compran con K desde el inicio. La alternativa suave es que cada sobreviviente regale un rango gratis.
- **Archivos:** nuevo `js/engine/sobrevivientes.js`, `world.js`, `habilidades.js`, `retratos.js`.

### B2. Mini-jefe «El Chofer» y escalera cerrada — M/L
- **Qué:** la escalera al cerro está tapada con calamina. Al llegar, de noche, aparece **El Chofer**, una combi zombi que embiste por las dos pistas con aviso de bocina y faros.
- **Cómo se le gana:** esquivarlo y castigarlo con la moto o el skate lanzados, o con molotov. Al vencerlo se abre el paso y da XP.
- **Por qué:** el nivel hoy no tiene clímax. Gana una estructura real: sobrevivientes → jefe → escalera.
- **Archivos:** `zombies.js`, `entities.js`, `world.js`, `game.js` (victoria), `sprites/zombies.js`, `sfx.js`.

### B3. Prólogo jugable dentro de la combi — M
- **Qué:** la escena 1 del diseño. Alexander canta y nadie le hace caso, un pasajero se voltea, y ahí mismo se aprende a golpear, correr, usar E y llamar a Titina contra 2–3 zombis lentos. Se sale por la puerta trasera a la avenida.
- **Por qué:** reemplaza la franja de controles de 10 s y le da al juego la apertura que se diseñó.
- **Archivos:** `game.js` (INTRO), nuevo mapa pequeño, `hud.js`, `dialogo.js`.

### B4. Zombis conocidos y objetos con sentido — S
- **Don Lucho cobrador:** un cobrador zombi con nombre (el que bajaba a Alexander de la combi), con una escena tragicómica con retrato. Las melodías lo frenan. Suelta seguro las **llaves de combi**, que hoy no sirven de nada.
- **Las llaves abren la combi volcada del paradero:** cofre con botín y atajo. La **estampita** da +1 vida por muerte evitada, una sola vez.
- **Ojo:** el nombre «Don Lucho» hoy lo usa el cachinero. Renombrar uno de los dos.
- **Archivos:** `entities.js`, `zombies.js`, `inventario.js`, `world.js`, `dialogo.js`.

### B5. Rellenar los rincones vacíos + «pasar la lata» — M
- **Pasajes:** cada uno de los 3 pasajes tiene su mini-escena: un perro herido, el escondite de Uhu, una vecina que pide canción.
- **Azotea sur:** una escalera improvisada lleva a una azotea con botín fijo.
- **Pasar la lata:** tocar una melodía bajo una ventana encendida (las siluetas ya existen) hace que caigan sencillos o comida. Usa el humor de «ahora sí me pagan».
- **Noche como evento:** se corta la luz y llegan «manchas» de 5–6 zombis cada 45 s a la tarima.
- **Archivos:** `world.js`, `social.js`, `interaccion.js`, `noche.js`, `habilidades.js`.

---

## C. Nivel 2 — El Cerro (+ cima)

### C1. Jefa de la cima: «La Presidenta del Comité» — L
- **Qué:** arena en la explanada de la cruz. Con su megáfono llama oleadas de señoras de balde y de olla, lanza un baldazo en abanico y da un ollazo que deja abrir contragolpe. Los cilindros de agua apagan tus molotov.
- **Al vencerla:** se abre la cruz, da XP y hay diálogo con retrato. Ella suelta el rumor de «una cura en Miraflores».
- **Por qué:** hoy la subida termina tocando una cruz en una cima vacía.
- **Archivos:** nuevo `js/engine/presidenta.js`, `world-cerro.js`, `game.js`, `senoras.js`, `voces.js`, sprites.

### C2. Densidad hacia arriba y escalera cortada — M
- **Densidad:** mover ~8 enemigos de la mitad a las filas 10–50, y que la reaparición prefiera puntos por delante de Alexander. Hoy hay 16 a media altura y solo 4 arriba, al revés de lo que pide el SPEC.
- **Escalera:** un **huaico o reja con candado** en 1–2 terrazas medias obliga a tomar el zigzag, que pasa por el basural y el cisterna. Hoy se sube en ~40 s por la escalera recta.
- **Archivos:** `world-cerro.js` (SP, carve), `entities.js` (updateRespawn).

### C3. La olla común y los encargos de Doña Meche — M
- **Olla común pacífica:** si no golpeaste a nadie ahí, con E te dan un plato (+25, nunca cae mal) cada 90 s. Premia no pelear: es el tema de la dignidad del barrio.
- **Doña Meche:** vende **gasolina** (3 sencillos); hoy hay muy poca y el molotov casi no se usa. Además da encargos: «tráeme 3 táperes de la olla» a cambio de un molotov o un mueble.
- **Archivos:** `social.js`, `vendedores.js`, `catalogo.js`, `tienda.js`.

### C4. La radio de la ladera y descansos que se sienten — S
- **Radio:** en una casa de la ladera alta, con E suena un noticiero con estática que menciona la cura en Miraflores, y Alexander reacciona con retrato. Así la cinemática de la cima tiene sentido.
- **Descansos:** el sonido `rest` hoy falta en `sfx.js` y no suena nada. La primera vez que tocas cada descanso curas +20. Cada zona muestra su nombre al entrar («La Losa», «El Basural», «La Placita»).
- **Archivos:** `world-cerro.js`, `interaccion.js`, `audio/sfx.js`, `game.js`.

### C5. Arreglar y enriquecer las mecánicas propias — M
- **Gallinazos:** menos picadas (QA midió ~30 en 2 min en el basural). El retraso pasa de 3–6 s a 5–9 s, y solo uno ataca a la vez. Un **nido** con botín premia espantar 3 con la escoba.
- **Tele:** se puede agarrar abollada (hoy no se puede tras el primer golpe, `armas.js:529`).
- **Carretillas variadas:**
  - una con **balón de gas** que explota con molotov o tele y limpia la escalera;
  - otra que baja justo cuando hay 3 o más zombis en el carril, para hacer chuza.
- **Archivos:** `aves.js`, `armas.js`, `cerro.js`, `fuego.js`.

---

## D. Nivel 3 — Parque Kennedy

### D1. Que el parque tenga vida en la ruta — M
- **Emboscadas:** los 12 oficinistas salen en grupo cuando pasas por Larco o la Diagonal (zonas de disparo en vez de puertas lejanas).
- **Zombis pitucos nuevos en el camino:**
  - **turista con cámara**, cuyo flash aturde 1 s;
  - **jogger** rápido por la ciclovía;
  - **sereno** con silbato que llama a otros.
- **Se respeta tu pedido de «pocos zombis»:** 8–10 encuentros, no una horda. Hoy, siguiendo el camino, son cero.
- **Archivos:** `trabajadores.js`, `mundo.js` (spawns/DOORS), sprites, `voces-mira.js`.

### D2. Doña Chancaca con patrón y personalidad — M
- **Embestida con la carretilla:** la anuncia 0,8 s antes y corre en línea recta. Si la esquivas y choca contra un auto o el cordel, queda aturdida 2 s y recibe daño doble.
- **Números:** vida 20 → 30. La pelea pasa de ~15 s machacando a ~45 s leyendo sus movimientos.
- **Diálogo previo con retrato** («mi masa es receta de mi abuela…») y, al morir, la **pista concreta** que lleva a la Costa Verde.
- **Archivos:** `jefa.js`, `nivel.js`, `sfx-mira.js`.

### D3. Contra-abejas que valgan la pena — M
- **Campana de la Virgen Milagrosa:** con E se toca. Dispersa los enjambres y aturde en 200 px, con enfriamiento de 60 s. El sonido ya existe.
- **Kit anti-abejas** en las tiendas: spray (parodia), repelente, pañuelo.
- **Don Pepe:** mudarlo a la ruta. Hoy está 30 columnas fuera del camino y es el único que vende globos de agua.
- **Por qué:** hoy agua, Titina y gatos sobran porque basta pegar.
- **Archivos:** `mundo.js`, `jefa.js`, `catalogo.js`, `inventario.js`, `inflables.js`.

### D4. Gatos del parque + encargo del pintor — S/M
- **Gatos:** con E se acarician (estaba en el contrato y no se hizo). Al acariciar 5 en el Cat Park, uno se vuelve **compañero**, sigue a Alexander y distrae enjambres. El cartel de victoria lleva el contador «gatos acariciados».
- **Encargo del pintor:** «retrátame 5 gatos» usando a Titina. Paga con un cuadro gratis, para que los vendedores de muebles caros sirvan de algo.
- **Archivos:** nuevo `js/miraflores/gatos.js`, `nivel.js`, `vendedores.js`.

### D5. Pulido visual y noche dramática — S/M
- **Caminos:** con borde irregular pasto/adoquín, hojas moradas de jacaranda y charcos. Hoy son 2 franjas marrón plano.
- **Techos:** variados por lote (teja, calamina, terraza con macetas, gravilla). Hoy son una sola losa gris.
- **Noche:** que anochezca al entrar en la **fase 3** de la jefa («el último picarón»). Hoy la noche llega a los 360 s y casi nadie la ve.
- **Archivos:** `mundo.js`, `arte-negocios.js`, `edificios-casas.js` (roofKit), `nivel.js`.

---

## E. Nivel 4 — Costa Verde

### E1. Romper los valles del malecón — M
- **Evento de media ruta** en Intihuatana–Letonia: el **«turista con dron»**, un mini-jefe que llama parapentistas y marca a Alexander con el flash. Al vencerlo suelta canilleras.
- **Más enemigos en los valles:** en el faro, el puente y Letonia, que hoy tienen 1–3 zombis lentos cada uno.
- **Archivos:** `zombis.js`, `mundo.js`, `arte-personajes.js`.

### E2. Larcomar con tiendas por dentro — M/L
- **Interiores:** 3–4 locales visitables, cada uno una sala pequeña con botín escondido, un arma o un ítem propio, humor y 1–2 zombis encerrados. Ejemplos: el cine, una cafetería, un restaurante.
- **Zombis nuevos:** un **barista** que tira vasos calientes y un **«rey del selfie»** con flash en cadena.
- **Heladero:** que llegue a las terrazas de Larcomar (hoy nunca baja).
- **Archivos:** `mundo.js`, `arte-larcomar.js`, `zombis.js`, `juguetes.js`.

### E3. Gente viva y la pista de la cura — M
- **Qué:** 3 **parapentistas sobrevivientes** varados en el malecón. Cada uno se rescata con una mini-tarea, da una **pista de la cura** con retrato y regala un ítem.
- **Ejemplos de tarea:** espantar a los zombis de alrededor, traerle un helado, o patearle la pelota a un perro que lo tiene acorralado.
- **Por qué:** hoy hay 0 personajes vivos con diálogo en el nivel más largo del juego.
- **Archivos:** `nivel.js`, `mundo.js`, `juguetes.js`, `voces-cv.js`.

### E4. Caída libre más clara y justa — S
- **Abanico:** que de verdad sirva. Hoy, con 9° de apertura, solo pega la flecha central; bajarlo a ~4° o que se ajuste solo.
- **Tutorial de controles:** de 8–10 s (hoy dura 5 s).
- **Modo furioso:** con tope de ×1,1 para que no se vuelva una espiral.
- **Voz del Tablazo:** sus frases ya existen en `voces-cv.js` pero nunca se llaman.
- **Barras fosforescentes:** Don Fosfo avisa antes («brillan en el aire, causa») y el HUD de la caída muestra cuántas llevas (+10 % de daño cada una).
- **Archivos:** `caida.js`, `arte-caida.js`, `voces-cv.js`, `juguetes.js`.

### E5. Perros y juguetes con peso + cámara — S
- **Perros:** con la patadita se vuelven **compañeros por 20 s**. La mordida pasa a 1 por segundo; hoy hacen 1,5 de daño total y no matan ni a un zombi de 2 de vida.
- **Helado:** el congelado dura más contra corredores y vigilantes.
- **Cámara:** que suba en el faro y en El Beso, que hoy salen recortados, y que en los parques muestre más al norte para ver venir a los zombis.
- **Archivos:** `juguetes.js` (DOG), `mundo.js` (camFor).

---

## F. Arreglos rápidos (no cuentan como mejoras; conviene hacerlos de una)

- +3 sencillos en cada llegada a Kennedy/CV aunque traigas carry (farmeable) — `inflables.js` startCoins.
- Falta el sonido `rest` — `audio/sfx.js`.
- ESC/VOLVER desde el mapa de la cima abre una Gambetta nueva sin mochila.
- Doble Enter tras el primer diálogo del cuarto lo saca por la escalera.
- No hay pausa en la cinemática de Chorrillos ni en las secuencias del chef/salto.
- El Vals del Escudo ignora a la jefa, el fuego y las abejas; el muletazo ignora el escudo.
- La carretilla vacía todavía dice «E sacar comida».
- Botón de test «NIVEL 2 (tecla 2)» visible en el título.

---

## Orden recomendado

1. **Tanda 1 (base, barata, cambia la sensación):** F (arreglos) + G2 (dificultad) + G1 (guardado) + E4 + E5 + C4.
2. **Tanda 2 (estructura y progresión):** G3 + G5 + B4 + C2 + D1 + D2.
3. **Tanda 3 (historia y contenido grande):** G4 + B1 + B2 + B3 + C1 + C3 + D3 + E1–E3.
4. **Pulido:** B5, C5, D4, D5.

Decisiones que necesitan al dueño: B1 (¿las melodías se desbloquean por los sobrevivientes o siguen libres en K?), G2 (¿dificultad por defecto «Achorado»?), B4 (renombrar a uno de los dos «Don Lucho»).
