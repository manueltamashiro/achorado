# QA ACHORADO v0.11 — habilidades (XP, SABOR, árbol, 5 melodías)

Contrato probado: `juego/HABILIDADES.md`. Build: `dist/achorado.html`, `dist/miraflores.html` (18:51, más nuevos que todas las fuentes de habilidades; no hizo falta reconstruir).
Servidor: `ruby -run -e httpd` en 8770. Navegador integrado a 1280x720 (táctil a 844x390 con `?touch=1`). No se editó ninguna fuente. Al terminar se borró `localStorage` de 127.0.0.1:8770 y se detuvo el servidor.
Consola: **0 errores / 0 warnings** en las dos páginas (Gambetta, Cerro, Miraflores), incluida una pasada de estrés de 6000 pasos lanzando las 5 melodías al azar con zombis encima.

## Veredicto
**Aprobado con 1 bug medio y 2 menores.** Todas las cifras de la tabla del contrato salen exactas (curas, %, radios, duraciones, conos, daños, empujes, aturdimientos, costos, enfriamientos). Persistencia, premio de la picaronera, pista, regresión de mochila/armas/resortera/pausa/cuarto: bien. El único defecto de lógica real es que el **muletazo (zombi con muletas) se salta el escudo y el debilitamiento**. En juego el SABOR sobra (ver playabilidad).

