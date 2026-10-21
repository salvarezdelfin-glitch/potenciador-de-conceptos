// Arma escenarios/index.html a partir de src/ (plantilla + shell + motor). Uso: node escenarios/build.js
const fs = require('fs'), path = require('path');
const dir = __dirname, src = p => fs.readFileSync(path.join(dir, 'src', p), 'utf8');
function rep(t, a, b) { const n = t.split(a).length - 1; if (n !== 1) throw new Error('no único (' + n + '): ' + a.slice(0, 80)); return t.replace(a, () => b); }
let motor = src('motor.js');
// las funciones del overlay de la app antigua se reemplazan por las del shell
for (const f of ['escCentroEstilo', 'escCentroAbre', 'escCentroCierra', 'escCentroGuarda', 'escCentroRender']) motor = rep(motor, 'function ' + f + '(', 'function _x_' + f + '(');
// líneas: cámara ortográfica y líneas sobre fondo transparente
motor = rep(motor, 'float lin(vec2 uv){float d=texture2D(tD,uv).x;float z=d*2.-1.;', 'uniform float ortho,transp;float lin(vec2 uv){float d=texture2D(tD,uv).x;if(ortho>.5)return near+d*(far-near);float z=d*2.-1.;');
motor = rep(motor, '/max(c,.3));\n vec3 n=nrm(vUv);', '/(ortho>.5?3.:max(c,.3)));\n vec3 n=nrm(vUv);');
motor = rep(motor, 'e*=1.-fade*smoothstep(150.,700.,c);', 'if(ortho<.5)e*=1.-fade*smoothstep(150.,700.,c);');
motor = rep(motor, 'gl_FragColor=vec4(mix(paper,vec3(.07,.07,.09),e),1.);}', 'gl_FragColor=transp>.5?vec4(.07,.07,.09,e):vec4(mix(paper,vec3(.07,.07,.09),e),1.);}');
motor = rep(motor, 'L:{value:new T.Vector3(0,1,0)}}', 'L:{value:new T.Vector3(0,1,0)},ortho:{value:0},transp:{value:0}}');
motor = rep(motor, "U.mode.value=m==='lineal'?1:0;", "U.mode.value=m==='lineal'?1:0;U.ortho.value=cam.isOrthographicCamera?1:0;U.transp.value=E.transp?1:0;");
motor = rep(motor, 'r.setClearColor(0xffffff,1);r.clear()', 'r.setClearColor(0xffffff,E.transp?0:1);r.clear()');
// la cámara ortográfica conserva su cerca/lejos
motor = rep(motor, 'V3.camera.far=3000;V3.camera.near=.2;V3.camera.updateProjectionMatrix();', 'if(V3.camera.isPerspectiveCamera){V3.camera.far=3000;V3.camera.near=.2;V3.camera.updateProjectionMatrix()}');
motor = rep(motor, 'if(V3.camera&&V3.camera.far>300){', 'if(V3.camera&&V3.camera.isPerspectiveCamera&&V3.camera.far>300){');
let js = rep(src('shell.js'), '/*__MOTOR__*/', motor);
fs.writeFileSync(path.join(dir, 'index.html'), rep(src('index.tpl.html'), '/*__JS__*/', js));
console.log('escenarios/index.html listo (' + Math.round(fs.statSync(path.join(dir, 'index.html')).size / 1024) + ' KB)');
