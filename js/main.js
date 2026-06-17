/* ============================================================
   Portfolio · Fernando García Buzón
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Tema claro / oscuro ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  root.setAttribute("data-theme", stored || (prefersDark ? "dark" : "light"));

  themeToggle?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  /* ---------- Menú móvil ---------- */
  const burger = document.getElementById("navBurger");
  const menu = document.getElementById("navMenu");

  burger?.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  });

  // Cerrar el menú al pulsar un enlace (en móvil)
  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      burger?.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Animaciones al hacer scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    // Fallback: mostrar todo si no hay soporte
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Año dinámico en el footer ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