## Casos
| # | Caso | Resultado | Medido |
|---|---|---|---|
| 1 | Partida nueva: NV1 / 1 punto / sabor 50 | OK | `{nivel:1, puntos:1, sabor:50, xp:0}` con storage vacío |
| 1b | Pista con retrato una sola vez, tras la intro | OK | Gambetta: intro hasta t=17.2 s, pista a t=18.0 (0,8 s después); Miraflores: intro t=4.9, pista t=5.7. Dos líneas con Alexander (sorpresa / habla). `pista:true` se guarda al empezar; tras recargar no vuelve (Gambetta y Miraflores). Nunca durante la intro. |
| 2 | Requisitos del árbol | OK | Escudo/Lamento/Rasgueo rechazados sin requisito (`bloqueada`); Rasgueo con Escudo≥1 **o** Lamento≥1; rango máx 3 (`max`); sin puntos (`sin puntos`); DEVOLVER PUNTOS deja todo en 0 y devuelve puntos (15 al NV15). Clic real del mouse en nodos también gasta. |
| 3a | Huayno (Z) 1/2/3 | OK | cura total 20 / 30 / 45; a los 0,8 s lleva la mitad (reparto en 1,6 s); sabor −40; cd 10 s |
| 3b | Cumbia (X) 1/2/3 | OK | radios 72/88/104 (borde exacto: 70 dentro, 74 fuera en R1; 86 dentro, 90 fuera en R2; 102 dentro, 106 fuera en R3); mul 0,65/0,50/0,35; duración 5/6,5/8 s; sabor −35; cd 12 |
| 3c | Vals (V) 1/2/3 | OK | cono medido: bloquea hasta 69° pero no 71° (R1=140°); 79°/81° (R2=160°); 89°/91° (R3=180°); espalda y 180° pasan; duraciones 5/8/11 s; empuja 24 px (zombi de 8 a 29–32 px); aturde 0,25 s en R1/R2 y 0,8 s en R3; sabor −45; cd 16; sin origen (`hurtPlayer` sin from/src) no bloquea (como el contrato) |
| 3d | Lamento (B) 1/2/3 | OK | radios 64/96/112 (60 dentro / 66 fuera en R1; 90 dentro / 98 fuera en R2; 110 dentro / 114 fuera en R3); daño 1/1/2; debilitado 50 % durante 6 s desde R2 (mordida 10 → 5); R1 no debilita (mordida 10); sabor −60; cd 18; mata y cuenta como guitarra (+12 sabor, XP); alcanza señoras, carretilla y bici con escudo (muertos en R3) |
| 3e | Último Rasgueo (G) 1/2/3 | OK | gating: hp 30 → `vida`; hp 25 → `vida`; hp 24,9 → sí; sabor 99 → `sabor`; sabor 100 + hp<25 % → sí; radios 60/85/110 (50 y 58 dentro / 62 fuera en R1; 80 dentro / 84 fuera en R2; 108 dentro / 112 fuera en R3); aturde 1/1,5/2 s; empuje medido ≈75 / ≈100 / 112–144 px (nominal 80/110/140, ~7 % menos por obstáculos/colisión); R3 quita 1 de vida (hp 3→2); sabor → 0; cd 30 |
| 3f | GCD y refusal | OK | segunda melodía a 0,0 s y a 1,17 s: `gcd`; a 1,25 s: toca. Sabor insuficiente: `sabor` + toast «Falta sabor, causa…». Guitarra rota (`dur=0`): `sin guitarra` + toast «¡Sin guitarra no hay sabor, causa!». Llevando la tele (carryH): `sin guitarra`. Con escoba en la mano sí toca (el contrato lo admite). Pose: camina al 50 % (40 px → 20 px en 0,5 s) y el golpe no sale durante 0,6 s; después sale normal. |
| 4 | XP por zombi y umbrales | OK | escolar 5, caminante 8, cobrador 8, ciego 12, señora olla/balde 15, `punch3`/`shield` 15, `trabajador` (Miraflores) 8, gallinazo +3 (Cerro), piedra +3 sabor, guitarra/Lamento/Rasgueo +12. Umbrales 60,90,120…480 (acumulado 3570 para NV15). +59 → NV1; +1 → NV2 xp 0; sobrante pasa (125 con need 120 → NV4 xp5). Tope 15: +500 no pasa, xp queda en 0. Subir de nivel: banner «¡SUBISTE DE NIVEL!», toast «+1 punto · K para el árbol», acorde, no pausa. |
| 5a | Recargar página | OK | nivel, xp, rangos, sabor, pista y jefaPremio idénticos |
| 5b | Miraflores → mapa con `ACH.viaje.go` | OK | NV9 xp20 rangos 3/2/1/1/0 sabor 55 llegaron intactos a `index.html` |
| 5c | Storage no disponible | OK | (i) se borró la clave del storage tras `go()` y el estado llegó por el `#hash` (`carry.hab`): OK. (ii) `Storage.prototype.get/set/removeItem` lanzando: `restore`, `save`, `addXP`, `spend`, `carry` sin excepción y el estado sigue en memoria. |
| 6 | Picaronera en miraflores.html | OK | `ACH.mira.jefa.dead=true` → destello a +1,2 s (congela 0,9 s) → diálogo con retrato (3 líneas, Alexander riendo en la 2.ª) → +150 XP (NV1→NV3 exacto) y sabor 100 → `jefaPremio:true`; no repite. Sólo se puede relanzar con `ACH.debug.hab.jefa()`. |
| 7a | Mochila I/Tab | OK | con la mochila abierta K y Z no hacen nada (ni al cerrarla) |
| 7b | Árbol + teclas | OK | con el árbol abierto I, Z, Tab se tragan; K y ESC lo cierran; ESC **no** abre la pausa; el siguiente ESC sí abre la pausa |
| 7c | Pausa | OK | item «ÁRBOL DE MELODÍAS (K)» reanuda y abre el árbol. Pulsar K dentro de la pausa no hace nada (OBS-3). |
| 7d | Armas de calle / resortera | OK | E agarra escoba, F la lanza; resortera mata ciego → +12 XP y +3 sabor |
| 7e | Cuarto (H, `state==='base'`) | OK | K no abre el árbol en la base |
| 7f | Teclas Z X V B G K | OK | sólo base.js usa X/Z y sólo en la base; sin choques |
| 7g | `?hab=1` | OK | NV15 / sabor 100 / sin rangos y no sobrescribe el storage |
| 8 | Táctil (844x390) | OK, 1 bug visual | botones ÁRBOL (arriba junto a MOCHILA) desde el inicio; MELODÍA aparece al aprender la primera y desaparece al devolver puntos; mantener 0,4 s abre el abanico (Z X V B con su corto), elegir con otro dedo selecciona; soltar el 1.er dedo después de abrirlo no lanza; tocar lanza la elegida (cd mareo 12 s correcto); el árbol cabe en 844x390. Bug B2 abajo. |
| 8b | Sonido | OK | las 8 recetas (`hab.alivio/mareo/escudo/lamento/rasgueo/nivel/despertar/clang`) emiten sin error y no son silencio (pico 0,21–0,53 en el bus SFX). No se auditionó la música «a oído». |

