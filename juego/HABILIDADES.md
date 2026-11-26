# ACHORADO v0.11: la guitarra despierta — XP, niveles y árbol de melodías (contrato del arquitecto)

## Lo que pidió el dueño
1. **Después de matar a la picaronera** (Doña Chancaca, jefa de Miraflores), Alexander empieza a **ganar XP matando zombies**. Al subir de nivel gana **puntos** para un **árbol de habilidades**.
2. El árbol empieza por la **guitarra con poderes**: tocar **melodías** con efectos sobre los zombies y sobre él mismo:
   - una que **lo cura**;
   - una que **debilita** a todos los zombies que la escuchan (1 o 2 puntos);
   - una para que **los golpes le lleguen por una sola dirección** (escudo frontal de sonido);
   - una que **vuelve lentos** a los zombies en el radio donde se escucha;
   - **casi muerto y con la guitarra recargada**: una **onda expansiva de notas** que **empuja** a los zombies cercanos.
3. Cada habilidad admite **hasta 3 puntos** que suben su intensidad.

## Decisiones del arquitecto (resumen)
- **Desde el inicio (cambio del dueño).** XP, SABOR, el árbol y las melodías están disponibles **desde que empieza el juego** (Gambetta, Cerro, Miraflores, cualquier página). No hay desbloqueo: el estado arranca en **nivel 1, 1 punto, sabor 40**.
- **Pista de la primera vez.** Sin partida guardada y con puntos sin gastar, apenas termina la intro del nivel sale un diálogo corto con retrato que dice «Aprieta K». Una sola vez (bandera `pista`).
- **La picaronera premia.** Al morir la jefa (`ACH.mira.jefa.dead`): destello, notas y diálogo con retrato; **+150 XP y sabor lleno**, una vez por partida guardada (bandera `jefaPremio`).
- **Recurso nuevo: «SABOR»** (la carga de la guitarra), de 0 a 100. Las melodías lo gastan. Se llena pegando y matando con la guitarra, y despacio solo.
- **Sin guitarra** (rota, `p.guitar.dur <= 0`, o con un arma en la mano si el motor no permite) **no hay melodías**. Aviso «¡Sin guitarra no hay sabor, causa!».
- Todo vive en un **módulo nuevo** con ganchos protegidos (`if (ACH.hab && ACH.hab.x)`). Si el módulo falla o no está, el juego sigue igual que v0.10.
- **No se toca `js/miraflores/*`.** El premio de la jefa se detecta sondeando `ACH.mira.jefa` desde `ACH.hab.update`.

## XP y niveles
- Cuenta desde el inicio del juego. (El campo `despierta` queda por compatibilidad, siempre `true`; las partidas viejas con `false` se migran conservando xp y rangos.)
- **XP por muerte** (en `hitZombie` al morir, por `z.type` y marcas):
  | zombie | XP |
  |---|---|
  | escolar | 5 |
  | caminante, cobrador | 8 |
  | ciego | 12 |
  | señoras (olla/balde) y los de vehículo/carretilla (`z.punch3` o `zvar` con escudo) | 15 |
  | cualquier otro | 8 |
  | gallinazo muerto (`ACH.aves` stats.killed sube) | 3 |
  | **la jefa picaronera** | 150 (premio, una vez) |
- **Umbral para subir del nivel L al L+1:** `40 + 20 × (L − 1)` XP (40, 60, 80, …, 300; 2380 en total para NV15; balance tras la QA). Nivel máximo **15** (= 15 puntos = árbol completo). La XP sobrante pasa al siguiente.
- **Al subir de nivel:** texto flotante grande «¡SUBISTE DE NIVEL!» en chicha, sonido corto (acorde ascendente) y toast «+1 punto · K para el árbol». Nunca pausa el juego.

## SABOR (carga de la guitarra)
- Máximo 100. Empieza en 40 en una partida nueva; se guarda. El premio de la picaronera lo llena.
- **+4** por golpe de guitarra que conecta a un zombie, **+10** por muerte con la guitarra (Lamento y Rasgueo cuentan como guitarra), **+3** por muerte con cualquier otra cosa, **+0,8/s** pasivo (balance tras la QA: el sabor tiene que pesar).
- La barra se ve en el HUD bajo la de aliento, color chicha (rosado → amarillo cuando está llena, con brillo).

