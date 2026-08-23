/* ============================================================
   Campo de tinta · WebGL2 a mano
   ------------------------------------------------------------
   Un fBm con deformación de dominio (domain warping) que se lee
   como tinta moviéndose en agua. Sin three.js: son ~120 líneas de
   WebGL y un shader, y pesa 0 KB de dependencias.

   Reglas de la casa:
   · Si no hay WebGL2, no pasa nada. El degradado CSS de #campo ya
     está debajo y la página se ve entera.
   · Va deliberadamente flojo. Esto es un dossier profesional, no una
     demo de shaders: el campo tiene que leerse como textura de papel,
     nunca competir con el texto que hay encima.
   · Con «reducir movimiento» pinta UN fotograma y para. No se
     queda en negro: se queda quieto.
   · Se apaga sola con la pestaña oculta. Un shader a pantalla
     completa consumiendo batería en segundo plano es un error.
   ============================================================ */
(function () {
  "use strict";

  var host = document.getElementById("campo");
  if (!host) return;

  var canvas = document.createElement("canvas");
  var gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
    premultipliedAlpha: false
  });
  if (!gl) return;                       // sin WebGL2 se queda el degradado
  host.appendChild(canvas);

  var VERT = `#version 300 es
  in vec2 pos;
  void main(){ gl_Position = vec4(pos, 0.0, 1.0); }`;

  var FRAG = `#version 300 es
  precision highp float;
  out vec4 color;

  uniform vec2  u_res;
  uniform float u_tiempo;
  uniform vec2  u_raton;      // 0..1, ya suavizado en JS
  uniform float u_fuerza;     // cuánto empuja el ratón
  uniform vec3  u_papel;
  uniform vec3  u_tinta;
  uniform vec3  u_verde;

  // Ruido de valor: barato y suficiente. Un simplex aquí no se
  // distingue a esta escala y cuesta el triple.
  float hash(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float ruido(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }

  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);   // rotar cada octava evita el patrón en cuadrícula
    for (int i = 0; i < 5; i++){
      v += a * ruido(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / u_res;
    vec2 p  = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
    p *= 2.4;

    float t = u_tiempo * 0.045;

    // Deformación de dominio: el fBm se evalúa sobre coordenadas que
    // a su vez vienen de otro fBm. De ahí salen los filamentos.
    vec2 q = vec2(fbm(p + vec2(0.0, t)),
                  fbm(p + vec2(5.2, 1.3) - t * 0.7));

    // El ratón empuja el campo. Cae con la distancia para que sea un
    // remolino local y no una marea que mueve la pantalla entera.
    vec2 haciaRaton = p - (u_raton * 2.0 - 1.0) * vec2(u_res.x / u_res.y, 1.0) * 1.2;
    float cerca = exp(-dot(haciaRaton, haciaRaton) * 1.6);
    q += normalize(haciaRaton + 1e-5) * cerca * u_fuerza * 0.55;

    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.4),
                  fbm(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.3));

    float f = fbm(p + 4.0 * r);
    f = smoothstep(0.15, 0.95, f);

    // Tres tintas, no dos: papel de base, verde en los filamentos y
    // una pizca de tinta en los senos para dar profundidad.
    vec3 c = mix(u_papel, u_verde, clamp(f * 0.55, 0.0, 1.0));
    c = mix(c, u_tinta, clamp(pow(length(r) * 0.55, 3.0), 0.0, 0.35));
    c = mix(c, u_verde, cerca * u_fuerza * 0.18);

    // Viñeta suave: mantiene el peso en el centro y evita que los
    // filamentos compitan con el texto de los márgenes.
    float vig = smoothstep(1.25, 0.25, length(uv - 0.5) * 1.4);
    float alfa = (0.32 + 0.34 * f) * vig;

    color = vec4(c, alfa * 0.62);
  }`;

  function compilar(tipo, fuente) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fuente);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      // No romper la página por un shader: se avisa y se sale.
      console.warn("campo:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compilar(gl.VERTEX_SHADER, VERT);
  var fs = compilar(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("campo:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // Un triángulo que tapa la pantalla. Con dos triángulos habría una
  // costura en la diagonal y un vértice de más.
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {
    res:     gl.getUniformLocation(prog, "u_res"),
    tiempo:  gl.getUniformLocation(prog, "u_tiempo"),
    raton:   gl.getUniformLocation(prog, "u_raton"),
    fuerza:  gl.getUniformLocation(prog, "u_fuerza"),
    papel:   gl.getUniformLocation(prog, "u_papel"),
    tinta:   gl.getUniformLocation(prog, "u_tinta"),
    verde:   gl.getUniformLocation(prog, "u_verde")
  };

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  /* ---------- Color: el shader lee la paleta del CSS ---------- */
  // Así el campo sigue al tema sin duplicar los hex en JS. Si mañana
  // cambia --verde en el CSS, el shader cambia solo.
  function aRgb(valor) {
    var v = valor.trim();
    var m = v.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      var n = parseInt(m[1], 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }
    m = v.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
      return [p[0] / 255, p[1] / 255, p[2] / 255];
    }
    return [0.5, 0.5, 0.5];
  }

  var paleta = { papel: [1, 1, 1], tinta: [0, 0, 0], verde: [0, .4, .3] };

  function leerPaleta() {
    var cs = getComputedStyle(document.documentElement);
    paleta.papel = aRgb(cs.getPropertyValue("--papel"));
    paleta.tinta = aRgb(cs.getPropertyValue("--tinta"));
    paleta.verde = aRgb(cs.getPropertyValue("--verde-vivo"));
  }
  leerPaleta();

  // El tema puede cambiar por el interruptor o por el sistema.
  new MutationObserver(leerPaleta).observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-tema"]
  });
  var mqTema = matchMedia("(prefers-color-scheme: dark)");
  mqTema.addEventListener("change", leerPaleta);

  /* ---------- Tamaño ---------- */
  // El DPR se capa a 1.5: por encima no se aprecia en un campo
  // difuso y en un portátil retina cuadruplica los píxeles a pintar.
  var dpr = 1;
  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.floor(host.clientWidth * dpr);
    var h = Math.floor(host.clientHeight * dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.res, w, h);
  }
  medir();
  addEventListener("resize", medir, { passive: true });

  /* ---------- Ratón, con inercia ---------- */
  var raton = { x: .5, y: .5, ex: .5, ey: .5, fuerza: 0, objetivo: 0 };

  addEventListener("pointermove", function (e) {
    raton.x = e.clientX / innerWidth;
    raton.y = 1 - e.clientY / innerHeight;   // WebGL cuenta la Y al revés
    raton.objetivo = 1;
  }, { passive: true });

  addEventListener("pointerleave", function () { raton.objetivo = 0; }, { passive: true });

  /* ---------- Bucle ---------- */
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");
  var t0 = performance.now();
  var corriendo = false;
  var pedido = 0;

  function pintar(ahora) {
    pedido = 0;
    medir();

    // Suavizado exponencial. El ratón nunca llega de golpe: llega
    // tarde, que es lo que hace que el campo parezca tener masa.
    raton.ex += (raton.x - raton.ex) * 0.06;
    raton.ey += (raton.y - raton.ey) * 0.06;
    raton.fuerza += (raton.objetivo - raton.fuerza) * 0.04;

    gl.uniform1f(U.tiempo, (ahora - t0) / 1000);
    gl.uniform2f(U.raton, raton.ex, raton.ey);
    gl.uniform1f(U.fuerza, raton.fuerza);
    gl.uniform3fv(U.papel, paleta.papel);
    gl.uniform3fv(U.tinta, paleta.tinta);
    gl.uniform3fv(U.verde, paleta.verde);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (corriendo) pedido = requestAnimationFrame(pintar);
  }

  function unFotograma() {
    medir();
    gl.uniform1f(U.tiempo, 12);       // un instante bonito del campo, congelado
    gl.uniform2f(U.raton, .5, .5);
    gl.uniform1f(U.fuerza, 0);
    gl.uniform3fv(U.papel, paleta.papel);
    gl.uniform3fv(U.tinta, paleta.tinta);
    gl.uniform3fv(U.verde, paleta.verde);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function arrancar() {
    if (corriendo || reduce.matches || document.hidden) return;
    corriendo = true;
    t0 = performance.now() - 12000;   // entra por el mismo sitio que el fotograma quieto
    pedido = requestAnimationFrame(pintar);
  }

  function parar() {
    corriendo = false;
    if (pedido) cancelAnimationFrame(pedido);
    pedido = 0;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) parar(); else arrancar();
  });

  reduce.addEventListener("change", function () {
    if (reduce.matches) { parar(); unFotograma(); } else arrancar();
  });

  if (reduce.matches) unFotograma(); else arrancar();
})();