## Bugs (por gravedad)

### B1 — MEDIO: el muletazo ignora el Vals del Escudo y el Lamento debilitante
- Repro: Cerro (o `ACH.ent.makeZombie('caminante',x,y,{loco:'muletas'})`) a 8 px delante de Alexander mirándolo, `ACH.debug.hab({rangos:{alivio:1,escudo:3},nivel:15,sabor:100})`, `ACH.hab.cast('escudo')`, 45 pasos; poner `z.state='deambular'; z.atkCD=99; z.pokeT=0.03` y 4 pasos → Alexander pierde **10 de vida** con el escudo activo (`blocked` no sube). Con `z.habWeakT=5` tampoco se reduce a la mitad.
- Causa: `js/engine/entities.js:785` llama `ACH.zvar.update(G, dt)` **fuera** del bucle de la línea 784 que fija `curZ`; `js/engine/zombies.js:639` hace `ACH.ent.hurtPlayer(G, ZT(z).dmg)` sin `opts` y sin `curZ`, así que `filterHurt` (`habilidades.js:312-336`) no tiene origen (`o=null`) y no bloquea ni reduce.
- Arreglo sugerido (sin tocar zombies.js, que es del otro equipo): en entities.js poner `curZ = z` alrededor del poke, o que `zombies.js` pase `{from:{x:z.x,y:z.y}, ignoreAir:true}` (ojo: con `opts` el jugador en el aire es inmune salvo `ignoreAir`).
- Impacto: sólo muletas (1 de ~7 formas de moverse), pero es un frontal de 180° que el escudo debería parar.

### B2 — BAJO (táctil): los casilleros rápidos 1-4 tapan el encabezado del árbol
- Repro: `?touch=1`, 844x390, abrir ÁRBOL: los casilleros 1–4 (arriba a la derecha) se dibujan **encima** de «NN / NNN XP» y «N PUNTOS PARA GASTAR».
- Causa: `css/game.css:294` `body.touch #qbar { z-index: 6 }` vs `css/habilidades.css:32` `#habTree { z-index: 4 }`.
- Arreglo: en habilidades.css `body.hab-on #qbar { visibility: hidden; }` (o subir `#habTree` a z-index 7).

### B3 — BAJO: el sabor y los toasts «Falta sabor» se throttlean juntos
- `say()` (`habilidades.js:226`) limita **todos** los avisos a 1 por segundo con un único `R.msgAt`: «Sin guitarra» justo después de «Falta sabor» no se ve. Se notó sólo en pruebas por script; en juego real es casi imperceptible.