## El árbol (5 melodías, 3 rangos cada una)
Raíz: **GUITARRA DESPIERTA** (gratis, desde el inicio). Ramas:
```
                 GUITARRA DESPIERTA
                /                  \
   HUAYNO DEL ALIVIO (cura)     CUMBIA DEL MAREO (lentos)
          |                            |
   VALS DEL ESCUDO (frontal)    LAMENTO CHALACO (debilita)
                \                  /
               EL ÚLTIMO RASGUEO (onda expansiva)
```
- Requisitos: Alivio y Mareo libres. Escudo pide Alivio ≥ 1. Lamento pide Mareo ≥ 1. Rasgueo pide Escudo ≥ 1 **o** Lamento ≥ 1.
- Un punto en una melodía sin rango la **aprende**; los siguientes suben su rango hasta 3.
- **Reiniciar el árbol:** botón «DEVOLVER PUNTOS» en la pantalla del árbol (gratis por ahora, para que el dueño pruebe).

### Tabla de efectos (rango 1 / 2 / 3)
| melodía | tecla | sabor | enfriamiento | efecto |
|---|---|---|---|---|
| **Huayno del Alivio** | Z | 40 | 10 s | Cura **20 / 30 / 45** de vida repartida en lo que dura la melodía (1,6 s). Notas verdes brillantes suben de Alexander y lo envuelve un brillo verde suave mientras cura. |
| **Cumbia del Mareo** | X | 35 | 12 s | Zombies en radio **72 / 88 / 104 px**: velocidad **−35 % / −50 % / −65 %** durante **5 / 6,5 / 8 s**. Se tambalean y les sale una espiral (≈8 px) sobre la cabeza. |
| **Vals del Escudo** | V | 45 | 16 s | Durante **5 / 8 / 11 s** solo le llegan golpes **por la espalda**: todo daño que venga del **frente** (cono de **140° / 160° / 180°** hacia donde mira) se anula con un «¡CLANG!» de notas y empuja al atacante 24 px. En rango 3 además lo aturde 0,8 s. Se ve un arco dorado de pentagrama delante de él. |
| **Lamento Chalaco** | B | 60 | 18 s | Todos los zombies que lo escuchan (radio **64 / 96 / 112 px**) pierden **1 / 1 / 2** de vida (puede matarlos; cuenta como muerte con la guitarra para XP/sabor). Rango 2 y 3: además pegan un **50 % menos** durante 6 s. Ondas moradas. |
| **El Último Rasgueo** | G | **100 (todo)** | 30 s | **Solo si la vida < 25 % y el sabor está lleno.** Onda expansiva de notas: radio **60 / 85 / 110 px**, empuje **80 / 110 / 140 px**, aturde **1 / 1,5 / 2 s**; rango 3 también quita 1 de vida. Sacude la cámara y hace un destello. Cuando está disponible, su icono late en el HUD y Alexander dice «¡Ahora sí, mi última canción!». |

- **Tocar una melodía:** Alexander queda en pose de rasgueo 0,6 s (no ataca, camina al 50 %), sale la melodía sintetizada (cada una dura **≤ 1,8 s**, así casi no se pisan) y luego el efecto. Las melodías no se pueden encadenar entre sí (enfriamiento global de 1,2 s).
- **Con la jefa de Miraflores** (si se vuelve a jugar el nivel): Mareo y Lamento no la afectan; solo a zombies normales. Las abejas: Mareo las ralentiza si es fácil hacerlo vía `ACH.nivel`; si no, se ignoran.
- El escudo funciona en `hurtPlayer`: necesita la posición del atacante. Si la llamada no trae origen (`opts.from` o el zombie), el escudo **no** bloquea (prudente).

## Controles
- **K** abre/cierra la pantalla del árbol (pausa el juego, como la mochila). Clic en un nodo = gastar punto. ESC o K cierra.
- **Z, X, V, B, G** tocan las melodías (comprobar que no chocan con teclas ya usadas: E, F, Q, R, C, I, Tab, Space, Shift, 1–4, WASD).
- **Táctil:** botón **«MELODÍA»** a la derecha (junto a GUITARRAZO/TITINA/RESORTERA): tocar = toca la melodía elegida; mantener 0,4 s = abre un abanico con las melodías aprendidas para elegir. Botón **«ÁRBOL»** arriba junto a MOCHILA desde el inicio; **«MELODÍA»** aparece cuando ya hay al menos una melodía aprendida.

