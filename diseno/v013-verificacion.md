# ACHORADO v0.13 — verificación final

Fecha: 2026-11-20 · Fuente servida desde `juego/` (127.0.0.1:8795), pestaña propia, caché de .js limpiada.
NO se corrió build*.sh ni se publicó. **Antes de publicar hay que correr build*.sh** (los cambios están sólo en la fuente).

## Método
- **Jefes**: bots en JS que manejan `ACH.input` y avanzan con `ACH.game.step(1)` (pasos de 1/60 s), dificultad ACHORADO (dmgMul 1,3). Se simula el reloj de `performance.now` para que funcione el cooldown de comer. Se registra el daño por `src` envolviendo `ACH.ent.hurtPlayer`.
  - Bot «esquiva»: lee los telegrafiados (abanico, lluvia, wok, palitos, dumplings).
  - Bot «quieto»: sólo pega.
- **Audio**: cada receta se renderiza con `OfflineAudioContext` a 48 kHz, página por página (index, miraflores, costaverde). Se mide duración, pico, RMS, NaN y silencio. Los nombres emitidos sin receta se resolvieron con un alias perezoso en `sfx.js`.
- **Móvil**: preset mobile, luego viewport 844x390 y `?touch=1`. Se juega con toques sintéticos `pointerType:'touch'` sobre los botones reales. `tapBad()` revisa objetivos menores de 44 px, tapados o fuera de pantalla.

## 1. Jefes (ACHORADO)
| Jefe | Bot | Resultado | Tiempo | Notas |
|---|---|---|---|---|
| Chef | esquiva, 2 chaufa | 14/20 (70 %) | 76–113 s (13/14 en 70–110) | Se pierde por los dumplings de la fase 2 (≈180 de daño). El abanico a quemarropa con 7 palitos hace ≈77. |
| Chef | quieto | 0/8 | muere a los 14–29 s | |
| Chancaca | DM.trial listo | 7/8 | 25–61 s | |
| Chancaca | tonto | 0/6 | 28–32 s | |
| Presidenta | esquiva, 2 comidas | 7/8 | ~46–50 s | |
| Presidenta | esquiva, sin comida | 2/6 | | |
| Presidenta | quieto, 2 comidas | 5/6 | ~35 s | Fácil con comida (aprovecha el contra de la olla). |
| Presidenta | quieto, sin comida | 1/6 | | |
| El Chofer | esquiva | 7/7 | 11–41 s | Fácil una vez entendido: 2–6 choques, 0–26 de daño. |
| El Chofer | quieto | 0/6 | | Le quedan 1–5 hp. |

No hizo falta tocar `chef.js`.

Observaciones:
- La Presidenta es fácil si se lleva comida.
- El Chofer es fácil y, mientras está aturdido, lo empujan fuera de su carril (y 356 → 211).

## 2. Audio
Las 152 recetas de index, 182 de miraflores y 251 de costaverde dan 0 NaN, ningún silencio y ningún error.

| Sonido | dur s | pico dBFS | RMS dBFS |
|---|---|---|---|
| rest | 0.97 | −11.9 | −30.9 |
| radio.static | 1.33 | −15.4 | −36 |
| radio.news | 0.74 | −14.4 | −31.8 |
| zona.cartel | 0.36 | −18.3 | −31.3 |
| gb.bocina | 0.92 | −8.9 | −20.3 |
| gb.choque | 0.33 | −1.8 | −15 |
| mira.flash / flashWind | 0.11 / 0.37 | −10.3 / −26 | −27 / −38 |
| mira.silbato / purr / rocio / bocina | 0.46–1.49 | −13.7 … −20 | −32 … −37 |
| iglesia.campanas | 13 | −7.9 | −26.8 |
| cv.selfie | 0.25 | −8.7 | −32 |
| cv.chef.grito | 0.91 | −3.1 | −10.2 |
| cv.gong | 2.3 | −1.8 | −17.8 |
| cv.reja.cierra | 0.95 | −1.7 | −19.8 |
| hab.rasgueo | 1.54 | −1.4 (antes hasta −0.8) | −15 |
| door (nuevo) | 0.36 | ≈−11 (máx −5.5) | −31 |
| tire.burst (nuevo) | 0.27 | −9.5 (máx −6.1) | −30 |
| 23 alias | — | −6.8 … −15.6 | — |

