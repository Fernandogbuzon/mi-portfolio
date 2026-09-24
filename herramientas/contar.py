#!/usr/bin/env python3
"""Cuenta el código disponible y guarda una foto local en datos.json.

Este script se ejecuta a mano. Las cifras visibles del HTML se revisan
por separado; el despliegue no las actualiza. Si falta el repositorio del
scraper, sus datos quedan marcados como no disponibles.
"""
import json, subprocess, pathlib, sys, re

RAIZ = pathlib.Path(__file__).resolve().parent.parent


def corre(cmd, cwd=None):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=60)
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None


def contar_lineas(raiz, patrones, excluir=()):
    """Líneas no vacías de los ficheros que casen, sin recorrer .git."""
    total, ficheros = 0, 0
    for pat in patrones:
        for f in pathlib.Path(raiz).rglob(pat):
            partes = f.parts
            if '.git' in partes or any(e in partes for e in excluir):
                continue
            try:
                texto = f.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            total += sum(1 for l in texto.splitlines() if l.strip())
            ficheros += 1
    return total, ficheros


datos = {'disponible': True, 'fuente': 'contado en el despliegue'}

# --- el propio sitio -------------------------------------------------
css_lineas, css_ficheros = contar_lineas(RAIZ, ['css/*.css'])
js_lineas,  js_ficheros  = contar_lineas(RAIZ, ['js/*.js'])
html_lineas, html_ficheros = contar_lineas(RAIZ, ['*.html', 'casos/*.html'])

datos['sitio'] = {
    'css': css_lineas, 'js': js_lineas, 'html': html_lineas,
    'ficheros': css_ficheros + js_ficheros + html_ficheros,
    'dependencias': 0,
}

# Fecha del último commit local, si Git está disponible.
ultimo = corre(['git', 'log', '-1', '--format=%cI'], cwd=RAIZ)
datos['sitio']['actualizado'] = ultimo
commits = corre(['git', 'rev-list', '--count', 'HEAD'], cwd=RAIZ)
datos['sitio']['commits'] = int(commits) if commits and commits.isdigit() else None

# --- el scraper, si se ha podido clonar ------------------------------
# Si no está junto al portfolio, el bloque queda como no disponible.
scraper = RAIZ.parent / 'fab-cadiz-scraper'
if (scraper / '.git').exists():
    py_lineas, py_ficheros = contar_lineas(scraper, ['*.py'], excluir=('__pycache__',))
    sql_lineas, sql_ficheros = contar_lineas(scraper, ['sql/*.sql'])

    # Tests: contar def test_ de verdad, no estimar.
    tests = 0
    for f in (scraper / 'tests').rglob('*.py') if (scraper / 'tests').exists() else []:
        try:
            tests += len(re.findall(r'^\s*def test_', f.read_text(encoding='utf-8', errors='ignore'), re.M))
        except Exception:
            pass

    crons = 0
    wf = scraper / '.github' / 'workflows'
    if wf.exists():
        for f in wf.rglob('*.y*ml'):
            try:
                crons += len(re.findall(r'^\s*-?\s*cron:', f.read_text(encoding='utf-8', errors='ignore'), re.M))
            except Exception:
                pass

    datos['scraper'] = {
        'disponible': True,
        'python': py_lineas, 'ficherosPython': py_ficheros,
        'sql': sql_lineas, 'migraciones': sql_ficheros,
        'tests': tests or None,
        'crons': crons or None,
        'ultimoCommit': corre(['git', 'log', '-1', '--format=%cI'], cwd=scraper),
    }
else:
    datos['scraper'] = {'disponible': False}

salida = RAIZ / 'datos.json'
salida.write_text(json.dumps(datos, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(datos, indent=2, ensure_ascii=False))