## HUD
- Desde el inicio: chapa **«NV 3»** + barra fina de XP bajo la vida; barra de **SABOR**; fila de **íconos de melodías aprendidas** (abajo, encima de la mochila) con su tecla, enfriamiento como reloj que se vacía y gris si falta sabor. Si hay puntos sin gastar, la chapa NV parpadea con «+1».

## Pantalla del árbol (estilo afiche chicha, como los menús)
- Fondo negro, letras fluorescentes rosado/amarillo/verde, tipografía de los menús existentes.
- Nodos como discos/notas conectados por cuerdas de guitarra. Cada nodo: nombre, 3 puntitos de rango, efecto del próximo rango, costo en sabor y enfriamiento. Bloqueados en gris con el requisito.
- Arriba: nivel, barra de XP («120 / 150 XP»), puntos disponibles. Abajo: «DEVOLVER PUNTOS» y «K / ESC — VOLVER».

## Pista de la primera vez y premio de la picaronera
- **Pista:** si no había partida guardada (`localStorage` vacío para esta clave), `pista` es falso y hay puntos sin gastar, ~0,8 s después de empezar a jugar (ya terminada la intro del nivel, nunca durante otro diálogo o cinemática) sale `ACH.dialogo.play`:
  - (sorpresa) «Oe... la guitarra suena distinto desde que empezó todo esto.»
  - (habla) «Aprieta K: creo que me salen canciones con poder.»
  Se marca `pista = true` y se guarda: nunca se repite.
- **Premio:** `ACH.hab.update(G, dt)` mira cada paso `ACH.mira && ACH.mira.jefa && ACH.mira.jefa.dead`. Si `jefaPremio` es falso: espera ~1,2 s, destello + notas que rodean la guitarra + sonido de «cuerdas que despiertan», y luego `ACH.dialogo.play` con retrato:
  - (sorpresa) «¿Qué fue eso? La guitarra está vibrando sola...»
  - (risa) «¡La picaronera me dejó con sabor, causa!»
  - (habla) «Siento que mis canciones pegan más fuerte.»
  Al cerrar: +150 XP (puede subir de nivel), sabor 100, `jefaPremio = true`, se guarda.
- Respaldo: si al cargar una página `ACH.viaje.progress().miraflores` es verdadero y `jefaPremio` es falso, el premio se da en silencio.

## Persistencia
- `localStorage['achorado.habilidades.v1'] = { v:1, despierta (siempre true), xp, nivel, puntos, rangos:{alivio, mareo, escudo, lamento, rasgueo}, sabor, pista, jefaPremio }`, con try/catch y en memoria si no hay almacenamiento.
- Además viaja en `carryState()` (`carry.hab`) y se restaura en `restoreState` si viene, para que pase de página aunque no haya almacenamiento.
- Se guarda al subir de nivel, al gastar puntos, con la pista, con el premio y cada 10 s.

## Pruebas (debug)
- `?hab=1` en la URL (nivel 15, sabor 100, sin guardar) o `ACH.debug.hab({nivel:15, sabor:100, rangos:{…}, cd:0, pista, jefaPremio})` fija valores para probar. `ACH.debug.hab.jefa()` lanza el premio de la picaronera.
- `ACH.debug.hab.info()` → estado completo. `ACH.debug.hab.cast('alivio')` toca sin tecla.
- `ACH.hab.reset()` borra todo.

