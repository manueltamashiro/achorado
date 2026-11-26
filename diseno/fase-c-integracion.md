## De calle.js
- Variantes: el motor elige siempre la variante 0 de curbN/curbS/zebraH/curbNYellow/curbSYellow, y usa h%5 para asphalt/sidewalk/asphaltCrack. Debe hacer hash % .length.
- Berma: fila 23 = bermaN, fila 26 = bermaS (borde con sardinel); 24–25 berma.
- La raya discontinua sale doble porque se dibuja en las filas 18–19 (y 30–31). Dejar una sola raya centrada entre carriles.
- Colocar calcomanías (~60, con semilla, más densas cerca de los hitos): charco, parche, aceite, frenada, buzon, vidrio, sangre (máx. 3 por pantalla), legend 0–5 (DESPACIO/PARE/BUS/flechas/CEDA, en el carril correcto según el sentido), sombraArbol bajo copas, arena 0/1 junto a curbN/curbS, rodada, lavado.
## De la luz
- world.js no copia `lamp` al prop (render lo lee del sprite). Ok.
- placeholderLot prende todos los lotes N: arreglado al llegar los arquetipos reales.
## De mobiliario.js
- Cables: usar `tops[i]` (4 por poste de concreto, de aisladores) y no `top`; 3–4 cables por tramo con distinta comba + acometidas de poste a fachada + cruces de calle de vez en cuando. Los posteLuz llevan `lamps[2]`.
- Usar posteLuz (metálico de dos brazos) alternado con postes de concreto, como en las fotos.
- Nuevos para colocar: semaforo (en los cruces de jirón), quiosco, triciclo, barrera, cono, bolsas, zapatilla, cocheBebe, barricada (solo sobre tiles sólidos, ej. bocas de jirón en filas 0 y 45), cartel (amarrado a postes y cercos), flag, chicha.
- treeWhite/palm traen `canopy` para el fundido. `shadowIn:true` = no agregar otra sombra.
- Puntos débiles (para el pase de pulido): maraña de cables de posteCables recargada a 1×; copas y palmeras ruidosas, con pocas masas; barricada[0] recargada.
## De vehiculos.js
- Vistas de costado nuevas: carVar/carVarW (62×17), tico/ticoW (48×14), mototaxiVarW, trailerW, trailerLargo/trailerLargoW (250×25, ahora tiene sprite propio), tractoW, contenedor[4] (92×24). Reemplazar el uso de `car` cruzado (vista de punta) por carVar de costado en la mayoría de los casos; usar los tico amarillos (en las fotos hay muchos taxis); poner tracto y contenedores sueltos cerca del patio de contenedores/almacenes.
- Volver a correr routeCheck/spawnCheck después de recolocar.
- Puntos débiles (pulido): techo de lona y cabina de la mototaxi toscos; autos con capó o puerta abierta ruidosos a 1×; en combiS el cartel tapa casi todo el parabrisas.
## De edificios-casas.js
- render.js solo copia x, y, kind de `lights`: tiene que copiar también w, h (x,y = centro del rectángulo) para que el brillo llene la ventana.
- `corner` no lo usa nadie todavía (bajo).
- Puntos débiles (pulido): azoteas de 1 piso vacías y azoteas S con pocos objetos sobre la losa; reja plegable de la botica y fierros del piso a medio hacer ruidosos a 1×.
- No se pudo verificar en pantalla después de los últimos retoques (solo sintaxis) → el QA visual tiene que mirarlo.
## De edificios-industria.js
- El motor no debe asumir `face`: el almacén con nombre usa 5 tiles de cara (4 si no tiene nombre y mide menos de 144 px). Usar el alto real del canvas o un `face` que devuelva el arquetipo para la sombra y la AO.
- roofKit existe (ACH.px.roofKit, piezas fn(g,x,y,o) con x,y en el centro de la base), pero industria no lo usó → bajo.
- dist/preview.html se cuelga entero (el juego carga bien). Probablemente por las fichas por defecto de otro arquetipo. Hay que arreglarlo.
- Puntos débiles (pulido): el tramado del techo en arco sale granulado y su curva apenas se insinúa; el auto sobre gatas parece una van.
