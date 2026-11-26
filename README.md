# Taller

Sistema privado de conceptualización para concept art e ilustración: Concepto, Mood, Técnica y 3 pilares de Art Direction, referencias con porqué, pipeline de producción, crítica profesional y estilo propio.

- App: https://salvarezdelfin-glitch.github.io/potenciador-de-conceptos/
- El código es público; los datos no. Viven en Supabase con acceso solo para la cuenta autorizada (RLS + bucket privado).
- Diagnóstico, decisiones y pendientes: [AUDITORIA.md](AUDITORIA.md).

## Ejecutar y desplegar
- La fuente se edita en `../cuaderno-de-concepto.html` (si no existe, se usa `src/app.html`).
- `node build.js` genera `index.html` y `sw.js` y actualiza `src/app.html`.
- Local: servir esta carpeta con cualquier servidor estático (en este equipo, el servidor `potenciador` en el puerto 8131). Los datos reales piden iniciar sesión.
- Desplegar: commit y `git push`; GitHub Pages publica.

## Modelador de escenarios (herramienta aparte)
- https://salvarezdelfin-glitch.github.io/potenciador-de-conceptos/escenarios/
- Fuente en `escenarios/src/` (plantilla, shell y motor); se arma con `node escenarios/build.js` → `escenarios/index.html`.
- No usa login ni datos privados: guarda en el navegador (localStorage) y exporta/abre archivos `.escenario.json`.