## Archivos
| archivo | qué |
|---|---|
| `js/engine/habilidades.js` (NUEVO) | `ACH.hab`: estado, XP, árbol, melodías, efectos, pista de la primera vez, premio de la jefa, persistencia, HUD propio dibujado en `ACH.drawHooks.screen` o DOM, pantalla del árbol (DOM) |
| `js/audio/melodias.js` (NUEVO) | 5 melodías originales cortas sintetizadas (guitarra punteada Karplus-Strong o como lo haga `sfx.js`), más «subir de nivel» y «despertar». Funciona en las dos páginas (no depende de `musica.js` ni `rock.js`). Sin melodías reales ni riffs reconocibles. |
| `css/habilidades.css` (NUEVO) o dentro de `css/game.css` | estilos del árbol y del HUD si van en DOM |
| `js/engine/entities.js` | ganchos: en `hitZombie` al morir → `ACH.hab.onKill(G, z, src)`; golpe de guitarra que conecta → `ACH.hab.onHit`; en `hurtPlayer` → `ACH.hab.filterHurt(G, dmg, opts)` que puede devolver 0 (escudo) o el daño reducido; lentitud → multiplicador de velocidad del zombie (`z.habSlow`) donde se calcula su movimiento; debilitado → `z.habWeak` multiplica su daño. |
| `js/engine/game.js` | `ACH.hab.update(G, dt)` en el bucle de juego; teclas; `carry.hab` en `carryState`/`restoreState`; K pausa como la mochila. |
| `js/engine/tactil.js` | botones MELODÍA y ÁRBOL (solo si `ACH.hab.despierta`). |
| `index.html`, `miraflores.html` | `<script>` de `melodias.js` (después de `sfx.js`) y de `habilidades.js` (antes de `game.js`), y el CSS. |
| `build.sh`, `build-miraflores.sh` | revisar que incluyan los archivos nuevos (si leen la lista del HTML, ya está). |

## Criterios de aceptación
1. Desde el inicio (partida nueva, en cualquier página) se ve el HUD de NV/XP/SABOR, K abre el árbol con 1 punto y matar zombies da XP (Gambetta, Cerro y Miraflores). La pista con retrato sale una sola vez, después de la intro.
2. Matar a la jefa en Miraflores lanza el diálogo con retrato y da +150 XP y sabor lleno, una sola vez por partida guardada.
3. Cada melodía funciona en sus 3 rangos según la tabla (medido con `ACH.debug.hab`).
4. El Último Rasgueo solo se puede con vida < 25 % y sabor 100.
5. El estado sobrevive a recargar la página y al viaje Miraflores → mapa → Gambetta.
6. Sin guitarra no hay melodías. Las melodías no rompen la mochila, las armas de calle ni el táctil.
7. Ningún error en consola en las dos páginas; las dos se construyen con sus `build*.sh`.

## Coordinación con la sesión «Kennedy Park nivel mejoras» (trabaja a la vez en juego/)
- **No tocar NUNCA:** js/engine/armas.js, inventario.js, interaccion.js, render.js, viaje.js, world.js, world-cerro.js, js/cine/cima.js, js/miraflores/*, ni sus nuevos (tienda.js, vendedores.js, pausa.js, js/base/*, items-v011.js, css/tienda.css, pausa.css, base.css).
- **Compartidos:** game.js, index.html, miraflores.html → solo ediciones pequeñas con Edit (reemplazo exacto), volver a leer justo antes de editar, nunca reescribir el archivo con Write, no reordenar sus etiquetas <script>/<link> (las nuestras van después de las suyas y antes de game.js).
- **Nuestros:** entities.js, hud.js, input.js, tactil.js y los archivos nuevos de este contrato.
- **ESC:** la otra sesión pone un menú de pausa (pausa.js). Si el árbol está abierto, ESC lo cierra y consume la tecla (no abre la pausa). Si existe `ACH.pausa.addItem`, añadir `{id:'arbol', label:'ÁRBOL DE MELODÍAS (K)', onClick: abrir árbol}` solo cuando `despierta`.
- Si hace falta dibujar algo en el mundo (ondas, notas, arco del escudo), usar `ACH.drawHooks` (ground/ysort/air/screen) desde habilidades.js, no editar render.js.

## Integración (sesión «Conectar 3 niveles del juego» publica el build unido)
- Esta sesión **no publica** en el artefacto compartido BnwYGKPztaWv6bSCvDoJLA; al terminar entrega a esa sesión: archivos, APIs, persistencia, cómo cargarlo en otras páginas y problemas conocidos.
- **Cargarlo en cualquier página nueva** (p. ej. Costa Verde): `<link href="css/habilidades.css">`, `<script src="js/audio/melodias.js">` tras `sfx.js`, `<script src="js/engine/habilidades.js">` antes de `game.js`. El estado viaja en `carry.hab` (va en el `#hash` de `ACH.viaje` y en localStorage), así que funciona aunque iOS bloquee el almacenamiento.
