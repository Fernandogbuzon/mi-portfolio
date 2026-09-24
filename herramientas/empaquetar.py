"""Genera una copia autocontenida del portfolio para abrir sin conexión.

Incluye las tres páginas, el CV, estilos, JavaScript, capturas y PDF. Solo los
enlaces a proyectos y perfiles externos necesitan internet. El CV se aísla
en un Shadow DOM para que su CSS de impresión no altere el portfolio.
"""

from __future__ import annotations

import base64
import html
import mimetypes
import pathlib
import re
from urllib.parse import urlsplit


RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "portfolio-una-pieza.html"
PAGINAS = {
    "inicio": pathlib.Path("index.html"),
    "adesa": pathlib.Path("casos/adesa-digital.html"),
    "scraper": pathlib.Path("casos/fab-cadiz-scraper.html"),
    "cv": pathlib.Path("cv.html"),
}
RUTAS = {ruta.as_posix(): nombre for nombre, ruta in PAGINAS.items()}
PDF = RAIZ / "cv-fernando-garcia-buzon.pdf"


def leer(ruta: pathlib.Path) -> str:
    return (RAIZ / ruta).read_text(encoding="utf-8")


def parte(documento: str, etiqueta: str) -> str:
    patron = rf"(?is)<{etiqueta}\b[^>]*>(.*?)</{etiqueta}\s*>"
    coincidencia = re.search(patron, documento)
    if not coincidencia:
        raise ValueError(f"Falta <{etiqueta}> en un documento del portfolio")
    return coincidencia.group(1)


def uri_datos(ruta: pathlib.Path) -> str:
    tipo, _ = mimetypes.guess_type(ruta.name)
    tipo = tipo or "application/octet-stream"
    datos = base64.b64encode(ruta.read_bytes()).decode("ascii")
    return f"data:{tipo};base64,{datos}"


def ruta_local(origen: pathlib.Path, enlace: str) -> pathlib.Path | None:
    partes = urlsplit(enlace)
    if partes.scheme or partes.netloc or enlace.startswith("#"):
        return None
    candidata = (RAIZ / origen.parent / partes.path).resolve()
    if not candidata.is_relative_to(RAIZ):
        raise ValueError(f"Enlace fuera del portfolio: {enlace}")
    return candidata


def adaptar_enlaces(cuerpo: str, origen: pathlib.Path) -> str:
    """Enruta HTML locales e incrusta el PDF y las imágenes del sitio."""

    def sustituir_enlace(coincidencia: re.Match[str]) -> str:
        prefijo, enlace, sufijo = coincidencia.groups()
        if enlace == "https://fernandogbuzon.github.io/mi-portfolio/":
            return f'{prefijo}#inicio{sufijo} data-ir="inicio"'
        local = ruta_local(origen, enlace)
        if local is None:
            return coincidencia.group(0)
        relativo = local.relative_to(RAIZ).as_posix()
        if relativo in RUTAS:
            destino = RUTAS[relativo]
            ancla = urlsplit(enlace).fragment
            fragmento = f"#{destino}" + (f"/{ancla}" if ancla else "")
            extra = f' data-ir="{destino}"'
            if ancla:
                extra += f' data-ancla="{html.escape(ancla, quote=True)}"'
            return f"{prefijo}{fragmento}{sufijo}{extra}"
        if local == PDF:
            # El acceso corto «CV» abre el documento HTML; las acciones
            # «Descargar CV» siguen bajando el PDF incrustado.
            if 'class="cv-enlace"' in prefijo:
                return f'{prefijo}#cv{sufijo} data-ir="cv"'
            return f"{prefijo}{uri_datos(PDF)}{sufijo}"
        raise ValueError(f"Enlace local no empaquetado: {enlace} en {origen}")

    cuerpo = re.sub(r'(<a\b[^>]*?\bhref=")([^"]+)(")', sustituir_enlace, cuerpo)

    def sustituir_imagen(coincidencia: re.Match[str]) -> str:
        prefijo, enlace, sufijo = coincidencia.groups()
        local = ruta_local(origen, enlace)
        if local is None:
            return coincidencia.group(0)
        if not local.is_file():
            raise FileNotFoundError(local)
        return f"{prefijo}{uri_datos(local)}{sufijo}"

    cuerpo = re.sub(r'(<img\b[^>]*?\bsrc=")([^"]+)(")', sustituir_imagen, cuerpo)
    # El JS publicado se incluye una sola vez al final del archivo de salida.
    return re.sub(r'(?is)<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*</script>', "", cuerpo)


