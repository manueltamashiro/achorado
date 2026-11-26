/* ACHORADO v0.11 — js/base/catalogo.js: datos compartidos (los escribe el arquitecto; ver V011.md §5 y §6).
   ACH.base.CATALOGO[id] = { name, tipo, w, h, desc, ... }   muebles y adornos del cuarto de la azotea (base de Alexander).
     tipo: 'piso' (se pone en el piso) · 'pared' (fila de pared, arriba) · 'alfombra' (piso, debajo de todo, se puede pisar)
     w, h: huella en tiles de 16 px · luz: {r, c} radio en px y color · baul: casillas · cama · armero: n armas · sonido: id del gancho
   ACH.VENDEDORES_DATA[id] = { name, titulo, nivel, frase, stock: [{id, precio, n?}] }   stock de cada vendedor (tienda.js / vendedores.js).
     id del stock: un id de ACH.inv.defs (va a la mochila) o un id de CATALOGO (va directo al cuarto: ACH.base.give).
   ACH.RECETAS = [{ id, out: {id, n}, need: [[id, n], ...], desc }]   recetario (inventario.js). out.id puede ser un mueble (va al cuarto). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.base = ACH.base || {};

  ACH.base.CATALOGO = {
    // --- con lo que arranca el cuarto (ACH.base.INICIAL) ---
    colchon:       { name: 'COLCHÓN VIEJO', tipo: 'piso', w: 2, h: 1, cama: true, desc: 'Huele a humedad del Callao, pero es tuyo. E para dormir: vida llena.' },
    armero:        { name: 'PERCHA DE ARMAS', tipo: 'pared', w: 2, h: 1, armero: 4, desc: 'Clavos en la pared. Cuelga hasta 4 cosas de la mano y cambia de arma.' },
    baulLata:      { name: 'BAÚL DE LATA', tipo: 'piso', w: 1, h: 1, baul: 12, desc: 'Una caja de lata con candado de juguete. Guarda 12 cosas.' },
    foco:          { name: 'FOCO PELADO', tipo: 'pared', w: 1, h: 1, luz: { r: 56, c: '#ffe7a8' }, desc: 'Un foco colgando de un cable. Ilumina, que es lo importante.' },
    // --- muebles ---
    baulMadera:    { name: 'BAÚL DE MADERA', tipo: 'piso', w: 2, h: 1, baul: 20, desc: 'Baúl tallado de la feria. Guarda 20 cosas.' },
    mesa:          { name: 'MESA', tipo: 'piso', w: 2, h: 1, desc: 'Mesa de madera con una pata más corta. Se le pone un cartón.' },
    silla:         { name: 'SILLA DE PLÁSTICO', tipo: 'piso', w: 1, h: 1, desc: 'La silla de todas las fiestas del barrio.' },
    banquito:      { name: 'BANQUITO', tipo: 'piso', w: 1, h: 1, desc: 'Hecho a mano con tablas de la calle.' },
    estante:       { name: 'ESTANTE DE CAJONES', tipo: 'piso', w: 2, h: 1, desc: 'Cajones de fruta apilados. Ordenado, por fin.' },
    radio:         { name: 'RADIO VIEJA', tipo: 'piso', w: 1, h: 1, sonido: 'radio', desc: 'E para prenderla: cumbia y chicha de una emisora que nadie sabe quién maneja.' },
    cajon:         { name: 'CAJÓN PERUANO', tipo: 'piso', w: 1, h: 1, sonido: 'cajon', desc: 'E para tocarlo. Para ensayar el gran concierto.' },
    palomar:       { name: 'PALOMAR DE TITINA', tipo: 'piso', w: 1, h: 1, palomar: true, desc: 'Una casita para Titina. Se sienta ahí cuando estás en el cuarto.' },
    // v0.13 T2 (P · G3): el taller. E en el cuarto abre las mejoras permanentes (base.js → ACH.taller). unico: la tienda no la vende dos veces.
    mesaLuthier:   { name: 'MESA DE LUTHIER', tipo: 'piso', w: 2, h: 1, taller: true, unico: true, desc: 'Banco de trabajo con prensas y cuerdas. E en tu cuarto: mochila más grande y mejoras para la guitarra.' },
    // --- luces ---
    guirnalda:     { name: 'LUCES DE COLORES', tipo: 'pared', w: 3, h: 1, luz: { r: 44, c: '#ff6ad5' }, parpadea: true, desc: 'Luces navideñas que parpadean todo el año.' },
    lamparin:      { name: 'LAMPARÍN', tipo: 'piso', w: 1, h: 1, luz: { r: 48, c: '#ffb14a' }, desc: 'Lamparín de kerosene. Luz calientita de cerro.' },
    // --- adornos de pared ---
    aficheChicha:  { name: 'AFICHE CHICHA', tipo: 'pared', w: 1, h: 1, desc: 'Fosforescente: «¡HOY! GRAN CONCIERTO». Algún día será tu nombre.' },
    banderaBlanquiazul: { name: 'BANDERITA BLANQUIAZUL', tipo: 'pared', w: 1, h: 1, desc: 'Rayas azul y blanco. Arriba el equipo, causa.' },
    cuadroGatos:   { name: 'CUADRO: GATOS DEL KENNEDY', tipo: 'pared', w: 2, h: 1, desc: 'Óleo de un pintor del anfiteatro. Los gatos salen mejor que la gente.' },
    cuadroMar:     { name: 'CUADRO: MAR DE MIRAFLORES', tipo: 'pared', w: 2, h: 1, desc: 'El mar gris con su cielo panza de burro. Bien realista.' },
    cuadroFaro:    { name: 'CUADRO: EL FARO', tipo: 'pared', w: 1, h: 1, desc: 'El faro del malecón, pintado al atardecer.' },
    // --- adornos de piso ---
    baldePlantas:  { name: 'BALDE CON PLANTAS', tipo: 'piso', w: 1, h: 1, desc: 'Culantro y hierbabuena en un balde de pintura.' },
    macetaLlanta:  { name: 'MACETA DE LLANTA', tipo: 'piso', w: 1, h: 1, desc: 'Llanta pintada de colores con su geranio. Clásico de barrio.' },
    retablo:       { name: 'RETABLO AYACUCHANO', tipo: 'piso', w: 1, h: 1, desc: 'Cajita de colores con un mundo chiquito adentro.' },
    toroPucara:    { name: 'TORITO DE PUCARÁ', tipo: 'piso', w: 1, h: 1, desc: 'Torito de cerámica para la buena suerte. Falta mucha.' },
    cojines:       { name: 'COJINES', tipo: 'piso', w: 1, h: 1, desc: 'Cojines tejidos. Para sentarse en el piso con estilo.' },
    // --- alfombras ---
    petate:        { name: 'PETATE', tipo: 'alfombra', w: 2, h: 2, desc: 'Esterita tejida. Se pisa sin miedo.' },
    mantaAndina:   { name: 'MANTA ANDINA', tipo: 'alfombra', w: 2, h: 1, desc: 'Manta de colores fuertes. Le da vida al cuarto gris.' }
  };
  // con esto arranca el cuarto la primera vez (posiciones: base.js las elige)
  ACH.base.INICIAL = ['colchon', 'armero', 'baulLata', 'foco'];

  // stock por vendedor. precio en sencillos. n = cuántos da por compra (por defecto 1).
  ACH.VENDEDORES_DATA = {
    cachinero: { name: 'DON POCHO', titulo: 'LA CACHINA DE DON POCHO', nivel: 'gambetta', frase: 'Todo usadito pero funciona, joven. Bueno, casi todo.',
      stock: [{ id: 'uhu', precio: 5 }, { id: 'cuerdas', precio: 2 }, { id: 'piedras', precio: 1, n: 10 }, { id: 'mesa', precio: 8 }, { id: 'silla', precio: 4 },
        { id: 'baulLata', precio: 10 }, { id: 'colchon', precio: 6 }, { id: 'foco', precio: 3 }, { id: 'radio', precio: 8 }, { id: 'aficheChicha', precio: 3 }, { id: 'armero', precio: 12 }, { id: 'mesaLuthier', precio: 12 }] },
    meche: { name: 'DOÑA MECHE', titulo: 'BODEGUITA DOÑA MECHE', nivel: 'cerro', frase: 'Aquí arriba todo cuesta subirlo, hijito. Por eso el precio.',
      stock: [{ id: 'gasolina', precio: 3 }, { id: 'uhu', precio: 5 }, { id: 'agua', precio: 1 }, { id: 'gaseosa', precio: 2 }, { id: 'botella', precio: 1 }, { id: 'trapo', precio: 1 },   // v0.13 T2 (C3): gasolina
        { id: 'baldePlantas', precio: 3 }, { id: 'lamparin', precio: 5 }, { id: 'banderaBlanquiazul', precio: 4 }, { id: 'petate', precio: 3 }, { id: 'estante', precio: 4 }, { id: 'palomar', precio: 6 }] },
    pepe: { name: 'DON PEPE', titulo: 'PUESTO DE INFLABLES — DON PEPE', nivel: 'miraflores', frase: 'Aquí es precio Miraflores, joven.',
      stock: [{ id: 'martilloInflable', precio: 4 }, { id: 'espadaInflable', precio: 3 }, { id: 'pistolaBurbujas', precio: 6 }, { id: 'guanteInflable', precio: 5 },
        { id: 'globosAgua', precio: 3, n: 3 }, { id: 'uhu', precio: 6 }] },
    tito: { name: 'DON TITO', titulo: 'PUESTO DE INFLABLES — DON TITO', nivel: 'miraflores', frase: 'Para el niño y para el apocalipsis, caserito.',
      stock: [{ id: 'martilloInflable', precio: 4 }, { id: 'espadaInflable', precio: 3 }, { id: 'pistolaBurbujas', precio: 6 }, { id: 'cuerdas', precio: 3 },
        { id: 'curitas', precio: 2 }, { id: 'gaseosa', precio: 3 }, { id: 'uhu', precio: 6 }, { id: 'guirnalda', precio: 8 }, { id: 'foco', precio: 4 }] },
    pintor: { name: 'EL PINTOR', titulo: 'GALERÍA DEL ANFITEATRO', nivel: 'miraflores', frase: 'Arte original, joven. Los zombies no tienen sensibilidad.',
      stock: [{ id: 'cuadroGatos', precio: 10 }, { id: 'cuadroMar', precio: 10 }, { id: 'cuadroFaro', precio: 12 }, { id: 'uhu', precio: 6 }] },
    rosa: { name: 'DOÑA ROSA', titulo: 'FERIA ARTESANAL — DOÑA ROSA', nivel: 'miraflores', frase: 'Hecho a mano, caserito. Como antes.',
      stock: [{ id: 'retablo', precio: 12 }, { id: 'toroPucara', precio: 10 }, { id: 'mantaAndina', precio: 8 }, { id: 'cojines', precio: 5 }, { id: 'baulMadera', precio: 15 }, { id: 'uhu', precio: 6 }] }
  };

  // recetario: lo usa inventario.js (B). need: [[id, n]]. Todo lo visible desde el inicio.
  ACH.RECETAS = [
    { id: 'molotov',      out: { id: 'molotov', n: 1 },      need: [['botella', 1], ['trapo', 1], ['gasolina', 1]], desc: 'Fuego en botella. Se tira con el clic (R para elegirlo).' },
    { id: 'resortera',    out: { id: 'resortera', n: 1 },    need: [['tablas', 1], ['jebe', 1]],                    desc: 'Palo y jebe. Por si perdiste la tuya.' },
    { id: 'banquito',     out: { id: 'banquito', n: 1 },     need: [['tablas', 2]],                                 desc: 'Va directo a tu cuarto.' },
    { id: 'mesa',         out: { id: 'mesa', n: 1 },         need: [['tablas', 4], ['chatarra', 1]],                desc: 'Va directo a tu cuarto.' },
    { id: 'estante',      out: { id: 'estante', n: 1 },      need: [['tablas', 3], ['chatarra', 1]],                desc: 'Va directo a tu cuarto.' },
    { id: 'baulLata',     out: { id: 'baulLata', n: 1 },     need: [['chatarra', 2], ['tablas', 2]],                desc: 'Un baúl más (12 casillas). Va directo a tu cuarto.' },
    { id: 'lamparin',     out: { id: 'lamparin', n: 1 },     need: [['botella', 1], ['trapo', 1], ['chatarra', 1]], desc: 'Luz para el cuarto. Va directo a tu cuarto.' },
    { id: 'macetaLlanta', out: { id: 'macetaLlanta', n: 1 }, need: [['jebe', 2]],                                   desc: 'Llanta pintada con su planta. Va directo a tu cuarto.' },
    { id: 'cajon',        out: { id: 'cajon', n: 1 },        need: [['tablas', 4], ['cuerdas', 1]],                 desc: 'El cajón peruano para ensayar. Va directo a tu cuarto.' }
  ];
})();
