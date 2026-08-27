# fgbuzon — portfolio

Portfolio de **Fernando García Buzón**, desarrollador full-stack.
Sitio estático: HTML, CSS y JavaScript planos. Sin build, sin dependencias.

## Por qué no hay framework

Un portfolio de desarrollador es, además del contenido, una muestra de código.
Un `create-next-app` con tres secciones no demuestra nada que no demuestre
mejor un fichero de CSS que alguien pueda abrir y leer entero. Todo el sitio
son dos hojas de estilo, un JavaScript de 220 líneas y cuatro HTML.

## El sistema visual: «la lámina»

El idioma es el del dibujo técnico: blanco frío de plano, azul ultramar como
única tinta de color, cero serifas, y una retícula milimetrada que se ve.
Cada sección lleva su número de lámina, las separaciones son líneas de cota
—con sus dos patillas— y el pie es un cajetín con sus filetes.

Lo que **no** lleva, y es deliberado: degradados, sombras de color, tarjetas
redondeadas, iconos de librería, terminal falsa, papel crema con serif de
display. Esa combinación es exactamente la que delata una web generada
automáticamente, y este sitio no puede permitirse parecerlo.

El segundo color, un naranja quemado, se usa para **una sola cosa**: lo que
todavía no puede demostrar. Si se usara para más, dejaría de significar.

## Estructura

```
index.html                        portada
casos/adesa-digital.html          caso: la plataforma del club
casos/fab-cadiz-scraper.html      caso: el scraper de la federación
cv.html                           el CV, pensado para imprimirse
cv-fernando-garcia-buzon.pdf      el mismo CV, generado desde cv.html
css/lamina.css                    tintas, retícula, cabecera, portada
css/lamina-caso.css               texto largo, código, citas, cierre
js/lamina.js                      tema, tanteo y la prueba del marcador
marca/                            favicon y tarjeta de Open Graph
```

## La prueba del marcador

La única pieza interactiva del sitio. Reimplanta el núcleo del marcador de
torneos 3x3 de adesa80.com y le da al visitante los mandos para romperlo:
cortar la cobertura, duplicar los envíos, entregarlos del revés. Con el motor
de verdad —una función pura sobre un registro que solo crece, con UUID de
cliente por evento— el tanteo del servidor coincide siempre. Con el contador
ingenuo que suma, no.

No demuestra que producción sea infalible; eso sería mentir. Demuestra que la
arquitectura elegida aguanta lo que la ingenua no aguanta, y deja que se
compruebe con las manos en vez de creérselo.

## El CV se genera, no se mantiene a mano

`cv.html` es la fuente. El PDF sale de ahí con Chromium en modo impresión,
así que **no hay dos versiones que se desincronicen**. Al tocar el CV, hay que
regenerar el PDF:

```bash
# con playwright-core instalado
node -e "const{chromium}=require('playwright-core');(async()=>{
  const b=await chromium.launch();const p=await(await b.newContext()).newPage();
  await p.goto('file://'+process.cwd()+'/cv.html',{waitUntil:'networkidle'});
  await p.pdf({path:'cv-fernando-garcia-buzon.pdf',format:'A4',printBackground:true,
    margin:{top:'0',right:'0',bottom:'0',left:'0'}});await b.close()})()"
```

Tiene que caber en **una página**. En media `print` el contenido no puede pasar
de 1123 px (297 mm a 96 dpi); si se pasa, se recorta contenido antes que
encoger más la tipografía. El breakpoint móvil del CV va como
`@media screen and (max-width:230mm)`: sin el `screen`, A4 mide 210 mm, entra
en la consulta y el PDF sale con el diseño de móvil.

## Decisiones que no se deshacen sin motivo

**El contenido se ve siempre.** Ninguna animación esconde nada. No hay ningún
`opacity:0` en la hoja base, así que la página se lee entera sin JavaScript y
con movimiento reducido. Se comprueba en los cinco casos:
`claro / oscuro / reduce / móvil 390 / sin JS`.

**El tema se decide antes de pintar.** Hay un script en línea en el `<head>`
que lee la preferencia guardada. Si viviera al final del `<body>`, quien
navega en oscuro se comería un fogonazo blanco en cada carga.

**Las columnas se miden en `rem`, no en `ch`.** El `ch` depende del cuerpo del
propio elemento: un `max-width:62ch` daba un ancho al titular de 45 px y otro
al párrafo de 17 px, y la página perdía el eje derecho.

**Cada cifra dice cómo se contó.** Un número sin método es un número inflado.
`herramientas/contar.py` los recuenta desde los repositorios de verdad, y
cuando no puede, escribe `disponible: false` en vez de inventarse uno.

**Sin cursor personalizado y sin fondo WebGL.** Los hubo. Se quitaron: son lo
que antes hace leer la página como «portfolio de diseñador» en vez de como
dossier profesional.

## Ver en local

```bash
python3 -m http.server 8000   # y abrir http://localhost:8000
```

## Al tocar el CSS

Las hojas se enlazan como `lamina.css?v=N`. Al cambiarlas hay que subir ese
número en los tres HTML, o quien las tenga cacheadas verá la página rota
—clases nuevas contra estilos viejos.

## Publicación

El sitio se despliega solo con GitHub Actions (`.github/workflows/pages.yml`)
en cada push a la rama por defecto. El workflow comprueba antes que no falte
ningún fichero: es mejor que falle ahí a que falle en la cara de quien abra el
enlace.

**Hay que hacer una cosa una sola vez:** en *Settings → Pages → Source*, elegir
**GitHub Actions** (no «Deploy from a branch»). A partir de ahí no hay que
volver a tocar los ajustes, que es justo lo que se desconfiguraba.

## `herramientas/empaquetar.py`

Junta las cuatro páginas del sitio en un solo fichero HTML autocontenido, con
el CSS y el JS en línea y un router mínimo que intercambia las páginas. Sirve
para enseñar el portfolio de un tirón sin depender de que Pages esté levantado.

```bash
python3 herramientas/empaquetar.py
```