## Observaciones (no son fallos del contrato)
- OBS-1 **Escudo contra la jefa**: la jefa (`miraflores/jefa.js:389, 414, 552`) llama `hurtPlayer(G, dmg)` sin origen, así que el Vals **nunca** bloquea sus golpes ni sus abejas; Mareo/Lamento tampoco la tocan (el contrato lo dice para Mareo/Lamento, pero el escudo inútil contra el jefe es un hueco de diseño). Tampoco bloquea fuego (`fuego.js:177`) ni gallinazos si `b.ox==0`.
- OBS-2 **Retraso del escudo**: el Vals entra recién a los 0,6 s (la pose); un golpe que ya venía en esos 0,6 s pega igual (medido: mordida a los 0,55 s → −10). Es coherente con el diseño pero se siente «tardío».
- OBS-3 La pausa rotula «Mochila (I)», «Árbol de melodías (K)» pero pulsar la tecla dentro de la pausa no abre nada (sólo el clic). Igual que la mochila.
- OBS-4 La pantalla de título y la línea de controles de abajo («WASD MOVERSE · SHIFT CORRER…») no mencionan K/Z/X/V/B/G; sólo la pista de la primera vez y el menú de pausa → Controles.
- OBS-5 Las melodías sintetizadas duran 2,2–3,0 s (`melodias.js`: 2,4 / 2,2 / 2,6 / 3,0 / 3,0) pero el contrato dice ~1,6 s y el GCD es 1,2 s: dos melodías seguidas se solapan en el audio.
- OBS-6 `sanitize()` (`habilidades.js:51`) no pone `xp=0` si `nivel===15`; una partida con `{nivel:15,xp:39}` conserva 39 (la barra muestra 100 %/«NIVEL MÁXIMO», no se nota).
- OBS-7 La pantalla del árbol: las cuerdas entre fila 2 y fila 3 (Alivio→Escudo, Mareo→Lamento) quedan **ocultas** porque los nodos se tocan sin separación (`.habgrid`); sólo se ven las de la raíz y las del Rasgueo. El mensaje de feedback («¡APRENDISTE…!») es rosado sobre negro y dura 2,2 s: legible pero tenue.
- OBS-8 Cobrar XP de **músicos sociales** pacíficos (`z.social`) con el guitarrazo da XP normal (`hitZombie` los vuelve hostiles primero); no es grave.
- OBS-9 Cumbia: la velocidad se multiplica por `(1−slow)` y además se añade un vaivén lateral (`entities.js:588`), por lo que el avance neto hacia Alexander baja algo más que el % nominal. No se pudo medir limpio por la IA de persecución del zombi; el multiplicador (`habSlowMul` 0,65/0,50/0,35) es exacto.
- OBS-10 Posible falso positivo no reproducido: una vez, justo después de lanzar Z, el primer K no abrió el árbol (puede haber sido foco perdido tras un Tab del navegador; con foco, 5/5 aperturas bien). Se anota por si la gente lo reporta.

## Playabilidad
**SABOR (ritmo).** Reglas: +6 por golpe que conecta, +12 por muerte con guitarra (+3 con otra cosa), +1,5/s pasivo, empieza en 50.
- Bot (movimiento + Espacio simulados con teclas, 120 s en Gambetta, sólo guitarra, sin lanzar melodías): llegó a sabor 100 a los 10 s y estuvo **lleno el 95 %** del tiempo. Es decir, sin gastar, el recurso no limita nada.
- Bot con Huayno 2 / Cumbia 1 / Vals 1 / Lamento 1 / Rasgueo 1 y política simple de lanzar: sabor 100 → 6 en 20 s (Huayno 40 + Vals 45 + Lamento 60), luego se recupera +15 por cada 10 s sin pelear (pasivo). Se queda entre 10 y 60 cuando se usa; sólo el Rasgueo (100) exige reposar ≈67 s o ≈4 muertes.
- Juicio: la **ganancia por pelear es generosa** (un caminante, 2 golpes + muerte = 24 sabor; 2 muertes pagan un Huayno) y el pasivo (90/min) es cómodo. Los enfriamientos (10–30 s) mandan más que el sabor; el Rasgueo con 100 casi siempre está listo en cuanto hp<25 %. Recomendación: si se quiere que el sabor pese, bajar el golpe a +3/+4 o el pasivo a ≈0,8/s y empezar en 30. Si se prefiere «divertido primero», dejarlo.
- Ojo: con la barra de sabor delgada (156×9 px a 1280x720) no se lee el número; se entiende por el color (rosado → amarillo/brillo al llenarse) y por los iconos grises.

