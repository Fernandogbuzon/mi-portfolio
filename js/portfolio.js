(() => {
  const botones = document.querySelectorAll('[data-tema-boton]');

  function actualizarBoton() {
    const oscuro = document.documentElement.dataset.tema === 'noche' ||
      (!document.documentElement.dataset.tema && matchMedia('(prefers-color-scheme: dark)').matches);
    const texto = oscuro ? 'Activar tema claro' : 'Activar tema oscuro';
    botones.forEach((boton) => {
      boton.setAttribute('aria-label', texto);
      boton.setAttribute('title', texto);
    });
  }

  botones.forEach((boton) => boton.addEventListener('click', () => {
    const oscuro = document.documentElement.dataset.tema === 'noche' ||
      (!document.documentElement.dataset.tema && matchMedia('(prefers-color-scheme: dark)').matches);
    const tema = oscuro ? 'claro' : 'noche';
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem('tema', tema); } catch (_) { /* El tema sigue activo en esta página. */ }
    actualizarBoton();
  }));

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', actualizarBoton);
  document.querySelectorAll('[data-anio]').forEach((elemento) => {
    elemento.textContent = String(new Date().getFullYear());
  });
  actualizarBoton();
})();