Arreglos de audio:
- `js/audio/sfx.js`: se agregaron las recetas `door` y `tire.burst` y un bloque ALIAS perezoso (sólo `if (!R[name])`) que cubre:
  - tire.pop
  - base.enter / exit / cajon / dormir / poner / quitar / radio
  - ui.open / ui.no
  - item.use, uhu.use, craft, eat
  - glass, guitar.swing, heavy.land
  - vendor.hello, boss.fryWarn
  - cv.perro.ladra, cv.tabla
  - Sólo en index: boss.yell, boss.down, shop.open / buy / nomoney. En Miraflores y Costa Verde los reemplaza sfx-mira; verificado en vivo que en cv `boss.yell` no es alias.
- `js/audio/melodias.js`: el bus de hab.rasgueo baja de 1.0 a 0.85.

Notas:
- `hit` crudo llega a −0.8 dBFS en 1 de 25 renders. No es de v0.13 y el TRIM de −2 dB del motor lo deja en ≈−2.8 en juego, así que no se tocó.
- `voces.js` usa speechSynthesis y no se puede medir.
- Los nombres dinámicos `<cargable>.crash` no tienen receta; el evento ya suena con heavy.land.

## 3. Móvil (844x390)
| Pantalla | Resultado |
|---|---|
| Título, PARTIDA NUEVA, dificultad | OK, ≥44 px |
| Prólogo | **Arreglado**: antes no se podía jugar en táctil. Ahora se juega entero con joystick, GUITARRAZO, TITINA y ABRIR. El modo `pro` sólo se activa en golpe/pelea/puerta y ABRIR sólo aparece junto a la puerta. |
| Gambetta: Charo y Fosforito | **Arreglado**: no había botón para E. Ahora aparecen CANTAR y HABLAR en el botón contextual. Charo y Fosforito (mancha de 6) se completan con toques. |
| Pausa | **Arreglado**: la quickbar tapaba los sliders. |
| Opciones | **Arreglado**: VOLVER y TECLAS quedaban fuera de pantalla. Las filas de teclado se ocultan en táctil; VOLVER queda en y=361 (de 390). |
| Diario | OK |
| Árbol | OK, cabe. **Arreglado**: el botón decía «K / ESC — VOLVER»; en táctil ahora dice sólo «VOLVER». |
| Mochila / Recetas | OK: 44 px una vez terminada la animación; mientras gira se miden 42. La lista de ARMAR hace scroll. |
| Cuarto | OK: se camina tocando, USAR y BAJAR A LA CALLE funcionan. |
| Costa Verde: café de Larcomar | OK: ENTRAR con el botón contextual → inRoom 'cafe'. |
| Consola | 0 errores y 0 warnings en todo el recorrido. |

Archivos arreglados para táctil:
- `js/engine/prologo.js`: `hint()` con variantes táctiles, y se exportan `phase()` y `canOpen()`.
- `js/engine/tactil.js`: se agregan `proOn`, `canAct` y `proCtx`, más el tcmode 'pro'.
- `css/game.css`: `[data-tcmode=pro] .tctop` y `#qbar` ocultos en pausa.
- `js/engine/pausa.js` y `css/pausa.css`: clase `kb-only` y scroll pan-y.
- `js/engine/gambetta.js`: `nearCtx()` envuelve `ACH.armas.context`; en táctil el aviso del canvas dice «▸ cantar».
- `js/engine/habilidades.js` y `css/habilidades.css`: `.habkb` se oculta en táctil.

Observaciones:
- El viewport custom de 844 pierde la emulación táctil del preset mobile (maxTouchPoints 0), por eso se usó `?touch=1`.
- La mochila muestra las teclas «I» / «L» en las pestañas en táctil (cosmético).
- El rAF del panel se congela si está oculto; se usó un shim con setTimeout sólo para la prueba.

Al terminar: servidores apagados, localStorage limpio, viewport en desktop.
