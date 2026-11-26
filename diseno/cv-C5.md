# C5 — Cinemática del aterrizaje en Chorrillos

Archivos míos: `juego/js/costaverde/chorrillos.js`, `juego/preview-chorrillos.html`, `diseno/investigacion-chorrillos.md` (investigación con URLs), este archivo.

## API real
```
ACH.cv.chorrillos.play({ onEnd, t, freeze, dialogo, skippable, ownMusic, keepFrozen, keepArt })  → true | false
ACH.cv.chorrillos.stop()      // corta todo (música, diálogo, DOM, listeners) sin llamar a onEnd
ACH.cv.chorrillos.isOn()
ACH.cv.chorrillos.debug = { T, lines, render(t), state(), resetSeen(), art(), cost(t, n), bake() }
```
- `onEnd()` se llama al cerrar el último diálogo, tras un fundido a negro de 0,4 s. Ya está todo desmontado cuando se llama.
- Parámetros solo para QA: `t` (segundo de inicio), `freeze` (congela en `t`; no suena), `dialogo:false` (no abre el diálogo), `skippable` (fuerza), `ownMusic:true` (ignora `ACH.audio.cv`).
- Canvas propio de 960×540 encima de `#stage` (z-index 5; el diálogo usa 6 y queda encima). Sin `#stage`, ocupa la ventana completa escalada.

## Montaje (18,6 s) y diálogo
| s | plano |
|---|---|
| 0–4,0 | Bahía de Chorrillos: Morro Solar (Cruz y Cristo del Pacífico), Club Regatas, muelle de pescadores, botes, sombrillas. Parapente rosado y amarillo baja en diagonal; el único rayo de sol sale de un hueco de la panza de burro y enciende la vela. Rótulo chicha «PLAYAS DE CHORRILLOS». |
| 4,0–8,75 | Plano medio: Alexander sentado en el arnés planeando sobre los botes de colores; Titina vuela a su lado; 13 gaviotas se abren cuando pasa. |
| 8,75–14,0 | Contrapicado: baja hasta tocar la arena (10,0 s), nube y chorro de arena, tiembla la cámara, rodilla al suelo, la vela se desinfla y cae detrás como capa; Titina aterriza en su hombro (~12,2 s). |
| 14,0–18,6 | Pose heroica cómica (puños en la cintura, pecho inflado, pelo al viento, guitarra a la espalda, Titina inflada con ceja fruncida, capa-vela flameando, destello en el diente chueco). |
| 18,6 → | El plano 4 sigue vivo (animado) mientras habla el diálogo: las 4 líneas de §7 exactas (feliz, serio, risa; Titina feliz). Las bandas de cine salen al empezar el diálogo. |

- Primera vez sin saltar (ESC/ENTER/Espacio/Tab se tragan para que no abran la pausa). Se marca vista al terminar el montaje en `localStorage 'achorado.cine.chorrillos.v1'` (try/catch, con respaldo en memoria). Después, ESC / ENTER / toque saltan el montaje y entran al diálogo (que nunca se salta).
- Usa `ACH.cv.freeze(true|false)` si existe (función; también acepta objeto con `on/off/set`).

## Arte y rendimiento
- Todo en una grilla de 480×270 escalada ×2 sin suavizado; polígonos con rasterizador propio sin antialias, tramado Bayer, contorno de 1 px. Horneado único en el primer `play()` (~80–90 ms) y se libera al terminar (`ART = null`). Por cuadro solo `drawImage`/`fillRect` (costo CPU medido < 0,3 ms por cuadro; picos de ~4 ms por GC). Sin `getImageData`, `shadowBlur`, `filter` ni degradados por cuadro. Lienzos por `ACH.px.canvas` si existe.
- `render(t)` depende solo de `t` (por eso `?t=&freeze=1` sirve para capturas).
- Alexander: el Alexander claro de la cima (paleta de `cine.js`: piel `#c48f63`, pelo `#2e221c`, camiseta de rayas verticales azules y blancas, short verde olivo, sandalias, guitarra), rig propio de poses (sentado, colgando, aterrizaje, rodilla, heroica).

## Música
- Si existe `ACH.audio.cv.play`, se llama `ACH.audio.cv.play('cv.heroe')` (si devuelve `false` se usa el tema propio) y `ACH.audio.cv.stop()` al terminar.
- Si no (o con `ownMusic`): tema propio en Web Audio dentro de `chorrillos.js`, 120 bpm en Re mayor: viento + arpegio de nylon, batería surf con guitarra en trémolo, subida con rulo de caja, golpe del aterrizaje (timbal, platillo, bajo), rasgueos y metales, acorde tutti en el plano heroico, vals suave en bucle bajo el diálogo. Usa `ACH.audio.ctx` y `ACH.audio.bus.music` si existen. Efectos: viento, gaviotas, aleteos, «tin» del diente, «gurú». Si saltan la cinemática, la música reinicia en el plano heroico (solo el tema propio).

## Pendiente / problemas conocidos
- No pude escuchar el audio (solo verifiqué que se programa sin errores y que el contexto arranca); conviene que alguien lo oiga y ajuste mezcla.
- Sincronía con la música propia: ±0,1 s (el reloj visual es `performance.now()`, el audio usa el del AudioContext).
- Si la pestaña queda en segundo plano el cuadro se congela, pero el reloj sigue: al volver, la cinemática continúa donde le toca por tiempo.
- `ACH.cv.freeze` no existía al probar: la rama de congelar el juego solo está probada de forma indirecta (se llama dentro de try/catch).
- Con el juego completo falta la prueba de integración (la hará QA): el diálogo usa `#stage` del juego tal cual.
