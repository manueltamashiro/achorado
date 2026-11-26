# QA v0.13 · index.html (QA-1)

Fuente servida en 127.0.0.1:8791 (ya apagado), pestaña propia, localStorage limpio al inicio. Sintaxis de los 68 `<script>` de index.html revisada con JavaScriptCore (todos OK). Sin errores JS (`window.onerror`) en toda la sesión; los únicos 404 del servidor son `favicon.ico`. 0 errores de consola en lo que se pudo leer.

Nota de método: con el panel oculto el bucle real corre entre llamadas (dt hasta 0,25 s por cuadro), así que varias «muertes misteriosas» eran el jugador parado junto a un enjambre mientras yo no lo movía. Son artefactos del arnés, no bugs. Un teletransporte de debug a (1944,100) cruza la calamina del Chofer y da la victoria (también debug).

## Tabla

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | Título: CONTINUAR / PARTIDA NUEVA / dificultad | PASS | «CONTINUAR · La Gambetta · recién», confirmación «¿Empezar de cero?…» (NO preseleccionado, ESC vuelve), 3 tarjetas con ACHORADO «recomendado». Botón NIVEL 2 solo con `?debug=1`. |
| 2 | Prólogo combi → Gambetta | PASS | Fases canta→golpe→pelea→puerta→choque→intro; se juega con teclas; 4 zombis dan XP. Sin SALTAR la primera vez; al rejugar aparece. |
| 3 | 3 sobrevivientes y rangos gratis | PASS | Charo (cantar con E) alivio=1 + cura-1; Eusebio (2 chatarra+1 jebe+1 tablas) escudo=1 + 2 cuerdas; Fosforito (mancha de 6) mareo=1 + setlist. `regalos` en el árbol. |
| 4 | Don Lucho + llaves + combi | PASS | Se queda quieto, diálogo, pelea; suelta `llavesCombi`; E en la combi da 15 piedras + Uhu (+ resortera/sencillos). |
| 5 | Estampita | PASS | Con 1 HP y golpe de 30: queda en 1, se consume, toast. Descripción ya corregida en inventario.js. |
| 6 | El Chofer ganable → escalera → Cerro con carry | PASS | Ciclo acecho→aviso→carrera→aturdida (≈4,5 s por vuelta), 25 HP, 120 XP, barra de jefe oculta la línea de objetivo. Al caer: escalera abierta, `routeCheck` ok. Cerro llega con mochila (sencillos 16, resortera, llaves), hp y árbol. Con aturdida los golpes reales se probaron solo con `hitChofer` (ver «sin probar»). |
| 7 | Descansos | PASS | +20 la primera vez («Descanso: Bodega Doña Luz (+20)»), 2.º toque no cura; `rest` suena (contador de audio, sin error). |
| 8 | Bolsa de muerte | PASS | 7 sencillos + 3 anticucho → bolsa 3+1, toast; recogida al pasar encima (¡Tu bolsa, causa! Todo de vuelta). Sin nada que perder no hay bolsa. |
| 9 | Cama 1 vez | PASS | 1.ª: 48→100 «Uff, como nuevo»; 2.ª: «Ya descansaste aquí. La vida no se regala, causa.» (`camas:["main:cerro"]`). |
| 10 | Cuarto bloqueado jefe/persecución | PASS | Zombi `perseguir` a 60 px: «¡Te están siguiendo, causa!…»; con el Chofer: «¡Con la combi encima no hay cuarto que valga!», `goBase()` false. |
| 11 | Cerro: huaicos + routeCheck | PASS | 2 huaicos (filas 60-62 y 80-82); `routeCheck` ok desde los 4 descansos (3460 px). Toast de huaico. |
| 12 | Radio | PASS | E: 5 láminas con retrato (Noticiero/Alexander); `heard=true`; casa con la cinemática. |
| 13 | Carteles de zona | PASS | «LADERA BAJA / LA LOSA», «LA PLACITA» al entrar; una vez por visita. |
| 14 | Olla común / Meche / gasolina | PASS | Plato +25 (hp 40→65) y 3 tápers; Meche recibe los 3 y da molotov + lamparín (almacén `lamparin:1`); tienda de Meche: GASOLINA 3 sencillos. |
| 15 | Gallinazos | PASS | 5 picadas en 25 s, nunca 2 a la vez (maxD=1). Nido: al espantar 3, `nido.done` y botín en el suelo (sencillos, gasolina, trapo, cuerdas). |
| 16 | Tele abollada | PASS | Con `dstate=1` el contexto sale «AGARRAR» y E la saca del mundo. |
| 17 | Carretilla de gas | PASS | `gas=true` + `knock`: BUUUM, 12×1,3 = 15,6 de daño a Alexander (100→84,4). Solo el camino de código; sin molotov real. |
| 18 | Presidenta ganable → cruz → cinemática → mapa | PASS | Diálogo con retrato (LA PRESIDENTA, cara zombi), 3 fases, ganada con golpes reales en 45,8 s. Da +150 XP, parlante, cura-2, bandera `cerro.presidenta`, cruz abierta. Victoria → ASOMARSE → diálogo → cinemática (~25 s) → mapa «¿A dónde, causa?». ESC en el mapa vuelve al «Lote de la cruz chica» (F3). |
| 19 | Parlante/setlist en el cuarto | PASS | Tarima en (9,7) con parlante y atril de setlist dibujados; E: «Piezas del concierto: 2/4. Falta el micrófono, el ampli.» |
| 20 | Taller y rama pasiva | PASS | Mesa de luthier se compra a Don Pocho por 12, se coloca sola, segunda compra rechazada. 5 mejoras comprables (mochila 20, guitarra 150, atk 1,25, cd 0,255). Rama pasiva: clic en LOMO DE COMBI → hpMax 110, vida +10. |
| 21 | Diario con cura-1/cura-2 | PASS | Pestaña DIARIO: objetivo, concierto 2 de 4, PISTAS DE LA CURA con «El rumor de la radio» y «La Presidenta del Comité». |
| 22 | Opciones | PASS | P pausa; menú OPCIONES (P, sacudida, texto, contraste, dificultad, teclas). `texto=grande`, `contraste`, `calma` ponen `opt-txtbig opt-hc opt-calma` y `fx.calma()`. Remapeo: titina→J, intercambio con E, «ya ocupada» para I, `resetTeclas`. Selector de dificultad en la pausa. |
| 23 | Intros saltables solo al rejugar | PASS | Primera vez sin SALTAR (prólogo, intro Gambetta, intro Cerro, llegada a la cima). Al rejugar: SALTAR ⏭ · ESC cierra la intro (ver M2 por el prólogo). Diálogo del Chofer, no saltable. |
| 24 | Táctil `?touch=1` 844×390 | PASS | Título 46-52 px; MOCHILA 77×44, RECETAS 71×44, CUARTO 66×44, ÁRBOL 62×44, pausa/mute/pantalla 44×44; botón de victoria 203×46; VOLVER/DEVOLVER del árbol 45; VOLVER del mapa 49; cuarto: DECORAR 44, BAJAR 44, USAR 44. Con PointerEvent táctiles sintéticos: ÁRBOL abre, RECETAS abre/cierra, CUARTO entra. `achorado.touch=1` se recuerda; `?touch=0` lo borra. |
| 25 | CONTINUAR tras recargar en Gambetta | PASS | Flags charo/eusebio/fosforito/chofer guardadas; CONTINUAR: sin Chofer, escalera abierta, sobrevivientes hechos, «¡De vuelta, causa!». El guardado se bloquea con el Chofer en pelea (`bossActive` ya lo conoce). |
| 26 | CONTINUAR en Cerro con banderas | PASS | Con `cerro.presidenta`: no aparece la Presidenta, cruz abierta, concierto 2/4 se mantiene, mochila y hp. Reaparece en el último descanso. |
| 27 | 0 errores de consola | PASS | `onerror` vacío en todas las cargas. |

