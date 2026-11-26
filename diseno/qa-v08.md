# QA v0.8 — Armas de la calle, la noche y la comida

Probado en el navegador integrado (`http://127.0.0.1:8711/index.html`), manejando el juego por `ACH.game.step`, `ACH.input.press/release` y `ACH.debug.*`, más capturas de pantalla. Servidor `ruby -run -e httpd` en el puerto 8711 (apagado al terminar). No se ejecutó `sh build.sh`.

## Resultado en una línea
Toda la v0.8 funciona como dice el SPEC. Se corrigieron 2 bugs del motor (uno de debug, uno de jugabilidad). Quedan avisos en sprites del nivel 2 (errores al cargar) fuera del alcance de la v0.8.

## Pruebas (OK / FALLA)

### 1. Guitarra que se gasta
| Prueba | Resultado |
|---|---|
| Guitarrazo que conecta con un zombie cuesta 1 de durabilidad; swing al aire cuesta 0 | OK (60 → 59; aire = 60) |
| Contra auto/poste cuesta 2 (combi) y contra el escudo de la carretilla cuesta 2 (sin daño al zombie) | OK |
| Estados sana > 66 %, rajada > 33 %, muy rajada > 0, rota (cambian en 40 / 20 / 0) | OK |
| Avisos a 33 % y 10 % («¡La viola ya no aguanta!») | OK (2 avisos, uno por umbral) |
| Rotura: `guitar.break`, toast «¡Nooo, mi guitarra!», frase `guitarBreak`, astillas, decal en el piso | OK (decal visible en captura) |
| Puñetes: daño 0.34, alcance 14, arco 70°, empuje 12, enfriamiento 0.22, cuesta 4 de aliento | OK |
| Caminante/cobrador (2 de vida) = 6 puñetes; escolar, `cuatro`, `skate`, `bici` = 3; ciego (3 de vida) = 9 | OK |
| Reparar con `cuerdas`: +15 (tope 60), rota = «Ya no hay cuerda que la salve», sana = «al cien» | OK |
| Morir y despertar: guitarra sana (60/60) | OK |
| HUD: icono + barra verde / amarilla / roja y estado «rota» | OK (capturas) |

### 2. E / F y armas de la calle
| Prueba | Resultado |
|---|---|
| Aviso flotante «E agarrar skate» (a ≤ 18 px; no tapa la cabeza) | OK (captura) |
| Skate en la mano: daño 1, alcance 22, arco 100°, 15 golpes y se parte (toast, decal, la guitarra no se gasta) | OK |
| Skate lanzado (F): ~260 px/s, golpea a todos los de la línea (3 de 3, el de fuera de línea no), fricción, queda en el piso y se vuelve a agarrar | OK |
| Bici: E la empuja (velocidad ×0.8, sin golpe, botón LANZAR); F o ESPACIO la lanza a ~300 px/s; frena con cada golpe; rebota en la pared; se relanza | OK |
| Moto: E + F a ~376 px/s, daño 3, atraviesa 5 zombies y hace choque grande (`moto.crash`, ruido 200 que atrae a un zombie cercano, queda `wrecked`, rompe la invisibilidad, sacudida) | OK |
| Moto contra el borde del mapa / pared | OK (crash, no se sale del mapa) |
| Carretilla suelta: F patea (225–240 px/s), riega botín al frenar, 3 patadas y queda `broken`; la 4ª ya no da aviso | OK |
| Mueren zombies skate / bici / silla / carretilla / repartidor en moto: dejan su objeto suelto | OK |
| Los 3 objetos sueltos del escenario (bici, skate, silla) | **FALLA → corregido** (ver bug 2) |
| Fuzz de 30 000 cuadros (teclas al azar, E/F/ESPACIO, objetos, comida, noche, muertes) | OK: 0 errores, 0 NaN, `loose` nunca pasa de 14 |

### 3. La noche
| Prueba | Resultado |
|---|---|
| Anochece al cruzar x > 84·16 | OK |
| Anochece a los 5 min (302 s en la prueba) | OK |
| Transición de 20 s (`t` 0 → 1), ambiente oscuro, afiche chicha «SE HIZO DE NOCHE…», frase, `night.fall`, música `setNight` | OK (capturas) |
| Zombies al doble: `zMul` 2.0 persiguiendo y 1.5 deambulando; un caminante persiguiendo pasa de 32 a 64 px/s; ven ×0.8, oyen ×1.3 | OK |
| Morir de noche: despierta de noche, 10 s de gracia (`zMul` 1) y rampa de 1.5 s a ×2; el afiche no se repite | OK |
| `ACH.debug.night(false)` vuelve al atardecer | **FALLA → corregido** (ver bug 1) |
| Partida nueva (intro) reinicia el atardecer | OK |

### 4. Bebidas y comida
| Prueba | Resultado |
|---|---|
| Inca Kola: aliento lleno + subidón 25 s; correr gasta 60 % (−40 %); regeneración ×2.5 | OK (el gasto se midió; la regeneración usa `mods.regen`) |
| Cola Inglesa: `invisT` = 10, zombies que perseguían pasan a deambular, `invis.on` | OK |
| La invisibilidad **no** se rompe al correr ni con un golpe al aire | OK |
| La rompen: golpe que conecta (zombie o prop), tocar a un zombie, skate lanzado que pega, choque de moto (alarma: por código) | OK |
| Alexander y Titina a 25 % de opacidad con brillo tembloroso | OK (captura) |
| Carretillas de comida: 6 en el mapa (5–7), 2–4 porciones, aviso «E sacar comida», pips de porciones, la broma «dejaste la plata en la latita» (−1 sencillo) | OK |
| Cura: anticucho +15, papa con huevo +20, choclo con queso +12, pan con chicharrón +30 | OK |
| Le cae mal: −8 de vida, 4 s de empacho (camina al 70 %, sin correr), `item.sick`, `say('sick')` con `always: true`, tinta verde en la cara | OK |
| Cola Inglesa en neveras escondidas: 2 puntos, ambos alcanzables | OK |
| Nombres de marca real / parodia (`INCA KOLA` / `INTI KOLA`, `COLA INGLESA` / `COLA GRINGA`) y carretillas tras un `rebake` | OK |

