# Portfolio de Fernando García Buzón

Sitio estático en español. Muestra dos proyectos, el CV y las formas de contacto. Se puede leer sin JavaScript; el cambio de tema sí lo necesita.

## Diseño y contenido

La portada da prioridad al trabajo real: ADESA 80 y el scraper de resultados federativos. El caso de ADESA muestra capturas hechas en un entorno de prueba. Cada captura lleva un aviso visible de **datos ficticios y no reales**, también al abrirla completa.

El caso organiza las 28 áreas de la plataforma en cuatro grupos desplegables. Cada área tiene una descripción breve. Así se puede recorrer el producto de un vistazo y consultar los detalles cuando hagan falta.

El diseño usa tipografía de sistema, una paleta neutra, tema claro y oscuro y movimiento breve. El contenido sigue disponible con JavaScript desactivado y con la preferencia de movimiento reducido.

## Archivos

```text
index.html                        portada
casos/adesa-digital.html          caso de ADESA 80 y sus 28 áreas
casos/fab-cadiz-scraper.html      caso del scraper
cv.html                           fuente del CV para pantalla e impresión
cv-fernando-garcia-buzon.pdf      CV publicado sin foto
css/portfolio.css                 estilos del portfolio
js/portfolio.js                   tema y año del pie
media/adesa/                      capturas del entorno de prueba
marca/                            favicon y tarjeta para compartir
herramientas/empaquetar.py        copia autocontenida para abrir sin red
```

El sitio publicado no tiene dependencias ni paso de compilación. El CV se mantiene en `cv.html` y se exporta a PDF con Chromium al cambiar su contenido; conviene revisar que el PDF conserve una sola página A4 y que sus enlaces funcionen.

## Ver en local

```bash
python -m http.server 8000
```

Abrir `http://localhost:8000`. Para revisar cambios visuales, comprobar portada y casos en móvil y escritorio, en claro y oscuro.

## Copia sin conexión

```bash
python herramientas/empaquetar.py
```

Genera `portfolio-una-pieza.html`, ignorado por Git. El fichero incluye las tres páginas, el CV, las capturas, el CSS, el JavaScript y el PDF; los enlaces a GitHub, LinkedIn y los sitios publicados siguen siendo externos. Su navegación interna funciona al abrirlo directamente con `file://`.

## Publicación

GitHub Actions publica el sitio en Pages desde la rama por defecto. El workflow comprueba que están los HTML y recursos necesarios. En *Settings → Pages → Source* debe estar seleccionada la opción **GitHub Actions**.