**Ritmo de XP.** Gambetta tiene 34 zombis no sociales ≈ 350 XP de arranque (NV4 con 270 y casi NV5). Los respawns (cada 12 s por debajo de 26 zombis) permiten farmear ~40 XP/min. Con el contrato (3570 XP para NV15) el árbol completo es **inalcanzable en una partida normal de los 3 niveles** (≈ NV6–8, 5–7 puntos, +150 de la jefa); sólo se llega con grind largo. Parece buen ritmo para elegir ramas, pero habría que decidir si NV15 es meta real o cosmética.

**HUD a 1280x720.** Fila NV: chapa 15 px + barra XP 86×6 px + «+N» parpadeante; fila sabor 156×9 px bajo la de aliento; iconos 32×33 px encima de la mochila. No se solapan con ninguna fila existente (medido por `getBoundingClientRect`; el HUD ocupa 210×336 px, 47 % de la altura). A 844x390 el HUD sigue legible y no tapa botones. La chapa «NV 15» se ve apagada porque el «+N» y el fondo tienen poco contraste; aceptable.

**Efectos visuales (capturas congeladas con `G.hitstop`).**
- Huayno: notas verdes que suben de Alexander; la vida sube. Legible pero chiquito (≈12 px de ancho).
- Cumbia: anillo rosado fino del radio real + espirales rosadas/blancas sobre cada zombi; el anillo se lee bien, las espirales son de 2–3 px y se parecen a un parpadeo rosado más que a una espiral.
- Vals: arco dorado de pentagrama delante (concéntrico) con una nota que oscila, «¡CLANG!» y notas amarillas al bloquear. Muy claro; parpadea al quedar <1,5 s.
- Lamento: anillos morados dobles + notas moradas sobre zombis (que parpadean blancos al recibir el golpe). Claro.
- Rasgueo: dos anillos (amarillo y rosado) + blanco, 22 notas, destello crema de 0,3 s y sacudida: el efecto más fuerte, claramente un golpe final. El texto «¡AHORA SÍ, MI ÚLTIMA CANCIÓN!» se lee sobre Alexander; el icono G muestra el borde naranja (el «late» no se aprecia en foto fija).
- Subir de nivel: «¡SUBISTE DE NIVEL!» en chicha (verde/amarillo/rosado) arriba y toast «+1 punto · K para el árbol» debajo; los dos se superponen un instante pero se leen.
- Premio de la jefa: anillo dorado y 12 notas de colores alrededor de Alexander, luego diálogo con retrato.

**Capturas hechas (observaciones).** HUD de juego (fresco y NV7 con 3 iconos), árbol de inicio (NV1, 1 punto: Alivio y Mareo con borde verde/rosado, resto gris con «PIDE …»), árbol con rangos (NV6: Alivio 3, Mareo 2, Escudo 1; «AL MÁXIMO: Cura 45…» / «Próximo: …»), pausa con el item del árbol, diálogo de pista, diálogo de la picaronera, táctil 844x390 (botones, abanico, árbol), cada melodía y el banner de nivel.

## Notas del método
- La partida se pausa sola cuando la ventana pierde el foco (`game.js:594`); los scripts de prueba forzaban `G.state='playing'` y avanzaban con `ACH.game.step(n)` (60 Hz). Las tandas «fallidas» del principio (3 primeros intentos de Lamento/Escudo) fueron por muertes entre llamadas (`R.deaths` limpia lo pendiente) y por esa pausa; se repitieron limpias y están en la tabla.
- Las mediciones de borde fijaron la posición de los zombis en cada paso para que no se acerquen durante los 0,6–0,82 s de pose.
