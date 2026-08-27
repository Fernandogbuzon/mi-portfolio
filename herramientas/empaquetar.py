"""Junta el sitio entero en un solo fichero HTML.

El sitio son cuatro páginas que se enlazan entre sí. Un artefacto es una
sola página, así que van las cuatro dentro y un router de doce líneas las
intercambia. El CSS y el JS se meten en línea, así que el fichero abre sin
red salvo por las tipografías.

Sirve para enseñar el portfolio de un tirón —adjunto en un correo, una
memoria USB— sin depender de que Pages esté levantado.
"""
import re, pathlib

R = pathlib.Path(__file__).resolve().parent.parent

def leer(p):
    return (R / p).read_text(encoding='utf-8')

def entre(s, ini, fin):
    a = s.index(ini) + len(ini)
    b = s.index(fin, a)
    return s[a:b]

# --- piezas comunes -------------------------------------------------
css = leer('css/lamina.css') + "\n\n" + leer('css/lamina-caso.css')
js  = leer('js/lamina.js')

inicio = leer('index.html')
adesa  = leer('casos/adesa-digital.html')
scrap  = leer('casos/fab-cadiz-scraper.html')
cv     = leer('cv.html')

# --- contenido de cada página ---------------------------------------
main_inicio = entre(inicio, '<main id="contenido">', '</main>')
firma       = entre(inicio, '<footer class="firma">', '</footer>')
cabecera    = entre(inicio, '<header class="lamina-cabecera">', '</header>')

def caso(s):
    return entre(s, '<main id="contenido">', '</main>')

# El CV: solo la hoja, sin su barra de navegación propia.
hoja_cv = entre(cv, '<div class="hoja">', '\n</div>\n\n</body>')
css_cv  = entre(cv, '<style>', '</style>')

# Acotar el CSS del CV a su contenedor: comparte nombres de clase con el
# sitio (.entrada, .pie, h2) y sin esto se pisan. Las at-rules y :root se
# dejan como están, que no son selectores de elemento.
css_cv = re.sub(r'(?m)^(?=[.#a-zA-Z\[])', '#p-cv ', css_cv)
css_cv = css_cv.replace('#p-cv :root{', '#p-cv{').replace('#p-cv @', '@')
css_cv = css_cv.replace('#p-cv body{', '#p-cv .hoja{')

def a_router(s):
    """Los enlaces entre páginas pasan a ser del router."""
    reemplazos = [
        ('href="casos/adesa-digital.html"',     'href="#adesa" data-ir="p-adesa"'),
        ('href="casos/fab-cadiz-scraper.html"', 'href="#scraper" data-ir="p-scraper"'),
        ('href="adesa-digital.html"',           'href="#adesa" data-ir="p-adesa"'),
        ('href="fab-cadiz-scraper.html"',       'href="#scraper" data-ir="p-scraper"'),
        ('href="../index.html"',                'href="#inicio" data-ir="p-inicio"'),
        ('href="index.html"',                   'href="#inicio" data-ir="p-inicio"'),
        ('href="cv-fernando-garcia-buzon.pdf" download',    'href="#cv" data-ir="p-cv"'),
        ('href="../cv-fernando-garcia-buzon.pdf" download', 'href="#cv" data-ir="p-cv"'),
        ('href="../index.html#',                'href="#inicio" data-ir="p-inicio" data-ancla="'),
    ]
    for a, b in reemplazos:
        s = s.replace(a, b)
    return s

paginas = {
    'p-inicio':  a_router(main_inicio),
    'p-adesa':   a_router(caso(adesa)),
    'p-scraper': a_router(caso(scrap)),
    'p-cv':      '<div class="hoja">' + a_router(hoja_cv) + '</div>',
}

cuerpo = "\n".join(
    f'<div class="pagina" id="{k}"{"" if k=="p-inicio" else " hidden"}>{v}</div>'
    for k, v in paginas.items()
)

ROUTER = """
/* ---------- Router de la versión de una pieza ----------
   El sitio de verdad son cuatro ficheros HTML. Aquí van los cuatro
   dentro y esto intercambia cuál se ve. Nada más. */
(function () {
  var paginas = document.querySelectorAll('.pagina');
  function ir(id, ancla) {
    for (var i = 0; i < paginas.length; i++) {
      paginas[i].hidden = paginas[i].id !== id;
    }
    if (ancla) {
      var d = document.getElementById(ancla);
      if (d) { d.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ir]');
    if (!a) return;
    e.preventDefault();
    ir(a.getAttribute('data-ir'), a.getAttribute('data-ancla'));
  });
})();
"""

salida = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio · Fernando García Buzón</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
{css}

/* ---------- Añadidos de la versión de una pieza ---------- */
.pagina[hidden]{{display:none}}

/* El CV es un documento de papel: no lleva la retícula del sitio ni su
   fondo, va sobre una hoja blanca centrada. */
#p-cv{{
  background:var(--papel-hondo);
  padding-block:4rem 3rem;
  background-image:none;
}}
#p-cv .hoja{{
  width:min(210mm, calc(100% - 2rem));margin-inline:auto;
  background:#fff;padding:12mm;
  box-shadow:0 10px 40px rgba(13,17,20,.16);
}}

{css_cv}
</style>
</head>
<body>

<a class="salto" href="#contenido">Saltar al contenido</a>

<header class="lamina-cabecera">{a_router(cabecera)}</header>

<div id="contenido">
{cuerpo}
</div>

<footer class="firma">{a_router(firma)}</footer>

<script>
{js}
</script>
<script>
{ROUTER}
</script>
</body>
</html>
"""

destino = R / 'portfolio-una-pieza.html'
destino.write_text(salida, encoding='utf-8')
print(f"escrito: {destino}  ({len(salida)//1024} KB)")
print("páginas incluidas:", ", ".join(paginas))