def css_cv_aislado(css: str) -> str:
    # Dentro del Shadow DOM solo cambian los selectores del documento exterior.
    css = re.sub(r"(?<![\w-]):root(?=\s*\{)", ":host", css)
    return re.sub(r"(?<![\w.-])body(?=\s*\{)", ".cv-documento", css)


documentos = {nombre: leer(ruta) for nombre, ruta in PAGINAS.items()}
css_sitio = leer(pathlib.Path("css/portfolio.css"))
js_sitio = leer(pathlib.Path("js/portfolio.js"))
css_cv = css_cv_aislado(parte(documentos["cv"], "style"))
favicono = uri_datos(RAIZ / "marca/favicon.svg")

cuerpos = {
    nombre: adaptar_enlaces(parte(documentos[nombre], "body"), ruta)
    for nombre, ruta in PAGINAS.items()
}
cv_plantilla = f'<style>{css_cv}</style><div class="cv-documento">{cuerpos.pop("cv")}</div>'
paginas_html = "\n".join(
    f'<div class="pagina" id="p-{nombre}"{(" hidden" if nombre != "inicio" else "")}>{cuerpos[nombre]}</div>'
    for nombre in ("inicio", "adesa", "scraper")
)

enrutador = r"""
(() => {
  const nombres = ['inicio', 'adesa', 'scraper', 'cv'];
  const paginas = nombres.map(nombre => document.getElementById(`p-${nombre}`));
  const cv = document.getElementById('p-cv').attachShadow({mode: 'open'});
  cv.append(document.getElementById('plantilla-cv').content.cloneNode(true));

  function destinoActual() {
    const [nombre, ancla] = decodeURIComponent(location.hash.slice(1)).split('/');
    return {nombre: nombres.includes(nombre) ? nombre : 'inicio', ancla};
  }

  function mostrar(nombre, ancla, guardar = true) {
    if (!nombres.includes(nombre)) return;
    for (const pagina of paginas) pagina.hidden = pagina.id !== `p-${nombre}`;
    if (guardar) history.pushState(null, '', `#${nombre}${ancla ? `/${ancla}` : ''}`);
    const pagina = document.getElementById(`p-${nombre}`);
    const nodos = nombre === 'cv' ? cv.querySelectorAll('[id]') : pagina.querySelectorAll('[id]');
    const destino = ancla && Array.from(nodos).find(nodo => nodo.id === ancla);
    if (destino) destino.scrollIntoView();
    else window.scrollTo(0, 0);
    document.title = nombre === 'inicio' ? 'Fernando García Buzón · Portfolio' :
      nombre === 'adesa' ? 'ADESA 80 · Fernando García Buzón' :
      nombre === 'scraper' ? 'Resultados de la federación · Fernando García Buzón' :
      'CV · Fernando García Buzón';
  }

  function alPulsar(evento) {
    const enlace = evento.target.closest('a');
    if (!enlace) return;
    if (enlace.dataset.ir) {
      evento.preventDefault();
      mostrar(enlace.dataset.ir, enlace.dataset.ancla);
    } else if (enlace.getAttribute('href')?.startsWith('#')) {
      evento.preventDefault();
      mostrar(destinoActual().nombre, enlace.getAttribute('href').slice(1));
    }
  }

  document.addEventListener('click', alPulsar);
  cv.addEventListener('click', alPulsar);
  window.addEventListener('popstate', () => {
    const {nombre, ancla} = destinoActual();
    mostrar(nombre, ancla, false);
  });
  const {nombre, ancla} = destinoActual();
  mostrar(nombre, ancla, false);
})();
"""

js_en_linea = js_sitio.replace("</script", "<\\/script")
salida = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Fernando García Buzón · Portfolio</title>
<link rel="icon" href="{favicono}" type="image/svg+xml">
<script>try{{let tema=localStorage.getItem('tema');if(tema==='claro'||tema==='noche')document.documentElement.dataset.tema=tema}}catch(e){{}}</script>
<style>{css_sitio}
.pagina[hidden]{{display:none!important}}
#p-cv{{background:#eff1f3;min-height:100vh;padding-block:1rem 3rem}}
#p-cv .cv-documento{{display:block}}
</style>
</head>
<body>
{paginas_html}
<div class="pagina" id="p-cv" hidden></div>
<template id="plantilla-cv">{cv_plantilla}</template>
<script>{js_en_linea}</script>
<script>{enrutador}</script>
</body>
</html>
"""

SALIDA.write_text(salida, encoding="utf-8")
print(f"Escrito: {SALIDA} ({SALIDA.stat().st_size // 1024} KB)")
print("Páginas: inicio, ADESA 80, scraper y CV; capturas y PDF incrustados.")
