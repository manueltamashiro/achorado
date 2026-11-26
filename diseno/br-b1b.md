# B1b · Don Jaranón (jefe de Barranco) — nota

Archivo: `juego/js/barranco/jaranon.js` (único archivo tocado). Cubre §6 de `juego/BARRANCO.md`.

## Qué hice
- Sistema `ACH.br.register({name:'jaranon', update, reset, onRespawn, mood, drawables, drawTop, onSwing, onProjectile})`.
- La peña como arena: 8 mesas + 4 columnas como `dynSolids` (`br.pena.mesa0..7`, `br.pena.columna0..3`), las mesas se rompen (10 de daño, de él o del jugador); decorado de B2b (`ACH.sprites.br.casona`: sillas, barraPena sólida `br.pena.barra`, cortina, focos, cuadros, guirnaldas). Pista de baile de losetas (15×11) que se iluminan en patrones y queman.
- Banda zombie: guitarrista (decorado) + cajonero golpeable en fase 2 (4 de vida; si toca, sube el tempo +5 % hasta ×1.2; si cae, el tempo baja).
- 3 fases (60 % / 25 %): F1 notas + pañuelo; F2 + losetas + jaraneros invocados (máx 4) + cajonero; F3 zapateo (pisotón), nota sostenida (cono 50° que barre; cubrirse tras mesas/columnas) y «sin aire» (vulnerable 2.5 s).
- Pregón + RESPUESTA: cada ciclo tiene compás(es) de pregón y de respuesta. Golpe A TIEMPO (o cualquier melodía) en la respuesta = CONTRAPUNTO: aturdido 2 s y daño ×2 (tope ×3). Si no respondes, el siguiente ataque sale «lucido» (más grande). Landó (melodía `contrapunto`) ensancha la tolerancia.
- HUD metrónomo-cajón abajo al centro (pulso, puntos del compás, «¡RESPONDE!», «¡A TIEMPO!», «¡CONTRAPUNTO!», «LANDÓ»); barra HTML `#jaranonBar` «DON JARANÓN · LA VOZ DE ORO DE BARRANCO» con marcas 60 %/25 %.
- Entrada: portón se cierra, focos se prenden, aplausos, diálogo con retrato (id `br.jaranon.intro`); reintento con línea corta. Cámara encuadra jefe + jugador durante la pelea.
- Muerte: camina a su silla, se sienta, «Ya, maestro. Ya terminó la función.», botín (12 sencillo + 1 picarones directo al inventario), flag `barranco.jefe`, +150 XP, luego `ACH.br.final.play({onEnd})` con el mundo congelado → `ACH.br.finish(stats)` (fallback `ACH.debug.win`). Con CONTINUAR y flag puesto queda sentado; E cerca de él repite el final.
- Respawn: jefe reseteado, portón abierto, jugador en la puerta con vida llena.

## API real
- `ACH.br.jaranon` = el objeto del jefe (x, y, hp, phase, state…); `ACH.cv.chef = J` solo si no existe (para perros/partida/dificultad/habilidades que miran «el jefe»; estados `entrada/pelea/muriendo`).
- Debug `ACH.debug.br.jefe`: `state()/info()`, `start(intro?)`, `fase(n)`, `hp(n)`, `win(quick)`, `resp()`, `field()`, `bot(on,{contrapunto:true|'no'|false, food})`, `arenaHere()`, `tick(dt,n)`, `K` (tuning).
- Consume: `ACH.br.beat()` (B1a; usa `floor(beat)+phase`), `ACH.audio.br.play('jefe1|2|3')/stop/setTempoMul`, `ACH.br.setTempo`, `ACH.br.penaGate {open,close}`, `ACH.world.pena` (geometría), `ACH.br.final.play/isOn`, `ACH.br.finish`, `ACH.hab.onCast`, `ACH.br.objetos.inCharco`, `ACH.dialogo.play`, `ACH.render.addLight`, `ACH.drawHooks.screen`.
- Proyectiles aceptados: cajón (área, a tiempo ×2), botella / botella dorada (resbala si cae cerca), pelota ×1.5, helado (lento), pesados, piedras, perro, burbuja/agua.

## Claves reales
- Sprites de B2c usados si existen: `ACH.sprites.br.pj.jaranon / guitarristaZ / cajoneroZ / nota`; si no, sprites provisionales horneados en el archivo.
- SFX (todos en `sfx-br.js` de B3): br.jefe.voz, br.jefe.grito, br.pena.focos, br.aplausos, br.jefe.pregon, br.metronomo, br.metronomo.responde, br.destiempo, br.jefe.sinaire, br.jefe.nota, br.jefe.panuelo, br.jefe.loseta, br.jefe.pisoton, br.jefe.sostenida, br.mesa.rompe, br.contrapunto, br.atiempo, br.jefe.duele, br.cajonero.duele, br.cajonero.cae, br.jefe.resbala, br.jefe.muere, br.jefe.sienta, br.jaranero.llega, br.porton.cierra/abre (+ `coin` del motor).
- Flag: `barranco.jefe` (ACH.partida.flag + BR.flag('jefe')). Checkpoints intentados: 'penaPuerta','pena','puerta','peña'.

## Balance (probado con bot, nivel.js real)
- Solo guitarra + 2 comidas, sin contrapuntos: gana en ~67 s (3 de 4 corridas; 1 muerte en fase 3 con el bot tonto).
- Con contrapuntos: ~34–45 s, recibe muy poco daño.
- HP 48, fases 0.6/0.25; tolerancia 0.12 s (×1.5 en dificultad «tranqui»).

## Qué falta / supuestos
- Botín va directo al inventario (no se tira al suelo).
- Supongo cajonero/tabladillo transitables (no son sólidos).
- El mensaje de `dificultad.js` al morir habla de «chef» (viene del alias `ACH.cv.chef`); no es mío.
- Voz: solo SFX `br.jefe.voz`, burbuja propia (no `ACH.audio.say`, para no duplicar burbujas).

## Problemas encontrados (ajenos)
- **Recursión infinita en `ACH.inv.isOpen`** entre `js/miraflores/inflables.js` (`wrapInvOpen`, línea ~323, reasigna `origInvOpen`) y `js/barranco/vecinos.js` (`wrapIsOpen`, línea ~267). Ambos se re-envuelven en cada reset → `Maximum call stack size exceeded` en barranco.html. Arreglo sugerido: que `inflables.js` no reasigne `origInvOpen` si ya existe (o que ambos marquen con un flag común).
- El reloj interno de `ACH.br.beat()` (B1a) va con tiempo real (`performance.now`), no con el tiempo del juego: en pruebas aceleradas con `ACH.game.step` el pulso casi no avanza (en juego normal no importa).
