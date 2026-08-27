/* ============================================================
   LA LÁMINA · comportamiento
   ------------------------------------------------------------
   Casi todo el sitio es HTML y CSS. Aquí solo hay dos cosas:
   el tanteo corriente de la cabecera y la prueba del marcador.

   LA PRUEBA DEL MARCADOR reimplanta el núcleo del marcador de
   torneos 3x3 de adesa80.com y le da al visitante los mandos
   para romperlo. No demuestra que producción sea idempotente
   —eso sería mentir—: demuestra que la ARQUITECTURA que eligió
   aguanta lo que la ingenua no aguanta, y deja que lo compruebe
   con sus manos en vez de creérselo.
   ============================================================ */
(function () {
  "use strict";

  var html = document.documentElement;

  /* ---------- 01 · Tema ---------- */

  try {
    var t = localStorage.getItem("tema");
    if (t === "claro" || t === "noche") html.setAttribute("data-tema", t);
  } catch (e) {}

  var interruptorTema = document.getElementById("tema");
  if (interruptorTema) {
    interruptorTema.addEventListener("click", function () {
      var actual = html.getAttribute("data-tema")
        || (matchMedia("(prefers-color-scheme: dark)").matches ? "noche" : "claro");
      var siguiente = actual === "noche" ? "claro" : "noche";
      html.setAttribute("data-tema", siguiente);
      try { localStorage.setItem("tema", siguiente); } catch (e) {}
    });
  }

  /* ---------- 02 · El tanteo corriente ---------- */
  // Cuántas de las pruebas de la página ha ejecutado ya quien lee.
  // Es el único número de la web que depende del visitante.

  var hechas = 0;
  var totalPruebas = document.querySelectorAll("[data-prueba]").length;
  var marcador = document.getElementById("tanteo");

  function pintaTanteo() {
    if (marcador) marcador.textContent = hechas + "/" + totalPruebas;
  }
  function apunta(clave) {
    var el = document.querySelector('[data-prueba="' + clave + '"]');
    if (!el || el.dataset.hecha === "si") return;
    el.dataset.hecha = "si";
    hechas++;
    pintaTanteo();
  }
  pintaTanteo();

  /* ---------- 02b · El año del pie ---------- */
  // Lo ponía main.js, que ya no se carga en las páginas de caso. Un pie
  // con el año congelado envejece la página sola.

  var anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();

  /* ---------- 03 · La prueba del marcador ---------- */

  var caja = document.getElementById("prueba-marcador");
  if (!caja) return;

  // --- el registro: solo crece, nunca se edita ni se borra ---
  var registro = [];        // lo que la tablet ha anotado
  var recibidos = [];       // lo que le ha llegado al servidor
  var cola = [];            // lo que espera a que vuelva la cobertura
  var contadorIngenuo = { A: 0, B: 0 };   // la implementación de todo el mundo

  var motor = "puro";       // "puro" | "contador"

  function uuid() {
    // Suficiente para una demostración; en producción es crypto.randomUUID().
    return (Math.random().toString(16).slice(2, 8) + Math.random().toString(16).slice(2, 6));
  }

  // EL NÚCLEO. El marcador no se guarda: se deriva. Esta función es
  // pura —mismo registro, mismo resultado— y por eso da igual que un
  // evento llegue dos veces o del revés.
  function calcular(eventos) {
    var vistos = {};
    var tanteo = { A: 0, B: 0 };
    for (var i = 0; i < eventos.length; i++) {
      var e = eventos[i];
      if (vistos[e.id]) continue;      // el UUID de cliente mata el duplicado
      vistos[e.id] = true;
      if (e.tipo === "falta") continue;
      tanteo[e.equipo] += e.puntos;
    }
    return tanteo;
  }

  function activo(id) {
    var c = document.getElementById(id);
    return !!(c && c.checked);
  }

  function entregar(evento) {
    if (activo("sw-cobertura")) { cola.push(evento); return; }
    mandar(evento);
  }

  function mandar(evento) {
    var copias = activo("sw-duplicar") ? 2 : 1;
    for (var i = 0; i < copias; i++) {
      recibidos.push(evento);
      // El contador ingenuo suma según le llega: no sabe de UUIDs.
      if (evento.tipo !== "falta") contadorIngenuo[evento.equipo] += evento.puntos;
    }
  }

  function anota(equipo, tipo, puntos) {
    var e = { id: uuid(), equipo: equipo, tipo: tipo, puntos: puntos || 0,
              hora: new Date().toLocaleTimeString("es-ES", { hour12: false }) };
    registro.push(e);
    entregar(e);
    pinta();
    apunta("marcador");
  }

  function reconectar() {
    if (!cola.length) return;
    var pendientes = cola.slice();
    cola = [];
    if (activo("sw-desordenado")) pendientes.reverse();
    pendientes.forEach(mandar);
    pinta();
    apunta("reconectar");
  }

  function reiniciar() {
    registro = []; recibidos = []; cola = [];
    contadorIngenuo = { A: 0, B: 0 };
    pinta();
  }

  /* ---------- pintado ---------- */

  var elTablet   = caja.querySelectorAll("[data-tanteo-tablet]");
  var elServidor = caja.querySelectorAll("[data-tanteo-servidor]");
  var elLista    = caja.querySelector("[data-registro]");
  var elCola     = caja.querySelector("[data-cola]");
  var elVeredicto= caja.querySelector("[data-veredicto]");
  var elDerivado = caja.querySelector("[data-derivado]");

  function pinta() {
    var enTablet = calcular(registro);
    var enServidor = motor === "puro" ? calcular(recibidos) : contadorIngenuo;

    elTablet.forEach(function (n) { n.textContent = enTablet[n.dataset.tanteoTablet]; });
    elServidor.forEach(function (n) { n.textContent = enServidor[n.dataset.tanteoServidor]; });

    if (elCola) {
      elCola.textContent = cola.length ? cola.length + " en cola" : "";
    }

    if (elLista) {
      if (!registro.length) {
        elLista.innerHTML = '<li class="vacio">Todavía no se ha anotado nada. Pulsa un botón.</li>';
      } else {
        elLista.innerHTML = registro.slice().reverse().map(function (e, i) {
          var n = registro.length - i;
          var que = e.tipo === "falta" ? "falta" : "+" + e.puntos;
          return '<li><span>' + String(n).padStart(2, "0") + '</span>'
               + '<span>' + e.id + '</span>'
               + '<b>' + e.equipo + " " + que + '</b>'
               + '<span>' + e.hora + '</span></li>';
        }).join("");
      }
    }

    if (elVeredicto) {
      var igual = enTablet.A === enServidor.A && enTablet.B === enServidor.B;
      elVeredicto.textContent = igual ? "Coincide" : "No coincide";
      elVeredicto.dataset.estado = igual ? "coincide" : "no";
    }

    if (elDerivado) {
      elDerivado.textContent = motor === "puro"
        ? "el servidor deriva el tanteo del registro"
        : "el servidor va sumando según le llega";
    }
  }

  /* ---------- mandos ---------- */

  caja.addEventListener("click", function (ev) {
    var b = ev.target.closest("button");
    if (!b) return;

    if (b.dataset.anota) {
      var p = b.dataset.anota.split(":");     // "A:2"
      anota(p[0], p[1] === "falta" ? "falta" : "canasta", parseInt(p[1], 10) || 0);
      return;
    }
    if (b.dataset.accion === "reconectar") { reconectar(); return; }
    if (b.dataset.accion === "reiniciar")  { reiniciar();  return; }

    if (b.dataset.motor) {
      motor = b.dataset.motor;
      caja.querySelectorAll("[data-motor]").forEach(function (x) {
        x.setAttribute("aria-pressed", String(x.dataset.motor === motor));
      });
      pinta();
      if (motor === "contador") apunta("motor");
    }
  });

  caja.addEventListener("change", function (ev) {
    if (ev.target.id === "sw-cobertura" && !ev.target.checked) reconectar();
    if (ev.target.id && ev.target.id.indexOf("sw-") === 0) apunta("sabotaje");
    pinta();
  });

  pinta();
})();
