# Pruebas del navegador
Se ejecutan pegando el archivo en la consola con la app abierta (o con `javascript_tool`).
- `taller.browser.js`: bocetos sintéticos (pose rígida, pose en S, busto, escena) → tipo y orden de notas esperados.
- `barrido.browser.js`: abre cada pestaña de Herramientas y reporta errores.
- `proyectos.browser.js`: clics reales sobre proyecto, etapas, entregables, Estudio, PDF y guardado (servidor simulado, con corte de red). Tarda unos 25 a 40 s; guardar el resultado en una variable y consultarlo.
- `auditoria.browser.js`: recorre todas las pantallas (errores, botones sin manejador, campos sin etiqueta, desbordes). Correr en dos mitades con `window.__aud={desde:0,hasta:30}` y `{desde:30,hasta:999}`. `ir-abre` es un falso positivo (tiene su propio listener).
- `modulos`, `visor3d`, `mascara`, `camara`, `camara2`, `portafolio-pdf`: pruebas por módulo.
Límite: usan dibujos sintéticos, no bocetos reales; para eso está el botón «La lectura está mal: reportarla» del Taller.
