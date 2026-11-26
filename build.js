// Genera index.html para GitHub Pages a partir de la misma fuente que el artifact.
// Uso: node build.js
const fs = require('fs'), path = require('path');
// La fuente se edita en ../cuaderno-de-concepto.html; cada build guarda copia en src/app.html para que quede versionada.
const fuera = path.join(__dirname, '..', 'cuaderno-de-concepto.html'), dentro = path.join(__dirname, 'src', 'app.html');
if (fs.existsSync(fuera)) fs.copyFileSync(fuera, dentro);
const src = fs.readFileSync(dentro, 'utf8');
// Guarda: JavaScript deja redeclarar funciones sin avisar y la última gana. Si hay dos con el mismo nombre, el build se detiene.
{ const n = new Map(); for (const m of src.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm)) n.set(m[1], (n.get(m[1]) || 0) + 1);
  const rep = [...n].filter(([, c]) => c > 1).map(([k]) => k); if (rep.length) { console.error('Funciones duplicadas: ' + rep.join(', ')); process.exit(1); } }
const shim = fs.readFileSync(path.join(__dirname, 'src', 'shim.js'), 'utf8');
const v = Date.now().toString(36);

const head = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0c0d10">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Taller">
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
<script>if('serviceWorker' in navigator){let tenia=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!tenia){tenia=true;return}if(document.getElementById('pc-nueva'))return;const b=document.createElement('div');b.id='pc-nueva';b.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#ff6a3d;color:#111;padding:10px 16px;border-radius:12px;font:600 14px system-ui;box-shadow:0 6px 24px rgba(0,0,0,.4);cursor:pointer';b.textContent='Hay una versión nueva · toca para actualizar';b.onclick=()=>location.reload();document.body.appendChild(b)});window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=${v}').catch(()=>{}))}</script>
`;
const marker = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/';
if (!src.includes(marker)) throw new Error('No encontré el script de JSZip en la fuente');
let out = head + src.replace(marker, libs + marker);
// el <title> y <style> de la fuente van dentro del head: cerramos head después del primer </style>
out = out.replace('</style>\n\n<div class="app">', '</style>\n</head>\n<body>\n<div class="app">');
if (!out.includes('</head>')) throw new Error('No pude cerrar <head>');
out += '\n</body>\n</html>\n';
// Guarda: si algún script no compila (por ejemplo, una constante declarada dos veces), no se escribe nada.
{ const vm = require('vm'); for (const m of out.matchAll(/<script>([\s\S]*?)<\/script>/g)) { try { new vm.Script(m[1]); } catch (e) { console.error('Error de sintaxis, no se genera la app: ' + e.message); process.exit(1); } } }
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
fs.writeFileSync(path.join(__dirname, 'sw.js'), fs.readFileSync(path.join(__dirname, 'src', 'sw.js'), 'utf8').replace('__V__', v));
console.log('index.html listo (' + (out.length / 1024).toFixed(0) + ' KB), versión ' + v);
