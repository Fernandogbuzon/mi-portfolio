# fgbuzon — portfolio

Portfolio de **Fernando García Buzón**, desarrollador full-stack.
Sitio estático: HTML, CSS y JavaScript planos. Sin build, sin dependencias.

## Por qué no hay framework

Un portfolio de desarrollador es, además del contenido, una muestra de código.
Un `create-next-app` con tres secciones no demuestra nada que no demuestre
mejor un fichero de CSS que alguien pueda abrir y leer entero. Todo lo que
hace la página —el campo de tinta en WebGL, el vidrio, el cursor con muelle,
el revelado al hacer scroll— cabe en tres ficheros y carga sin red después de
las fuentes.

## Estructura

```
index.html                        portada
casos/adesa-digital.html          caso: la plataforma del club
casos/fab-cadiz-scraper.html      caso: el scraper de la federación
css/sistema.css                   fichas, vidrio, tipografía, movimiento
css/paginas.css                   portada, bento, casos, trayectoria
js/campo.js                       el fondo WebGL2 (sin librerías)
js/main.js                        tema, menú, cursor, cifras
marca/                            favicon claro y oscuro
```

## Decisiones que no se deshacen sin motivo

**El contenido se ve siempre por defecto.** Ninguna animación esconde nada.
Todo estado inicial oculto vive dentro de `@media (prefers-reduced-motion:
no-preference)`, nunca en la regla base: un `opacity:0` en la base dejaría el
texto invisible para siempre en cuanto alguien pida menos movimiento.

**El revelado lo hace el navegador.** Se usa `animation-timeline: view()`
dentro de `@supports`. JavaScript solo pone un respaldo donde no existe, y lo
pone *añadiendo* una clase a `<html>`: sin JS no hay nada oculto que revelar.

**El tema se decide antes de pintar.** Hay un script en línea en el `<head>`
que lee la preferencia guardada. Si viviera al final del `<body>`, quien
navega en oscuro se comería un fogonazo blanco en cada carga.

**WebGL es opcional.** Si `campo.js` no arranca —sin WebGL2, con movimiento
reducido, con la pestaña oculta— queda el degradado CSS que ya está debajo y
no se pierde nada. Con movimiento reducido pinta un fotograma y para.

**Cero dependencias.** El shader son ~120 líneas de WebGL2 escritas a mano.
`three.js` pesa 600 KB para hacer esto mismo.

## Ver en local

```bash
python3 -m http.server 8000   # y abrir http://localhost:8000
```

## Al tocar el CSS

Las hojas se enlazan como `sistema.css?v=N`. Al cambiarlas hay que subir ese
número en los tres HTML, o quien las tenga cacheadas verá la página rota
—clases nuevas contra estilos viejos.