## Bugs

### ALTA
Ninguno.

### MEDIA
- **M1. Objetivo desactualizado tras CONTINUAR.** Con la Presidenta ya vencida, CONTINUAR en el Cerro dice «Sube el cerro hasta la cruz de arriba» (y el DIARIO igual) en vez de «Toca la cruz de la cima». `game.arriveContinue` resetea el objetivo por defecto y no mira las banderas (`cerro.presidenta`). Repro: vencer a la Presidenta, recargar, CONTINUAR, abrir pausa → DIARIO. Arreglo propuesto: tras `freshLevel/arriveContinue`, si `flag('cerro.presidenta')` hacer `ACH.objetivo.set('Toca la cruz de la cima')`. (Idem para otros niveles con banderas: no lo revisé.)
- **M2. ESC en el prólogo rejugado hay que apretarlo 3 veces.** Se muestran dos «SALTAR»: el del prólogo (arriba a la derecha) y el del diálogo (sobre la caja). El primer ESC cierra solo la línea de diálogo, el segundo el siguiente diálogo y el tercero recién el prólogo. Repro: PARTIDA NUEVA con el prólogo ya visto, ESC repetido. Arreglo propuesto: que ESC/SALTAR del prólogo llame a `skip()` directo (prologo.js) y que el diálogo del prólogo no ofrezca su propio SALTAR.

