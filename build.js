// Genera index.html para GitHub Pages a partir de la misma fuente que el artifact.
// Uso: node build.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'cuaderno-de-concepto.html'), 'utf8');
const shim = fs.readFileSync(path.join(__dirname, 'src', 'shim.js'), 'utf8');
const v = Date.now().toString(36);

const head = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#101216">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Potenciador">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font-family:system-ui,sans-serif;font-size:14px;-webkit-text-size-adjust:100%}
img{max-width:100%}[hidden]{display:none!important}
</style>
`;
const libs = `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>
${shim}
</script>
<script>if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=${v}').catch(()=>{}));</script>
`;
const marker = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/';
if (!src.includes(marker)) throw new Error('No encontré el script de JSZip en la fuente');
let out = head + src.replace(marker, libs + marker);
// el <title> y <style> de la fuente van dentro del head: cerramos head después del primer </style>
out = out.replace('</style>\n\n<div class="app">', '</style>\n</head>\n<body>\n<div class="app">');
if (!out.includes('</head>')) throw new Error('No pude cerrar <head>');
out += '\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
fs.writeFileSync(path.join(__dirname, 'sw.js'), fs.readFileSync(path.join(__dirname, 'src', 'sw.js'), 'utf8').replace('__V__', v));
console.log('index.html listo (' + (out.length / 1024).toFixed(0) + ' KB), versión ' + v);
