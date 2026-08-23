/* ============================================================
   Fernando García Buzón · Comportamiento
   ------------------------------------------------------------
   Lo que JS puede tocar y lo que no:

   NO toca el revelado al hacer scroll cuando el navegador sabe
   hacerlo solo (animation-timeline: view()). Solo pone el respaldo
   donde no existe, y lo pone AÑADIENDO una clase — nunca ocultando
   nada desde la hoja base. Sin JS, la página se ve entera.
   ============================================================ */
(function () {
  "use strict";

  var html = document.documentElement;
  var menosMovimiento = matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- 01 · Tema ---------- */

  var guardado = null;
  try { guardado = localStorage.getItem("tema"); } catch (e) { /* modo privado */ }
  if (guardado === "claro" || guardado === "noche") html.setAttribute("data-tema", guardado);

  var interruptor = document.getElementById("interruptor");
  if (interruptor) {
    interruptor.addEventListener("click", function () {
      // Sin preferencia guardada, el primer clic va contra lo que
      // el sistema esté mostrando ahora mismo.
      var actual = html.getAttribute("data-tema");
      if (!actual) actual = matchMedia("(prefers-color-scheme: dark)").matches ? "noche" : "claro";
      var siguiente = actual === "noche" ? "claro" : "noche";
      html.setAttribute("data-tema", siguiente);
      try { localStorage.setItem("tema", siguiente); } catch (e) {}
      interruptor.setAttribute("aria-label",
        siguiente === "noche" ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    });
  }

  /* ---------- 02 · Menú ---------- */

  var hamburguesa = document.getElementById("hamburguesa");
  var menu = document.getElementById("menu");

  if (hamburguesa && menu) {
    var alternar = function (abrir) {
      menu.classList.toggle("abierto", abrir);
      hamburguesa.setAttribute("aria-expanded", String(abrir));
      hamburguesa.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
    };
    hamburguesa.addEventListener("click", function () {
      alternar(!menu.classList.contains("abierto"));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) alternar(false);
    });
    // Escape cierra. Un menú a pantalla completa sin salida por
    // teclado es una trampa para quien navega tabulando.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("abierto")) {
        alternar(false);
        hamburguesa.focus();
      }
    });
  }

  /* ---------- 03 · Cabecera que se aparta ---------- */

  var cabecera = document.querySelector(".cabecera");
  if (cabecera) {
    var ultimo = 0;
    addEventListener("scroll", function () {
      var y = window.scrollY;
      // Solo se esconde bajando y pasados 400px: si no, parpadea con
      // el rebote elástico de iOS al llegar arriba.
      var esconder = y > 400 && y > ultimo && !menu?.classList.contains("abierto");
      cabecera.classList.toggle("oculta", esconder);
      ultimo = y;
    }, { passive: true });
  }

  /* ---------- 04 · Enlace activo ---------- */

  var enlaces = Array.prototype.slice.call(document.querySelectorAll('.menu a[href^="#"]'));
  var secciones = enlaces
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (secciones.length && "IntersectionObserver" in window) {
    var vigia = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        enlaces.forEach(function (a) {
          a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + e.target.id));
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secciones.forEach(function (s) { vigia.observe(s); });
  }

  /* ---------- 05 · Revelado ---------- */
  // Un solo mecanismo, y deliberadamente tonto: en cada scroll se mira
  // qué piezas están en pantalla y se les añade una clase.
  //
  // Aquí hubo dos intentos antes. `animation-timeline: view()` es lo
  // elegante —lo conduce el navegador, sin JS— pero medido en Chromium
  // dejaba elementos con la animación en progreso 0 estando centrados
  // en pantalla, con varios rangos distintos. Un IntersectionObserver
  // falló menos, pero también se dejó piezas sin avisar.
  //
  // Esto no se deja ninguna: si un trozo está dentro del viewport, se
  // ve. Cuesta un rectángulo por pieza y por fotograma de scroll, y
  // solo hasta que todas han entrado. Un párrafo invisible en un
  // portfolio es un fallo mucho más caro que ese cálculo.
  //
  // La clase la pone JS: sin JS no hay nada oculto que revelar.

  if (!menosMovimiento.matches) {
    html.classList.add("js-revela");

    var piezas = Array.prototype.slice.call(
      document.querySelectorAll(".revela, .coro > *")
    );

    piezas.forEach(function (p, i) {
      p.style.setProperty("--retardo", (i % 6) * 70 + "ms");
    });

    var barriendo = false;

    var barrer = function () {
      barriendo = false;
      var alto = window.innerHeight;

      piezas = piezas.filter(function (p) {
        var c = p.getBoundingClientRect();
        // Un margen negativo abajo evita que entren justo en el borde,
        // que se lee como un salto en vez de como una entrada.
        if (c.top < alto * 0.92 && c.bottom > 0) {
          p.classList.add("dentro");
          return false;              // ya está: fuera de la lista
        }
        return true;
      });

      if (!piezas.length) {
        removeEventListener("scroll", pedir);
        removeEventListener("resize", pedir);
      }
    };

    var pedir = function () {
      if (barriendo) return;
      barriendo = true;
      requestAnimationFrame(barrer);
    };

    addEventListener("scroll", pedir, { passive: true });
    addEventListener("resize", pedir, { passive: true });
    barrer();                        // lo que ya se ve, se ve desde el principio
  }

  /* ---------- 06 · Cursor ---------- */
  // El punto va pegado; el anillo llega tarde. El retardo es el efecto
  // entero: un anillo que sigue exacto al ratón no se percibe.

  var finoYQuieto = matchMedia("(pointer:fine)").matches && !menosMovimiento.matches;

  if (finoYQuieto) {
    var punto = document.querySelector(".cursor");
    var anillo = document.querySelector(".cursor-anillo");

    if (punto && anillo) {
      var rx = innerWidth / 2, ry = innerHeight / 2;
      var ax = rx, ay = ry, vx = 0, vy = 0;

      addEventListener("pointermove", function (e) {
        rx = e.clientX; ry = e.clientY;
        html.classList.add("cursor-listo");
        punto.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      }, { passive: true });

      // Muelle real: aceleración hacia el objetivo + rozamiento. Un
      // lerp simple frena de golpe; esto se pasa un poco y vuelve.
      (function muelle() {
        vx = (vx + (rx - ax) * 0.14) * 0.72;
        vy = (vy + (ry - ay) * 0.14) * 0.72;
        ax += vx; ay += vy;
        anillo.style.transform = "translate3d(" + ax + "px," + ay + "px,0)";
        requestAnimationFrame(muelle);
      })();

      // Delegación: los enlaces de las fichas se pintan después, así
      // que enganchar uno a uno al cargar dejaría fuera la mitad.
      var sensible = "a, button, .bento-pieza, .proyecto, [data-cursor]";
      document.addEventListener("pointerover", function (e) {
        if (e.target.closest(sensible)) html.classList.add("cursor-sobre");
      });
      document.addEventListener("pointerout", function (e) {
        if (e.target.closest(sensible) && !e.relatedTarget?.closest(sensible)) {
          html.classList.remove("cursor-sobre");
        }
      });
      addEventListener("blur", function () { html.classList.remove("cursor-sobre"); });
    }
  }

  /* ---------- 07 · Luz del vidrio ---------- */
  // El reflejo de una lente se mueve con el observador. Fijo, delata
  // que es un degradado pintado.

  if (matchMedia("(pointer:fine)").matches) {
    document.addEventListener("pointermove", function (e) {
      var pieza = e.target.closest(".vidrio");
      if (!pieza) return;
      var caja = pieza.getBoundingClientRect();
      pieza.style.setProperty("--luz", ((e.clientX - caja.left) / caja.width) * 100 + "%");
    }, { passive: true });
  }

  /* ---------- 08 · Inclinación ---------- */
  // Rotación pequeña a propósito: 6 grados leen como profundidad,
  // 15 leen como truco de plantilla.

  if (finoYQuieto) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-inclina]"), function (p) {
      p.addEventListener("pointermove", function (e) {
        var c = p.getBoundingClientRect();
        var x = (e.clientX - c.left) / c.width - 0.5;
        var y = (e.clientY - c.top) / c.height - 0.5;
        p.style.transform =
          "perspective(900px) rotateX(" + (-y * 6) + "deg) rotateY(" + (x * 6) + "deg) translateY(-4px)";
      });
      p.addEventListener("pointerleave", function () { p.style.transform = ""; });
    });
  }

  /* ---------- 09 · Cifras ---------- */

  var cifras = document.querySelectorAll("[data-cifra]");
  if (cifras.length && "IntersectionObserver" in window) {
    var contar = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        contar.unobserve(e.target);

        var el = e.target;
        var fin = parseFloat(el.dataset.cifra);
        var sufijo = el.dataset.sufijo || "";

        // Separador de millar español. "2236 tests" se lee mal; "2.236" no.
        var comoTexto = function (n) { return n.toLocaleString("es-ES"); };

        if (menosMovimiento.matches || !isFinite(fin)) {
          el.textContent = comoTexto(fin) + sufijo;
          return;
        }

        var t0 = performance.now(), dur = 1100;
        (function paso(ahora) {
          var k = Math.min((ahora - t0) / dur, 1);
          k = 1 - Math.pow(1 - k, 3);                 // frena al final
          el.textContent = comoTexto(Math.round(fin * k)) + sufijo;
          if (k < 1) requestAnimationFrame(paso);
        })(t0);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(cifras, function (c) {
      c.textContent = "0" + (c.dataset.sufijo || "");   // el observador lo reemplaza al entrar
      contar.observe(c);
    });
  }

  /* ---------- 10 · Copiar el correo ---------- */

  var copiar = document.getElementById("copiar-correo");
  if (copiar && navigator.clipboard) {
    var textoOriginal = copiar.textContent;
    copiar.addEventListener("click", function () {
      navigator.clipboard.writeText(copiar.dataset.correo || "").then(function () {
        copiar.textContent = "Copiada ✓";
        setTimeout(function () { copiar.textContent = textoOriginal; }, 2000);
      }).catch(function () {
        copiar.textContent = "No se pudo copiar";
        setTimeout(function () { copiar.textContent = textoOriginal; }, 2000);
      });
    });
  } else if (copiar) {
    copiar.hidden = true;   // sin API de portapapeles, un botón que no copia sobra
  }

  /* ---------- 11 · Año ---------- */

  var anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
