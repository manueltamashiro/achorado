/* ACHORADO v0.14 — js/engine/postfx.js  «Capa A: lente WebGL sobre el mundo» (contrato juego/V014.md)
 * SOLO PRESENTACIÓN: no toca lógica, posiciones ni colisiones. #world (2D, ~480×270) se sigue dibujando igual; aquí se sube como
 * textura cada cuadro y se presenta en <canvas id="worldfx"> (mismo rect, encima, pointer-events:none) con esta cadena:
 *   1. escalado de pixel art xBR‑lv2 (Hyllian, reescrito aquí en GLSL ES 1.0) a escala entera N → textura A (bordes redondeados y
 *      diagonales limpias, SIN el borrón bilinear; el antialias de las líneas mide ~1 px de salida)
 *   2. A → Q (¼ de la salida, color completo: desenfoque del tilt‑shift y color de la bruma)
 *   3. bloom: Q → B1 (umbral suave, pesa más lo saturado: faroles, fuego, neones) → B2 → B3 → vuelta sumando (U2, U1)
 *   4. composición en pantalla: inclinación de cámara (homografía: abajo ~5 % más grande que arriba, sin bordes vacíos),
 *      aberración ≤0.5 px en los bordes, tilt‑shift arriba (~17 %) y abajo (~9 %), bruma de distancia hacia arriba, bloom,
 *      gradación filmica sutil (curva S suave + split‑tone frío/cálido), viñeta suave y grano muy leve.
 * Niveles: ALTO (todo) · MEDIO (sin tilt‑shift ni aberración, bloom 1 nivel, dpr ≤1.5) · CLÁSICO (apagado: #world pixelado como antes).
 * localStorage['ach.gfx'] = 'alto'|'medio'|'clasico'; ?fx=0 fuerza CLÁSICO (?fx=medio / ?fx=alto también). Sin WebGL o con el contexto
 * perdido → CLÁSICO solo, sin romper nada. Auto (v0.15 E): por COSTO del cuadro (render + presentación): > P.costHi de media en
 * P.slowWin s jugando → baja un paso; < P.costLo sostenido → sube (no se guarda); en táctil la ventana la lleva tactil.js (judge()).
 * Otros lienzos pixelados (.cm-cv de la cinemática, .bz-cv del cuarto) se adjuntan solos (MutationObserver) con
 * attach(cv, {warp:false, dof:false}): escalado + gradación + bloom, en su propio rAF y solo mientras se ven.
 * API: ACH.postfx = { on(), level(), setLevel(l), toWorld(x,y), toScreen(x,y), attach(cv,opts), stats(), bench(n), autoDrop(), P }
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  // v0.14.1: 0 de día → 1 de noche (ACH.noche.t); los lienzos adjuntos (cuarto, cinemática) van como de día
  function nightK() { var N = ACH.noche; return N && N.t > 0 ? Math.min(1, N.t) : 0; }

  // ---------------- Parámetros ajustables (en vivo: ACH.postfx.P.x = …) ----------------
  var P = {
    warp: 0.05,          // inclinación: la fila de abajo se ve (1+warp) veces la de arriba. 0 = plano
    dofTop: 0.85,        // tilt‑shift: fuerza arriba (0..1)
    dofBot: 0.55,        // tilt‑shift: fuerza abajo
    dofTopH: 0.17,       // alto de la franja desenfocada de arriba (fracción de pantalla)
    dofBotH: 0.09,       // ídem abajo
    haze: 0.085,         // bruma de distancia (máximo, en la fila de arriba). v0.14.1: 0.11 → 0.085 (en el Cerro de día salía blanquecina)
    hazeLift: 0.006,     // v0.14.1: cuánto aclara la bruma sobre el color local (antes fijo 0.025 + ×1.03: blanqueaba)
    hazeDesat: 0.45,     // v0.14.1: cuánto desatura la bruma el color local (antes 0.65)
    hazeNight: 1.0,      // v0.14.1: bruma de noche × esto (de día × 1; la de noche ya se oscurece sola con el color local)
    hazeH: 0.62,         // hasta dónde baja la bruma (fracción de pantalla)
    bloom: 0.50,         // intensidad del bloom
    bloomThr: 0.60,      // umbral (canal máximo) y rodilla del bloom
    bloomKnee: 0.28,
    bloomDay: 0.40,      // v0.14.1: el bloom escala con la noche (ACH.noche.t): de día × bloomDay, de noche × 1
    bloomThrDay: 0.14,   // v0.14.1: de día el umbral sube esto (farolas de Miraflores sobre el follaje ya no brillan tanto)
    grade: 1.0,          // gradación filmica (0 = sin tocar el color)
    vig: 0.14,           // viñeta propia (render.js ya tiene la suya: esta es leve)
    grain: 0.016,        // grano (amplitud)
    ca: 0.5,             // aberración cromática en las esquinas, en px de salida (solo ALTO)
    eq: 0.30,            // xBR: umbral de «iguales» (luma 0..1)
    minC: 0.075,         // v0.14.1: xBR solo redondea bordes con contraste de luma ≥ minC (texturas de tierra, adoquín y niebla quedan
    minC2: 0.16,         //   como píxel nítido: ya no se «planchan»); entre minC y minC2 entra de a poco. 0 = como v0.14
    lowSoft: 1.0,        // v0.14.1: en esas zonas de poco contraste, mezcla bilineal (degradés de luz sin escalones). 0 = píxel duro
    soft: 1.0,           // xBR: ancho del antialias de las diagonales (en px de A)
    hdThr: 0.05, hdThr2: 0.12,   // v0.15 (A): bloque K×K «no parejo» (suma de |ΔRGB|) desde el que el texel HD gana al xBR lógico
    dprMax: 2, maxW: 2560,
    // v0.15 (E, F1): calidad automática por COSTO del cuadro (render + presentación, performance.now), no por el intervalo de rAF
    slowWin: 4,          // ventana (s de juego visible y con foco) sobre la que se promedia el costo
    costHi: 12,          // baja un paso si el costo medio de la ventana supera esto (ms; el cuadro de 60 Hz son 16,7)
    costHiTouch: 10,     // ídem en táctil (tactil.js: además quedan la lógica y la interfaz en el mismo cuadro)
    costLo: 6,           // sube un paso si el costo medio queda por debajo de esto…
    raiseWin: 8,         // …durante tantos segundos seguidos (histéresis: entre costLo y costHi no se hace nada)
    raiseBack: 20,       // si baja de nuevo antes de tantos s después de subir, la espera para volver a subir se duplica…
    raiseWaitMax: 120,   // …hasta este tope (s)
    spikeMs: 120,        // cuadros sueltos más caros que esto (atlas HD, GC, rehorneado) no cuentan
    settle: 1.5          // s sin medir tras cada cambio de calidad
  };
  var CFG = {
    alto:  { warp: 1, dof: 1, ca: 1, bloomLv: 3, dpr: 2 },
    medio: { warp: 1, dof: 0, ca: 0, bloomLv: 1, dpr: 1.5 }
  };
  var NAMES = { alto: 'ALTO', medio: 'MEDIO', clasico: 'CLÁSICO' }, ORDER = ['alto', 'medio', 'clasico'], KEY = 'ach.gfx';

  /* ---------------- Shaders ---------------- */
  var VS = 'attribute vec2 aP; varying vec2 vUv; void main(){ vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }';
  var HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 vUv;\n';

  // 1. xBR‑lv2 a escala entera. Rejilla (y hacia abajo = filas del lienzo):
  //          A1 B1 C1
  //       A0 A  B  C  C4
  //       D0 D  E  F  F4
  //       G0 G  H  I  I4
  //          G5 H5 I5
  // Las 4 esquinas van en un vec4 en orden (abajo‑der, arriba‑der, arriba‑izq, abajo‑izq) con coordenadas locales espejadas
  // (u,v: la esquina queda siempre en (1,1)). Las líneas: 45° u+v=1.5, 30° v+u/2=1, 60° 2u+v=2 (como xBR‑lv2).
  var FS_XBR = HEAD + [
    'uniform sampler2D uSrc; uniform vec2 uSrcSize; uniform float uDelta; uniform float uEq; uniform vec2 uMinC; uniform float uLowSoft;',
    // v0.15 (A): uK = píxeles de #world por píxel lógico; uTex = tamaño real de la textura. xBR corre en la rejilla LÓGICA (muestra el
    // texel de arriba-izquierda de cada bloque K×K); donde el bloque no es parejo (personaje HD) gana el texel fino, nítido (uHd = umbral).
    'uniform float uK; uniform vec2 uTex; uniform vec2 uHd;',
    'const vec3 Yw = vec3(0.2126, 0.7152, 0.0722);',
    '#define T(x,y) texture2D(uSrc, ((c + vec2(x, y)) * uK - 0.5 * uK + 0.5) / uTex).rgb',
    '#define TF(q) texture2D(uSrc, (q) / uTex).rgb',
    'vec4 df(vec4 a, vec4 b){ return abs(a - b); }',
    'vec4 neq(vec4 a, vec4 b){ return step(0.00002, abs(a - b)); }',
    'vec4 eqf(vec4 a, vec4 b){ return 1.0 - step(uEq, abs(a - b)); }',
    'vec4 wd(vec4 a, vec4 b, vec4 c, vec4 d, vec4 e, vec4 f, vec4 g, vec4 h){ return df(a,b) + df(a,c) + df(d,e) + df(d,f) + 4.0 * df(g,h); }',
    'float cdf(vec3 a, vec3 b){ vec3 d = abs(a - b); return d.r + d.g + d.b; }',
    'void main(){',
    '  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSrcSize;',
    '  vec2 c = floor(p) + 0.5; vec2 fp = p - floor(p);',
    '  vec3 A1=T(-1.,-2.), B1=T(0.,-2.), C1=T(1.,-2.);',
    '  vec3 A0=T(-2.,-1.), A=T(-1.,-1.), B=T(0.,-1.), C=T(1.,-1.), C4=T(2.,-1.);',
    '  vec3 D0=T(-2.,0.), D=T(-1.,0.), E=T(0.,0.), F=T(1.,0.), F4=T(2.,0.);',
    '  vec3 G0=T(-2.,1.), G=T(-1.,1.), H=T(0.,1.), I=T(1.,1.), I4=T(2.,1.);',
    '  vec3 G5=T(-1.,2.), H5=T(0.,2.), I5=T(1.,2.);',
    '  float lA=dot(A,Yw), lB=dot(B,Yw), lC=dot(C,Yw), lD=dot(D,Yw), lE=dot(E,Yw), lF=dot(F,Yw), lG=dot(G,Yw), lH=dot(H,Yw), lI=dot(I,Yw);',
    '  float lA0=dot(A0,Yw), lA1=dot(A1,Yw), lB1=dot(B1,Yw), lC1=dot(C1,Yw), lC4=dot(C4,Yw), lD0=dot(D0,Yw), lF4=dot(F4,Yw);',
    '  float lG0=dot(G0,Yw), lG5=dot(G5,Yw), lH5=dot(H5,Yw), lI4=dot(I4,Yw), lI5=dot(I5,Yw);',
    '  vec4 e = vec4(lE);',
    '  vec4 f = vec4(lF, lF, lD, lD), h = vec4(lH, lB, lB, lH), i = vec4(lI, lC, lA, lG);',
    '  vec4 b = vec4(lB, lH, lH, lB), d = vec4(lD, lD, lF, lF), cc = vec4(lC, lI, lG, lA), g = vec4(lG, lA, lC, lI);',
    '  vec4 f4 = vec4(lF4, lF4, lD0, lD0), h5 = vec4(lH5, lB1, lB1, lH5), i4 = vec4(lI4, lC4, lA0, lG0), i5 = vec4(lI5, lC1, lA1, lG5);',
    '  vec4 r1 = neq(e,f) * neq(e,h) * clamp((1.0 - eqf(f,b)) * (1.0 - eqf(h,d)) + eqf(e,i) * (1.0 - eqf(f,i4)) * (1.0 - eqf(h,i5)) + eqf(e,g) + eqf(e,cc), 0.0, 1.0);',
    '  vec4 rL = neq(e,g) * neq(d,g), rU = neq(e,cc) * neq(b,cc);',
    '  vec4 edr = step(wd(e,cc,g,i,h5,f4,h,f) + 0.00001, wd(h,d,i5,f,i4,b,e,i)) * r1;',
    '  vec4 edrL = step(2.0 * df(f,g), df(h,cc)) * rL, edrU = step(2.0 * df(h,cc), df(f,g)) * rU;',
    '  vec4 u = vec4(fp.x, fp.x, 1.0 - fp.x, 1.0 - fp.x), v = vec4(fp.y, 1.0 - fp.y, 1.0 - fp.y, fp.y);',
    '  vec4 dl = vec4(uDelta);',
    '  vec4 fx45 = smoothstep(vec4(1.5) - dl * 1.414, vec4(1.5) + dl * 1.414, u + v);',
    '  vec4 fx30 = smoothstep(vec4(1.0) - dl * 1.118, vec4(1.0) + dl * 1.118, v + 0.5 * u);',
    '  vec4 fx60 = smoothstep(vec4(2.0) - dl * 2.236, vec4(2.0) + dl * 2.236, 2.0 * u + v);',
    '  vec4 m = max(edr * fx45, max(edr * edrL * fx30, edr * edrU * fx60));',
    // v0.14.1: compuerta de contraste: en texturas suaves (tierra, adoquín, degradés de niebla) no se redondea
    '  if (uMinC.y > 0.0) m *= smoothstep(vec4(uMinC.x), vec4(uMinC.y), max(df(e,f), df(e,h)));',
    '  vec4 px = step(df(e,f), df(e,h));',   // 1 → toma el vecino horizontal (f), 0 → el vertical (h)
    '  vec3 r1c = mix(mix(E, mix(H, F, px.x), m.x), mix(B, D, px.z), m.z);',
    '  vec3 r2c = mix(mix(E, mix(B, F, px.y), m.y), mix(H, D, px.w), m.w);',
    '  vec3 outc = mix(r1c, r2c, step(cdf(E, r1c), cdf(E, r2c)));',
    // v0.14.1: en zonas de poco contraste (degradés de luz, niebla, tierra) mezcla bilineal suave en vez de bloques de N×N
    '  if (uLowSoft > 0.0 && uMinC.y > 0.0) {',
    '    float lc = max(max(abs(lE - lF), abs(lE - lD)), max(abs(lE - lH), abs(lE - lB)));',
    '    float lw = uLowSoft * (1.0 - smoothstep(uMinC.x, uMinC.y, lc));',
    '    vec2 q = fp - 0.5; vec2 aq = abs(q);',
    '    vec3 sx = q.x < 0.0 ? D : F; vec3 sy = q.y < 0.0 ? B : H;',
    '    vec3 sxy = q.x < 0.0 ? (q.y < 0.0 ? A : G) : (q.y < 0.0 ? C : I);',
    '    vec3 bil = mix(mix(E, sx, aq.x), mix(sy, sxy, aq.x), aq.y);',
    '    outc = mix(outc, bil, lw);',
    '  }',
    // v0.15 (A): bloques no parejos (detalle HD de personajes) → el texel fino, sin redondear ni mezclar. También si un vecino lo es
    // (borde del personaje): así el xBR lógico no «come» el contorno HD. Con uK = 1 no corre (idéntico a v0.14).
    '  if (uK > 1.5) {',
    '    vec2 b0 = floor(p) * uK + 0.5;',
    '    float bd = max(cdf(E, TF(b0 + vec2(1., 0.))), max(cdf(E, TF(b0 + vec2(0., 1.))), cdf(E, TF(b0 + vec2(1., 1.)))));',
    '    float nb = max(max(cdf(D, TF(b0 + vec2(1. - uK, 1.))), cdf(F, TF(b0 + vec2(1. + uK, 1.)))), max(cdf(B, TF(b0 + vec2(1., 1. - uK))), cdf(H, TF(b0 + vec2(1., 1. + uK)))));',
    '    float hw = smoothstep(uHd.x, uHd.y, max(bd, nb));',
    '    if (hw > 0.0) { vec2 pf = vec2(vUv.x, 1.0 - vUv.y) * uTex; outc = mix(outc, TF(floor(pf) + 0.5), hw); }',
    '  }',
    '  gl_FragColor = vec4(outc, 1.0);',
    '}'
  ].join('\n');

  // 2/3. bajada con 4 muestras bilineales (caja), con umbral opcional (uThr < 0 = sin umbral)
  var FS_DOWN = HEAD + [
    'uniform sampler2D uT; uniform vec2 uTex; uniform vec2 uOff; uniform float uThr; uniform float uKnee;',
    'void main(){',
    '  vec2 o = uOff / uTex;',
    '  vec3 c = 0.25 * (texture2D(uT, vUv + vec2(-o.x, -o.y)).rgb + texture2D(uT, vUv + vec2(o.x, -o.y)).rgb +',
    '                   texture2D(uT, vUv + vec2(-o.x, o.y)).rgb + texture2D(uT, vUv + vec2(o.x, o.y)).rgb);',
    '  if (uThr >= 0.0) {',
    '    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));',
    '    float k = smoothstep(uThr, uThr + uKnee, mx) * (0.30 + 0.70 * clamp((mx - mn) * 2.5, 0.0, 1.0));',
    '    c *= k;',
    '  }',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  // subida: alto + bajo (carpa de 4 muestras) * uK
  var FS_UP = HEAD + [
    'uniform sampler2D uHi; uniform sampler2D uLo; uniform vec2 uLoTex; uniform float uK;',
    'void main(){',
    '  vec2 o = 0.5 / uLoTex;',
    '  vec3 lo = 0.25 * (texture2D(uLo, vUv + vec2(-o.x, -o.y)).rgb + texture2D(uLo, vUv + vec2(o.x, -o.y)).rgb +',
    '                    texture2D(uLo, vUv + vec2(-o.x, o.y)).rgb + texture2D(uLo, vUv + vec2(o.x, o.y)).rgb);',
    '  gl_FragColor = vec4(texture2D(uHi, vUv).rgb + lo * uK, 1.0);',
    '}'
  ].join('\n');

  // 4. composición en pantalla
  var FS_COMP = HEAD + [
    'uniform sampler2D uA; uniform sampler2D uQ; uniform sampler2D uB;',
    'uniform vec2 uOut; uniform vec2 uQTex; uniform float uWarp; uniform float uBloom; uniform float uDofT; uniform float uDofB;',
    'uniform float uDofTH; uniform float uDofBH; uniform float uHaze; uniform float uHazeH; uniform float uVig; uniform float uGrain;',
    'uniform float uCA; uniform float uTime; uniform float uGrade; uniform vec2 uHazeC;',
    'const vec3 Yw = vec3(0.2126, 0.7152, 0.0722);',
    'vec2 unwarp(vec2 s){',   // pantalla (y abajo) → mundo (y abajo): inversa exacta de toScreen()
    '  float t = uWarp; float y = s.y * (1.0 + t) / (1.0 + t * s.y);',
    '  float z = 1.0 + t * (1.0 - y);',
    '  return vec2(0.5 + (s.x - 0.5) * z / (1.0 + t), y);',
    '}',
    'void main(){',
    '  vec2 s = vec2(vUv.x, 1.0 - vUv.y);',
    '  vec2 w = uWarp > 0.0 ? unwarp(s) : s;',
    '  vec2 tc = vec2(w.x, 1.0 - w.y);',
    '  vec3 col = texture2D(uA, tc).rgb;',
    '  vec2 dc = s - 0.5; float r2 = dot(dc, dc);',
    '  if (uCA > 0.0) {',
    '    vec2 o = dc / max(length(dc), 0.0001) * uCA * (2.0 * r2) / uOut; o.y = -o.y;',
    '    col.r = texture2D(uA, tc + o).r; col.b = texture2D(uA, tc - o).b;',
    '  }',
    '  float m = 0.0;',
    '  if (uDofT > 0.0) m = uDofT * smoothstep(uDofTH, 0.0, s.y) + uDofB * smoothstep(1.0 - uDofBH, 1.0, s.y);',
    '  vec2 qo = (0.7 + 1.6 * m) / uQTex;',
    '  vec3 qb = 0.25 * (texture2D(uQ, tc + vec2(-qo.x, -qo.y)).rgb + texture2D(uQ, tc + vec2(qo.x, -qo.y)).rgb +',
    '                    texture2D(uQ, tc + vec2(-qo.x, qo.y)).rgb + texture2D(uQ, tc + vec2(qo.x, qo.y)).rgb);',
    '  col = mix(col, qb, m);',
    '  float hz = uHaze * pow(1.0 - smoothstep(0.0, uHazeH, s.y), 1.6);',
    '  vec3 hc = mix(qb, vec3(dot(qb, Yw)), uHazeC.x) + uHazeC.y;',   // v0.14.1: toma el color local (antes ×1.03 + 0.025: blanqueaba)
    '  col = mix(col, hc, hz);',
    '  col += texture2D(uB, tc).rgb * uBloom;',
    '  col = clamp(col, 0.0, 1.0);',
    '  float l = dot(col, Yw);',
    '  col = mix(col, col * col * (3.0 - 2.0 * col), 0.16 * uGrade);',
    '  col += uGrade * ((1.0 - l) * (1.0 - l) * vec3(-0.010, 0.000, 0.014) + l * l * vec3(0.014, 0.006, -0.010));',
    '  col *= 1.0 - uVig * smoothstep(0.30, 0.80, length(dc * vec2(1.0, 0.9)));',
    '  float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime * 37.0, uTime * 61.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;',
    '  col += n * uGrain;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ---------------- Lente: un contexto WebGL por lienzo ---------------- */
  function Lens(src, opts) {
    this.src = src; this.o = opts || {}; this.main = !!this.o.main;
    var cv = this.cv = document.createElement('canvas');
    if (this.main) cv.id = 'worldfx'; else cv.className = 'pfx-att';
    cv.setAttribute('aria-hidden', 'true');
    var s = cv.style;
    s.position = 'absolute'; s.pointerEvents = 'none'; s.display = 'none'; s.imageRendering = 'auto';
    if (this.main) { s.left = '0'; s.top = '0'; s.width = '100%'; s.height = '100%'; }
    this.lost = false; this.ok = false; this.err = '';
    this.T = {}; this.W = 0; this.H = 0; this.N = 0; this.sw = 0; this.sh = 0;
    this.cpu = 0; this.gpu = 0; this.n = 0;
    var self = this;
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.ok = false; self.hide(); }, false);
    cv.addEventListener('webglcontextrestored', function () { self.lost = false; self.T = {}; self.W = self.H = self.sw = self.sh = 0; self.ok = self.init(); }, false);
    this.ok = this.init();
  }
  Lens.prototype.hide = function () { if (this.cv.style.display !== 'none') this.cv.style.display = 'none'; };
  Lens.prototype.show = function () { if (this.cv.style.display !== 'block') this.cv.style.display = 'block'; };
  Lens.prototype.init = function () {
    var a = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    var gl = null;
    try { gl = this.gl || this.cv.getContext('webgl', a) || this.cv.getContext('experimental-webgl', a); } catch (e) { gl = null; }
    if (!gl) { this.err = 'sin WebGL'; return false; }
    this.gl = gl;
    try {
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
      this.pX = prog(gl, FS_XBR); this.pD = prog(gl, FS_DOWN); this.pU = prog(gl, FS_UP); this.pC = prog(gl, FS_COMP);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      this.srcTex = tex(gl, gl.NEAREST);
    } catch (e) { this.err = String(e && e.message || e); return false; }
    this.err = '';
    return true;
  };
  function prog(gl, fs) {
    function sh(type, txt) {
      var s = gl.createShader(type); gl.shaderSource(s, txt); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aP'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('link: ' + gl.getProgramInfoLog(p));
    var u = {};
    return { p: p, u: function (n) { return n in u ? u[n] : (u[n] = gl.getUniformLocation(p, n)); } };
  }
  function tex(gl, filt) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  Lens.prototype.target = function (name, w, h) {
    var gl = this.gl, t = this.T[name];
    w = Math.max(1, w | 0); h = Math.max(1, h | 0);
    if (t && t.w === w && t.h === h) return t;
    if (t) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); }
    t = { w: w, h: h, tex: tex(gl, gl.LINEAR), fb: gl.createFramebuffer() };
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    this.T[name] = t;
    return t;
  };
  Lens.prototype.destroy = function () {
    var gl = this.gl;
    try { var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* nada */ }
    if (this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
    this.gl = null; this.ok = false; this.dead = true;
  };
  // tamaño del búfer: rect CSS × min(dpr, tope), ancho ≤ P.maxW
  Lens.prototype.size = function (cssW, cssH, dprCap) {
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap, P.dprMax);
    var W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    if (W > P.maxW) { H = Math.round(H * P.maxW / W); W = P.maxW; }
    W = Math.max(1, W); H = Math.max(1, H);
    if (W !== this.cv.width || H !== this.cv.height) { this.cv.width = W; this.cv.height = H; }
    this.W = W; this.H = H;
  };
  function pass(gl, pr, t, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
    gl.viewport(0, 0, t ? t.w : w, t ? t.h : h);
    gl.useProgram(pr.p);
  }
  function bindT(gl, unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }
  // cuadro completo: sube src y corre la cadena. warp/dof = 0 para los lienzos adjuntos.
  Lens.prototype.present = function (cfg, warp, dof, finish) {
    var gl = this.gl, src = this.src;
    if (!this.ok || this.lost || !gl || gl.isContextLost()) return false;
    var sw = src.width | 0, sh = src.height | 0;
    if (sw < 2 || sh < 2) return false;
    // modo medición: vaciar antes la cola de la GPU (el 2D de #world también va por GPU) para medir solo esta lente
    if (finish) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.px1 || (this.px1 = new Uint8Array(4)));
    var t0 = now();
    // subir el lienzo 2D
    bindT(gl, 0, this.srcTex);
    try {
      if (sw !== this.sw || sh !== this.sh) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); this.sw = sw; this.sh = sh; }
      else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
    } catch (e) { this.err = 'upload: ' + (e && e.message); return false; }
    var W = this.W, H = this.H, tw = warp ? P.warp : 0;
    // 1. xBR a escala entera N (≈ la salida; con la inclinación, la fila de abajo se agranda 1+warp)
    // v0.15 (A): con #world a K× (personajes HD), N se calcula sobre la vista LÓGICA (lw = sw/K): A mide lo mismo que en v0.14
    var K = this.main && ACH.render && ACH.render.K ? ACH.render.K() | 0 : 1;
    if (K < 1 || sw % K || sh % K) K = 1;
    var lw = sw / K, lh = sh / K;
    var N = Math.max(1, Math.min(6, Math.round(W * (1 + tw * 0.5) / lw)));
    if (K > 1 && N > 1 && N % K) N = Math.min(6, Math.max(K, Math.round(N / K) * K));   // texel fino = N/K px enteros (nítido parejo)
    while (N > 1 && (lw * N > this.maxTex || lh * N > this.maxTex)) N--;
    this.N = N;
    this.K = K;
    var A = this.target('A', lw * N, lh * N);
    pass(gl, this.pX, A); bindT(gl, 0, this.srcTex);
    gl.uniform1i(this.pX.u('uSrc'), 0); gl.uniform2f(this.pX.u('uSrcSize'), lw, lh);
    gl.uniform1f(this.pX.u('uK'), K); gl.uniform2f(this.pX.u('uTex'), sw, sh); gl.uniform2f(this.pX.u('uHd'), P.hdThr, Math.max(P.hdThr + 0.001, P.hdThr2));
    gl.uniform1f(this.pX.u('uDelta'), 0.5 * P.soft / N); gl.uniform1f(this.pX.u('uEq'), P.eq);
    gl.uniform1f(this.pX.u('uLowSoft'), P.lowSoft);
    gl.uniform2f(this.pX.u('uMinC'), P.minC, Math.max(P.minC + 0.001, P.minC2) * (P.minC > 0 ? 1 : 0));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 2. A → Q (¼ de la salida)
    var Q = this.target('Q', Math.max(2, Math.round(W / 4)), Math.max(2, Math.round(H / 4)));
    var pD = this.pD;
    function down(srcT, dstT, thr) {
      pass(gl, pD, dstT); bindT(gl, 0, srcT.tex);
      var r = Math.max(1, srcT.w / dstT.w);
      gl.uniform1i(pD.u('uT'), 0); gl.uniform2f(pD.u('uTex'), srcT.w, srcT.h);
      gl.uniform2f(pD.u('uOff'), Math.max(0.5, r * 0.25), Math.max(0.5, r * 0.25));
      gl.uniform1f(pD.u('uThr'), thr); gl.uniform1f(pD.u('uKnee'), P.bloomKnee);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    down(A, Q, -1);
    // 3. bloom
    var B1 = this.target('B1', Q.w / 2, Q.h / 2), bl = B1;
    var nt = nightK(); this.nt = nt;
    down(Q, B1, P.bloomThr + (warp ? P.bloomThrDay * (1 - nt) : 0));   // v0.14.1: de día el umbral sube
    if (cfg.bloomLv >= 3) {
      var B2 = this.target('B2', B1.w / 2, B1.h / 2), B3 = this.target('B3', B2.w / 2, B2.h / 2);
      down(B1, B2, -1); down(B2, B3, -1);
      var U2 = this.target('U2', B2.w, B2.h), U1 = this.target('U1', B1.w, B1.h), pU = this.pU;
      var up = function (hi, lo, dst, k) {
        pass(gl, pU, dst); bindT(gl, 0, hi.tex); bindT(gl, 1, lo.tex);
        gl.uniform1i(pU.u('uHi'), 0); gl.uniform1i(pU.u('uLo'), 1); gl.uniform2f(pU.u('uLoTex'), lo.w, lo.h); gl.uniform1f(pU.u('uK'), k);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      up(B2, B3, U2, 0.9); up(B1, U2, U1, 0.8);
      bl = U1;
    }
    // 4. composición
    var pC = this.pC;
    pass(gl, pC, null, W, H);
    bindT(gl, 0, A.tex); bindT(gl, 1, Q.tex); bindT(gl, 2, bl.tex);
    gl.uniform1i(pC.u('uA'), 0); gl.uniform1i(pC.u('uQ'), 1); gl.uniform1i(pC.u('uB'), 2);
    gl.uniform2f(pC.u('uOut'), W, H); gl.uniform2f(pC.u('uQTex'), Q.w, Q.h);
    gl.uniform1f(pC.u('uWarp'), tw);
    gl.uniform1f(pC.u('uBloom'), P.bloom * (cfg.bloomLv >= 3 ? 0.55 : 1) * (warp ? P.bloomDay + (1 - P.bloomDay) * nt : 1));   // v0.14.1: escala con la noche
    gl.uniform1f(pC.u('uDofT'), dof && cfg.dof ? P.dofTop : 0); gl.uniform1f(pC.u('uDofB'), P.dofBot);
    gl.uniform1f(pC.u('uDofTH'), P.dofTopH); gl.uniform1f(pC.u('uDofBH'), P.dofBotH);
    gl.uniform1f(pC.u('uHaze'), warp ? P.haze * (1 + (P.hazeNight - 1) * nt) : 0); gl.uniform1f(pC.u('uHazeH'), P.hazeH);
    gl.uniform2f(pC.u('uHazeC'), P.hazeDesat, P.hazeLift);
    gl.uniform1f(pC.u('uVig'), warp ? P.vig : P.vig * 0.5); gl.uniform1f(pC.u('uGrain'), P.grain);
    gl.uniform1f(pC.u('uCA'), cfg.ca && warp ? P.ca : 0);
    gl.uniform1f(pC.u('uTime'), (t0 / 1000) % 100); gl.uniform1f(pC.u('uGrade'), P.grade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // gl.finish() en Chrome no siempre bloquea: leer 1 píxel sí obliga a esperar a la GPU (solo en modo medición)
    if (finish) { gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.px1 || (this.px1 = new Uint8Array(4))); }
    var ms = now() - t0;
    this.n++;
    if (finish) this.gpu = this.gpu ? this.gpu * 0.9 + ms * 0.1 : ms; else this.cpu = this.cpu ? this.cpu * 0.95 + ms * 0.05 : ms;
    this.lastMs = ms;
    return true;
  };

  /* ---------------- Estado global ---------------- */
  var qs = location.search || '', forced = null;
  var mq = /[?&]fx=([a-z0-9]+)/i.exec(qs);
  if (mq) { var fv = mq[1].toLowerCase(); forced = fv === '0' || fv === 'clasico' || fv === 'off' ? 'clasico' : fv === 'medio' ? 'medio' : fv === 'alto' || fv === '1' ? 'alto' : null; }
  function saved() { try { var v = window.localStorage.getItem(KEY); return ORDER.indexOf(v) >= 0 ? v : null; } catch (e) { return null; } }
  function coarse() { try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } }
  var cur = forced || saved() || (coarse() ? 'medio' : 'alto');
  var auto = !forced && !saved();   // auto‑bajada solo si el jugador no eligió (y nunca se guarda)
  var drops = [], main = null, attached = [], failReason = '', finishMode = /[?&]fxdebug=1/.test(qs);
  var mon = { last: 0, acc: 0, n: 0, sum: 0, cost: 0, frame: 0, good: 0, stack: [], raiseAt: 0, raiseWait: 0, settle: 0 }, raises = [];

  function glOk() { return !!(main && main.ok && !main.lost); }
  function active() { return cur !== 'clasico' && glOk(); }
  function lvl() { return glOk() ? cur : 'clasico'; }

  function worldCv() { return document.getElementById('world'); }
  function ensureMain(src) {
    if (failReason && !main) return null;
    if (!main) {
      main = new Lens(src, { main: true });
      if (!main.ok) { failReason = main.err || 'sin WebGL'; console.warn('[ACHORADO] postfx: ' + failReason + ' → CLÁSICO'); return main; }
    }
    if (main.src !== src) { main.src = src; main.sw = main.sh = 0; }
    if (src.parentNode && src.nextSibling !== main.cv) src.parentNode.insertBefore(main.cv, src.nextSibling);
    return main;
  }

  function presentWorld(src) {
    var L = ensureMain(src);
    if (!L) return;
    if (cur === 'clasico' || !L.ok || L.lost) { L.hide(); return; }
    var cfg = CFG[cur];
    L.size(src.clientWidth || 1, src.clientHeight || 1, cfg.dpr);
    if (L.present(cfg, cfg.warp, cfg.dof, finishMode)) L.show(); else L.hide();
  }

  /* v0.15 (E, F1): calidad automática por COSTO medido del cuadro (render + presentación, con performance.now), no por el dt de rAF:
     un rAF a 30 fps (pantalla de 30–50 Hz, Safari en bajo consumo, ventana sin foco) ya no la dispara si el cuadro es barato.
     - Solo se mide jugando, con la pestaña visible y con foco; picos sueltos (> P.spikeMs) no cuentan; tras cada cambio, P.settle s sin medir.
     - Baja (media de la ventana > P.costHi): lente ALTO → MEDIO → CLÁSICO y, al final, PERSONAJES HD → CLÁSICO (HD cuesta +0,5–0,9 ms).
     - Sube (media < P.costLo sostenida P.raiseWin s): deshace la última bajada (pila). Si vuelve a bajar antes de P.raiseBack s,
       la espera para subir se duplica (hasta P.raiseWaitMax): no oscila.
     - Lo que el jugador eligió en OPCIONES (ach.gfx / ach.hd) o lo forzado por ?fx= / ?hd= nunca se toca.
     En táctil la ventana la lleva tactil.js (perf) y decide por judge(), que además baja/sube sus partículas. */
  function focused() { try { return !document.hasFocus || document.hasFocus(); } catch (e) { return true; } }
  function monitor(cost) {
    var t = now(), dt = mon.last ? t - mon.last : 0; mon.last = t;
    mon.frame++; mon.cost = cost;
    var G = ACH.game && ACH.game.state ? ACH.game.state() : null;
    if ((ACH.touch && ACH.touch.on) || G !== 'playing' || document.hidden || !focused() || !dt) { mon.acc = 0; mon.n = 0; mon.sum = 0; return; }
    if (t < mon.settle || !(cost >= 0) || cost > P.spikeMs) return;   // recién cambiado, o pico aislado
    mon.acc += Math.min(dt, 250); mon.sum += cost; mon.n++;
    if (mon.acc >= P.slowWin * 1000) {
      if (mon.n >= 30) judge('auto', mon.sum / mon.n, mon.acc);
      mon.acc = 0; mon.n = 0; mon.sum = 0;
    }
  }
  // o: { hi: umbral de bajada (ms), drop(avg) → bool (último recurso: partículas), raise(avg) → bool (primero: partículas) }
  function judge(who, avg, winMs, o) {
    o = o || {};
    var t = now(), hi = o.hi || P.costHi;
    if (avg > hi) {
      mon.good = 0;
      var down = autoDrop(who, avg) || (o.drop ? !!o.drop(avg) : false);
      if (down) {
        if (mon.raiseAt && t - mon.raiseAt < P.raiseBack * 1000) mon.raiseWait = Math.min(P.raiseWaitMax, Math.max(P.raiseWin * 2, (mon.raiseWait || P.raiseWin) * 2));
        mon.settle = t + P.settle * 1000;
      }
      return down ? 'drop' : null;
    }
    if (avg < P.costLo) {
      mon.good += winMs || 0;
      if (mon.good >= Math.max(P.raiseWin, mon.raiseWait || 0) * 1000) {
        mon.good = 0;
        var up = (o.raise ? !!o.raise(avg) : false) || autoRaise(who, avg);
        if (up) { mon.raiseAt = t; mon.settle = t + P.settle * 1000; }
        return up ? 'raise' : null;
      }
    } else mon.good = 0;   // zona de histéresis: ni sube ni baja, y la cuenta para subir empieza de nuevo
    return null;
  }
  function hdCan() { var H = ACH.render && ACH.render.hd; try { return !!(H && H.canDrop && H.canDrop()); } catch (e) { return false; } }
  function hdCanUp() { var H = ACH.render && ACH.render.hd; try { return !!(H && H.canRaise && H.canRaise()); } catch (e) { return false; } }
  function lensAuto() { return auto && !forced && glOk(); }
  function autoDrop(who, avg) {
    var rec = { from: null, to: null, avgMs: avg ? +(+avg).toFixed(1) : null, by: who || 'auto' };
    if (lensAuto() && cur !== 'clasico') { rec.from = cur; rec.to = ORDER[ORDER.indexOf(cur) + 1]; cur = rec.to; }   // primero la lente (lo caro)
    else if (hdCan() && ACH.render.hd.autoDrop(who, avg)) { rec.from = 'hd'; rec.to = 'clasico'; }               // HD al final
    else return false;
    drops.push(rec); mon.stack.push(rec.from);
    if (rec.from !== 'hd') console.info('[ACHORADO] postfx: cuadros caros (' + (avg ? (+avg).toFixed(1) + ' ms' : '?') + ') → ' + NAMES[cur]);
    return true;
  }
  function autoRaise(who, avg) {
    while (mon.stack.length) {
      var f = mon.stack.pop(), rec = { from: null, to: f, avgMs: avg ? +(+avg).toFixed(1) : null, by: who || 'auto' };
      if (f === 'hd') { if (hdCanUp() && ACH.render.hd.autoRaise(who, avg)) { rec.from = 'clasico'; rec.to = 'hd'; raises.push(rec); return true; } continue; }
      if (lensAuto() && ORDER.indexOf(f) < ORDER.indexOf(cur)) {
        rec.from = cur; cur = f; raises.push(rec);
        console.info('[ACHORADO] postfx: costo bajo (' + (avg ? (+avg).toFixed(1) + ' ms' : '?') + ') → ' + NAMES[cur]);
        return true;
      }
      // el jugador eligió por su cuenta: esa bajada ya no es nuestra
    }
    return false;
  }

  /* ---------------- Envolver ACH.render.render ---------------- */
  function wrap() {
    var R = ACH.render;
    if (!R || !R.render || R.render._pfx) return !!(R && R.render);
    var orig = R.render;
    var fn = function (ctx, G) {
      var t0 = now(), out = orig.apply(this, arguments);
      try {
        var cv = ctx && ctx.canvas;
        if (cv && cv === worldCv()) { presentWorld(cv); monitor(now() - t0); }   // v0.15 (E): costo = render + presentación
      } catch (e) { if (!wrap.warned) { wrap.warned = true; console.warn('[ACHORADO] postfx: ' + (e && e.message)); } }
      return out;
    };
    fn._pfx = true;
    R.render = fn;
    return true;
  }
  if (!wrap()) document.addEventListener('DOMContentLoaded', wrap);

  /* ---------------- Lienzos adjuntos (cinemática, cuarto) ---------------- */
  function attach(cv, opts) {
    if (!cv || cv._pfx) return cv && cv._pfx || null;
    if (failReason) return null;
    if (attached.length >= 4) return null;   // tope de contextos
    opts = opts || {};
    var L = new Lens(cv, { main: false, warp: !!opts.warp, dof: !!opts.dof });
    if (!L.ok) { L.destroy(); return null; }
    cv._pfx = L; attached.push(L);
    function place() {
      var par = cv.parentNode; if (!par) return false;
      if (L.cv.parentNode !== par || cv.nextSibling !== L.cv) par.insertBefore(L.cv, cv.nextSibling);
      var s = L.cv.style, l = cv.offsetLeft + 'px', t = cv.offsetTop + 'px', w = cv.offsetWidth + 'px', h = cv.offsetHeight + 'px';
      if (s.left !== l) s.left = l; if (s.top !== t) s.top = t; if (s.width !== w) s.width = w; if (s.height !== h) s.height = h;
      return true;
    }
    function tick() {
      if (L.dead) return;
      if (!cv.isConnected) { L.destroy(); attached.splice(attached.indexOf(L), 1); cv._pfx = null; return; }
      var vis = cv.offsetParent !== null && cv.offsetWidth > 0;
      if (vis && cur !== 'clasico' && L.ok && !L.lost && place()) {
        var r = cv.getBoundingClientRect(), cfg = CFG[cur];
        L.size(r.width, r.height, cfg.dpr);
        if (L.present(cfg, 0, 0, finishMode)) L.show(); else L.hide();
      } else L.hide();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return L;
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('.cm-cv, .bz-cv')) attach(root, { warp: false, dof: false });
    var l = root.querySelectorAll('.cm-cv, .bz-cv');
    for (var i = 0; i < l.length; i++) attach(l[i], { warp: false, dof: false });
  }
  function watch() {
    if (!window.MutationObserver || !document.body) return;
    scan(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
        var n = ms[i].addedNodes[j]; if (n.nodeType === 1 && n.className !== 'pfx-att' && n.id !== 'worldfx') scan(n);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();

  /* ---------------- Coordenadas (puntería) ---------------- */
  // x, y en píxeles lógicos de #world tal como los da el rect en pantalla → el píxel del mundo que se ve ahí (inversa exacta)
  function warpOn() { return active() && CFG[cur].warp && P.warp > 0; }
  // v0.15 (A): #world mide VIEW×K; la puntería trabaja en píxeles LÓGICOS (VIEW), entrada y salida
  function logV(cv) { var V = ACH.render && ACH.render.VIEW; return V && V.w ? V : { w: cv.width, h: cv.height }; }
  function toWorld(x, y) {
    var cv = worldCv(); if (!warpOn() || !cv || !cv.width) return { x: x, y: y };
    var V = logV(cv), W = V.w, H = V.h, t = P.warp, sx = x / W, sy = y / H;
    var wy = sy * (1 + t) / (1 + t * sy), z = 1 + t * (1 - wy);
    return { x: (0.5 + (sx - 0.5) * z / (1 + t)) * W, y: wy * H };
  }
  function toScreen(x, y) {
    var cv = worldCv(); if (!warpOn() || !cv || !cv.width) return { x: x, y: y };
    var V = logV(cv), W = V.w, H = V.h, t = P.warp, wx = x / W, wy = y / H, z = 1 + t * (1 - wy);
    return { x: (0.5 + (wx - 0.5) * (1 + t) / z) * W, y: wy / z * H };
  }

  /* ---------------- API ---------------- */
  function setLevel(l, by) {
    if (ORDER.indexOf(l) < 0) return lvl();
    cur = l;
    if (by !== 'auto') { auto = false; try { window.localStorage.setItem(KEY, l); } catch (e) { /* nada */ } }
    if (main && cur === 'clasico') main.hide();
    return lvl();
  }
  function stats() {
    return {
      level: lvl(), chosen: cur, on: active(), auto: auto, forced: forced, webgl: glOk(), reason: failReason || (main && main.lost ? 'contexto perdido' : ''),
      out: main ? [main.W, main.H] : null, src: main ? [main.sw, main.sh] : null, N: main ? main.N : 0, K: main ? (main.K || 1) : 1,
      cpuMs: main ? +main.cpu.toFixed(2) : 0, gpuMs: main ? +main.gpu.toFixed(2) : 0, lastMs: main ? +(main.lastMs || 0).toFixed(2) : 0,
      frames: main ? main.n : 0, attached: attached.length, drops: drops.slice(), finish: finishMode,
      // v0.15 (E): auto-calidad por costo
      autoQ: { costMs: +mon.cost.toFixed(2), winN: mon.n, winAvg: mon.n ? +(mon.sum / mon.n).toFixed(2) : null, goodS: +(mon.good / 1000).toFixed(1),
        raiseWaitS: mon.raiseWait || P.raiseWin, stack: mon.stack.slice(), raises: raises.slice(), focus: focused() }
    };
  }
  // QA: mide n cuadros con gl.finish (costo real de GPU+subida) y devuelve la media en ms
  function bench(n) {
    n = n || 120;
    return new Promise(function (res) {
      var prev = finishMode, k = 0, sum = 0, mx = 0, c0 = main ? main.n : 0;
      finishMode = true;
      (function loop() {
        if (main && main.n > c0) { c0 = main.n; k++; sum += main.lastMs; mx = Math.max(mx, main.lastMs); }
        if (k >= n || !active()) { finishMode = prev; res({ level: lvl(), frames: k, avgMs: k ? +(sum / k).toFixed(2) : null, maxMs: +mx.toFixed(2), out: main ? [main.W, main.H] : null, N: main ? main.N : 0, fps: ACH.game && ACH.game.state ? (window.ACH.debug && ACH.debug.fps ? ACH.debug.fps() : null) : null }); return; }
        requestAnimationFrame(loop);
      })();
    });
  }

  ACH.postfx = {
    on: active, level: lvl, setLevel: setLevel, toWorld: toWorld, toScreen: toScreen, attach: attach, stats: stats, bench: bench,
    autoDrop: autoDrop, autoRaise: autoRaise, judge: judge,
    // v0.15 (E): último costo medido (render + presentación) y n.º de cuadro; tactil.js promedia con esto
    frameCost: function () { return { ms: mon.cost, n: mon.frame, settling: now() < mon.settle }; },
    P: P, CFG: CFG, NAMES: NAMES, ORDER: ORDER,
    name: function () { return NAMES[lvl()]; },
    available: function () { return !failReason && !(main && main.lost); },
    cycle: function (d) { var i = ORDER.indexOf(cur); i = (i + (d || 1) + ORDER.length) % ORDER.length; return setLevel(ORDER[i], 'user'); },
    debug: function (on) { finishMode = !!on; return finishMode; },
    // QA: vuelve a presentar el cuadro y devuelve la salida como PNG (dataURL), para capturas antes/después a 1:1
    // snap(fn): fn(canvasWebGL) en el mismo instante (para drawImage) y devuelve lo que fn devuelva
    snap: function (fn) { var cv = worldCv(); if (!cv || !active()) return null; presentWorld(cv); return fn ? fn(main.cv) : main.cv.toDataURL('image/png'); }
  };
})();