### BAJA
- **B1.** Afiche «SE HIZO DE NOCHE…» pintado encima del cartel de victoria (se vio tras teletransportarse a la escalera de la Gambetta y al ganar el Cerro). **ARREGLADO** (ver abajo).
- **B2.** Toast doble al enseñar una melodía: «DJ FOSFORITO TE ENSEÑÓ CUMBIA DEL MAREO · TECLA X» y «…(RANGO GRATIS · K)». Redundante, se apilan sobre la línea de objetivo.
- **B3.** El toast «¡HUAICO! LA ESCALERA ESTÁ TAPADA…» tapa la línea de objetivo unos segundos y se apila con el cartel de zona.
- **B4.** La radio no persiste: tras CONTINUAR vuelve a dar el noticiero entero (ya anotado por CE).
- **B5.** En el árbol en horizontal (844×390), «6 PUNTOS PARA GASTAR» roza el rótulo «CUERPO DE COMBI».
- **B6.** Dos toasts de recompensa y banner de zona pueden superponerse al subir de nivel (cosmético).
- **B7.** Balance (no es bug): con 5 zombis despiertos junto al inicio de la Gambetta (Achorado, daño ×1,3) se cae rápido si el jugador no se mueve; golpear con la guitarra atrae a los de alrededor. Sin playtest humano.
- **B8.** Título táctil: la línea «MAPA DE LIMA · tecla 3» muestra una tecla que no existe en el celu.

## Qué arreglé
- `js/engine/noche.js:76` (CSS inyectado): se agregó `body[data-state="won"] #nightBanner` a la regla que oculta el afiche en pausa y muerte, para que no se pinte sobre el cartel de victoria. Verificado: `visibility` pasa de visible a hidden con `data-state="won"`. (Edit de 1 línea; mi primer intento por JS no funcionaba porque `noche.update` no corre en `won`, y lo revertí.)

## Sin probar o solo parcial
- Golpes reales a El Chofer aturdido (usé `hitChofer`/`stunChofer`; el ciclo y la derrota por debug sí; la Presidenta sí se ganó con golpes reales).
- Carretilla de gas con molotov real y «chuza».
- Bolsa de muerte con flecha de borde de pantalla (la bolsa se dibuja y se recoge; la flecha no la miré).
- `P` desactivable (opción «Pausa con P») y «reducir sacudida» solo por clases CSS/flag, no a ojo.
- Sonidos de radio/rest/zona solo como llamadas sin error (el audio estaba `running`, no escuché).
- Panel de la mesa de luthier por UI (comprado por API) y tapadas de Cuerdas/Correa a ojo.
- Tarjetas del mapa en táctil (VOLVER sí medido; las regiones del mapa no) y clic en tarjeta de Miraflores (QA-2).
- El viaje Gambetta→Miraflores/Costa Verde y CONTINUAR en otras páginas (QA-2).
- `?touch=1` persistiendo entre páginas (solo vi la clave en localStorage).
- Navegador en Safari/Firefox, dispositivos reales, 16:9.

## Veredicto
**Listo para publicar: sí** desde index.html. No hay bugs ALTA; las dos MEDIA (objetivo viejo tras CONTINUAR y triple ESC en el prólogo) son de pulido y conviene arreglarlas antes del build si hay tiempo. Recuerda regenerar `dist/` con los build*.sh, que ya incluyen el cambio de noche.js.