### 5. HUD, táctil, rendimiento
| Prueba | Resultado |
|---|---|
| Cuentas atrás (SUBIDÓN, INVISIBLE, EMPACHO) debajo del HUD | OK (captura) |
| Botón contextual táctil (`?touch=1`): AGARRAR junto al skate y a la carretilla de comida, LANZAR con algo en la mano, PATEAR junto a la carretilla suelta; GUITARRAZO cambia a SKATE-TAZO y a PUÑETE | OK |
| 60 fps con 34+ zombies: 300 cuadros con **78 zombies vivos** (36 persiguiendo juntos) → 1.4 ms por cuadro (simulación + dibujo), p95 2.0 ms, máx 9.3 ms; de noche 1.5 ms | OK |
| `routeCheck()` | OK (`ok: true`, 534 pasos) |
| `spawnCheck()` | OK (vacío) |
| Consola | Sin errores del motor. Solo los de sprites del nivel 2 (abajo) |

## Bugs del motor corregidos
1. **`ACH.debug.night(false)` no mantenía el atardecer** si el reloj ya pasaba los 300 s: a la siguiente actualización volvía a anochecer. Se agregó una bandera `hold` que se limpia al empezar una partida o al volver el reloj a cero. `js/engine/noche.js:29`, `:118`, `:121`, `:181`.
2. **La bici caída, el skate suelto y la silla de ruedas del escenario eran props fijos** (decoración de la v0.6): se veían como armas pero la E no hacía nada. Ahora `world.js` los saca de `props` y los publica en `ACH.world.looseDecor`, y `armas.js` los crea como objetos sueltos reales en cada `reset`. Se agarran, se lanzan y no se duplican con un `rebake`. `js/engine/world.js:392`, `:472`, `:482`, `:711` y `js/engine/armas.js:579-580`. Verificado: el skate del escenario se agarra con E, `routeCheck` ok, `spawnCheck` vacío.

## Pendientes en sprites y audio (no editados)
- `js/sprites/cerro-suelo.js:329` `pircaCourse`: `Uncaught ReferenceError: xx is not defined` al cargar (se repite desde 335, 347, 572). Corta el resto de ese archivo (nivel 2).
- `js/sprites/aves.js:223` `groundBird`: `headAt is not defined`; `js/sprites/aves.js:245` `fallFrame`: `skyBird is not defined`. Se reproducen solo cargando `index.html` y mirando la consola (nivel 2).
- `js/sprites/cerro-casas.js` y `cerro-props.js` son stubs de 161 bytes (nivel 2, no es de la v0.8).
- Audio: todos los eventos de la v0.8 que usa el motor existen en `sfx.js`; `ACH.audio.phrases` trae `sick`, `guitarLow`, `guitarBreak`, `grab`, `throw`, `night`, `invis`, `incakola`. Sin bugs que reportar.

## Observaciones menores (sin cambio de código)
- Una carretilla de comida vacía sigue mostrando «E sacar comida» y al pulsarla dice «Ya no queda nada, causa.». Es coherente, pero el aviso podría decir «vacía».
- El derrame de la carretilla pateada suelta `sencillo` y `anticucho` o `gaseosa` porque no existe el objeto `fruta` en la mochila (el SPEC dice «fruta»). Si se quiere fruta de verdad hay que crear el ítem en `inventario.js` + `objetos.js`.
- La moto lanzada hace el choque grande al quinto zombie atravesado (no al sexto). Cuadra con «atraviesa hasta 5».
- Debug: `ACH.debug.spawnZ('skate'|'bici', …)` sobre un `caminante` deja `loco: 'camina'` pero marca `punch3` (el `assign` de `zombies.js` usa el loco pedido aunque `setLoco` lo rechace). Solo pasa al forzar por debug; en el juego `chooseLoco` respeta `ALLOW`.
- El uso de objetos tiene una espera de 0.2 s en **tiempo real** (`performance.now`): al probar con `ACH.game.step` seguido hay que esperar entre usos.

## Lo que no se pudo probar
- A media sesión otro agente tomó mi pestaña (`tab-7`, la navegó a su puerto 8713) y el límite de pestañas impidió abrir otra por un rato. Después conseguí `tab-12` y repetí un fuzz de 20 000 cuadros con los dos cambios ya aplicados: 0 errores, 0 NaN, `routeCheck` ok, `spawnCheck` vacío, y `ACH.audio.loop('roll.skate')` devuelve un asa con `stop`. No se repitieron las capturas de pantalla después del cambio 2 (solo la de la bici caída).
- Toques reales en pantalla táctil (el botón se probó con eventos y con `?touch=1` en escritorio).
- Sonido real: el audio estaba `locked` (sin gesto del usuario); solo se comprobó que los eventos existen y se emiten.
- Alarma de auto rompiendo la invisibilidad: revisado en el código (`interaccion.js:90`), no ejercitado en juego.
- Nota para quien repita esta QA: si el panel del navegador está oculto al cargar la página, **todos los sprites salen vacíos** (canvases en blanco) y el mundo se ve negro. Hay que traer la pestaña al frente (`tabs_select`) antes de navegar.
