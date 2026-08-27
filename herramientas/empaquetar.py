"""Junta el sitio entero en un solo fichero HTML.

El sitio son cuatro páginas que se enlazan entre sí. Un artefacto es una
sola página, así que van las cuatro dentro y un router de doce líneas
las intercambia. Todo lo demás —CSS, JS, el shader— se mete en línea.
"""
import re, pathlib, html

R = pathlib.Path('/home/user/mi-portfolio')

def leer(p):
    return (R / p).read_text(encoding='utf-8')

def entre(s, ini, fin):
    a = s.index(ini) + len(ini)
    b = s.index(fin, a)
    return s[a:b]

# --- piezas comunes -------------------------------------------------
css = leer('css/sistema.css') + "\n\n" + leer('css/paginas.css')
js_campo = leer('js/campo.js')
js_main  = leer('js/main.js')

inicio = leer('index.html')
adesa  = leer('casos/adesa-digital.html')
scrap  = leer('casos/fab-cadiz-scraper.html')
cv     = leer('cv.html')

# El filtro SVG de refracción y el lienzo, una sola vez.
svg_filtro = entre(inicio, '<svg width="0" height="0"', '</svg>')
svg_filtro = '<svg width="0" height="0"' + svg_filtro + '</svg>'

# --- contenido de cada página ---------------------------------------
main_inicio = entre(inicio, '<main id="contenido">', '</main>')
pie_inicio  = entre(inicio, '<footer class="pie">', '</footer>')

def caso(s):
    return entre(s, '<main id="contenido">', '</main>')

# El CV: solo la hoja, sin su barra de navegación propia.
hoja_cv = entre(cv, '<div class="hoja">', '\n</div>\n\n</body>')
css_cv  = entre(cv, '<style>', '</style>')
# Acotar el CSS del CV a su contenedor para que no pise al del sitio.
css_cv = re.sub(r'(?m)^(?=[.#a-zA-Z\[])', '#p-cv ', css_cv)
css_cv = css_cv.replace('#p-cv :root{', ':root{').replace('#p-cv @', '@')
css_cv = css_cv.replace('#p-cv body{', '#p-cv .hoja{')

# La navegación del sitio, reutilizada.
cabecera = entre(inicio, '<header class="cabecera">', '</header>')

def a_router(s):
    """Los enlaces entre páginas pasan a ser del router."""
    reemplazos = [
        ('href="casos/adesa-digital.html"',    'href="#adesa" data-ir="p-adesa"'),
        ('href="casos/fab-cadiz-scraper.html"','href="#scraper" data-ir="p-scraper"'),
        ('href="adesa-digital.html"',          'href="#adesa" data-ir="p-adesa"'),
        ('href="fab-cadiz-scraper.html"',      'href="#scraper" data-ir="p-scraper"'),
        ('href="../index.html"',               'href="#inicio" data-ir="p-inicio"'),
        ('href="index.html"',                  'href="#inicio" data-ir="p-inicio"'),
        ('href="cv-fernando-garcia-buzon.pdf" download',  'href="#cv" data-ir="p-cv"'),
        ('href="../cv-fernando-garcia-buzon.pdf" download','href="#cv" data-ir="p-cv"'),
        ('href="../index.html#',               'href="#inicio" data-ir="p-inicio" data-ancla="'),
        ('href="marca/favicon.svg"',           'href="#"'),
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
    // Las piezas de la página que acaba de aparecer no estaban en
    // pantalla, así que el barrido del revelado aún no las ha visto.
    window.dispatchEvent(new Event('scroll'));
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ir]');
    if (!a) return;
    e.preventDefault();
    ir(a.getAttribute('data-ir'), a.getAttribute('data-ancla'));
  });
})();
"""

salida = f"""<title>Portfolio · Fernando García Buzón</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400..700,0..100,0..1;1,9..144,400..700,0..100,0..1&display=swap">

<style>
{css}

/* ---------- Añadidos de la versión de una pieza ---------- */
.pagina[hidden]{{display:none}}
#p-cv{{background:var(--papel-hondo);padding-block:6rem 3rem}}
#p-cv .hoja{{
  width:min(210mm, calc(100% - 2rem));margin-inline:auto;
  background:#fff;color:#414D48;padding:12mm;
  box-shadow:0 10px 40px rgba(20,32,27,.16);
  font-family:'Archivo',Arial,sans-serif;
}}
/* El CV no usa la serif del sitio: su tipografía es Archivo en todo,
   también en los titulares. Sin esto hereda Fraunces y deja de parecer
   un CV. */
#p-cv h1,#p-cv h2,#p-cv h3,#p-cv h4{{
  font-family:'Archivo',Arial,sans-serif;
  font-variation-settings:normal;
  letter-spacing:-.02em;
}}
#p-cv h1{{font-weight:700;color:#14201B}}
#p-cv h2,#p-cv h3{{font-weight:600;color:#14201B}}

{css_cv}
</style>

{svg_filtro}

<div id="campo" aria-hidden="true"></div>

<a class="salto" href="#contenido">Saltar al contenido</a>

<header class="cabecera">{a_router(cabecera)}</header>

<div id="contenido">
{cuerpo}
</div>

<footer class="pie">{a_router(pie_inicio)}</footer>

<script>
{js_campo}
</script>
<script>
{js_main}
</script>
<script>
{ROUTER}
</script>
"""

destino = R / 'portfolio-una-pieza.html'
destino.write_text(salida, encoding='utf-8')
print(f"escrito: {destino}  ({len(salida)//1024} KB)")
print("páginas incluidas:", ", ".join(paginas))
