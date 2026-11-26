/* Pruebas de las herramientas del explorador 3D: medir, elipses, regla de fuga, boceto, sombras, escenas, vistas y lienzo 2D.
   Uso: fetch('/tests/camara2.browser.js').then(r=>r.text()).then(t=>(0,eval)(t)) */
(async()=>{const out=[],ok=(n,c,d)=>out.push({n,ok:!!c,d:d||''});
  try{
    document.getElementById('cam-ov')?.remove();C.cam=null;camAbre('1');const ov=document.getElementById('cam-ov'),cv=document.getElementById('cam-cv'),Q=camSt();ov.style.zIndex=99999999;camPinta();
    const tinta=()=>{camPinta();const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let s=0;for(let i=0;i<d.length;i+=4*7)s+=d[i]+d[i+1]+d[i+2];return s};
    /* proyección inversa: un punto del piso proyectado y vuelto a buscar es el mismo */
    {const pj=camProy(Q,cv.width,cv.height),B=camBase(Q),p=[2,0,9],c=camDir(B,[p[0]-Q.x,p[1]-Q.y,p[2]-Q.z]),s=pj.pr(c),h=camPiso(Q,cv.width,cv.height,s[0],s[1]);ok('rayo por un píxel cae en el mismo punto del piso',h&&Math.abs(h[0]-p[0])<.01&&Math.abs(h[2]-p[2])<.01,h&&h.map(v=>v.toFixed(3)).join(','))}
    for(const pr of ['cil','fish']){Q.proy=pr;Q.fov=pr==='cil'?150:170;const pj=camProy(Q,cv.width,cv.height),B=camBase(Q),p=[1,0,7],c=camDir(B,[p[0]-Q.x,p[1]-Q.y,p[2]-Q.z]),s=pj.pr(c),h=camPiso(Q,cv.width,cv.height,s[0],s[1]);ok('rayo inverso en '+pr,h&&Math.abs(h[0]-p[0])<.02&&Math.abs(h[2]-p[2])<.02,h&&h.map(v=>v.toFixed(3)).join(','))}
    Object.assign(Q,CAM_PRE['2']);
    /* medir */
    const t0=tinta();Q.medidas.push({a:[0,0,5],b:[3,0,9]});ok('una medida se dibuja',tinta()!==t0);
    /* elipse */
    const t1=tinta();Q.formas.push({plano:'suelo',c:[0,0,6],r:2});ok('una elipse en el piso se dibuja',tinta()!==t1);const t1b=tinta();Q.formas.push({plano:'pa',c:[3,0,8],r:1});ok('un círculo de pie se dibuja',tinta()!==t1b);
    /* sombras */
    Q.sombras=false;const t2=tinta();Q.sombras=true;ok('las sombras de la luz aparecen',tinta()!==t2);Q.sombras=false;
    /* escenas */
    let bien=true,det='';for(const k of Object.keys(CAM_ESC)){Q.escena=k;Q.cuarto=!!CAM_ESC[k].cuarto;try{if(!(tinta()>0)){bien=false;det+=k+' '}}catch(e){bien=false;det+=k+':'+e.message}}ok('las '+Object.keys(CAM_ESC).length+' escenas de ejemplo se dibujan',bien,det);Q.escena='base';Q.cuarto=false;
    /* personas de escala */
    Q.npers=0;const t3=tinta();Q.npers=4;ok('más personas de escala cambian la vista',tinta()!==t3);
    /* vistas guardadas */
    S.ajustes.camVistas=[];ov.querySelector('[data-cam="vsave"]').click();ok('guardar una vista de cámara',S.ajustes.camVistas.length===1);const yaw0=Q.yaw;Q.yaw=2;ov.querySelector('[data-cam="vgo"]').click();ok('volver a una vista guardada',Math.abs(Q.yaw-yaw0)<1e-9);ov.querySelector('[data-cam="vdel"]').click();ok('quitar una vista guardada',S.ajustes.camVistas.length===0);
    /* boceto y regla con el puntero */
    camPinta();const r=cv.getBoundingClientRect(),ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{pointerId:3,clientX:r.left+x,clientY:r.top+y,bubbles:true}));
    Q.tool='boceto';ev('pointerdown',100,300);ev('pointermove',140,320);ev('pointermove',180,330);ev('pointerup',180,330);ok('el boceto guarda el trazo',Q.trazos.length===1&&Q.trazos[0].pts.length>=3);
    Object.assign(Q,CAM_PRE['1']);Q.tool='regla';camPinta();Q.trazos.length=0;const cx=r.width/2,cy=r.height/2,x0=cx-120,y0=cy+160;ev('pointerdown',x0,y0);ev('pointermove',x0+40,y0-52);ev('pointerup',x0+40,y0-52);
    {const t=Q.trazos[0];let bien2=false,dd='';if(t&&t.pts.length===2){const a=[t.pts[0][0]*cv.width,t.pts[0][1]*cv.height],b=[t.pts[1][0]*cv.width,t.pts[1][1]*cv.height],vp=[cv.width/2,cv.height/2],u=[b[0]-a[0],b[1]-a[1]],w=[vp[0]-a[0],vp[1]-a[1]],cr=Math.abs(u[0]*w[1]-u[1]*w[0])/(Math.hypot(...u)*Math.hypot(...w));bien2=cr<.02;dd='seno '+cr.toFixed(4)}ok('la regla pega la línea al punto de fuga',bien2,dd)}
    /* de la vista 3D al lienzo 2D */
    Q.tool='mirar';Q.trazos.length=0;Q.medidas.length=0;Q.formas.length=0;Object.assign(Q,CAM_PRE['2']);C.A=.5625;C.camGuia=null;camALienzo();
    ok('la vista pasa al lienzo con fondo transparente',!!C.camGuia&&C.camGuia.cv.width===1920&&C.camGuia.cv.height===Math.round(1920*.5625)&&C.camGuia.cv.getContext('2d').getImageData(2,2,1,1).data[3]===0);
    {const c2=pgMk(640,360),g=c2.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,640,360);compRender(g,{X:x=>x*640,Y:y=>y*640,s:640,ox:0,oy:0},{cw:640,ch:360,solo:'camguia'});const d=g.getImageData(0,0,640,360).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<235)n++;ok('el lienzo dibuja la vista 3D como capa',n>200,n)}
    C.opk={camguia:0};{const c2=pgMk(320,180),g=c2.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,320,180);compRender(g,{X:x=>x*320,Y:y=>y*320,s:320,ox:0,oy:0},{cw:320,ch:180,solo:'camguia'});const d=g.getImageData(0,0,320,180).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<250)n++;ok('su opacidad se puede bajar a cero',n===0,n)}
    /* sincronización automática con el lienzo al mover la cámara */
    C.camGuia=null;camAbre('2');{const Q2=camSt();Q2.sync=false;const ov2=document.getElementById('cam-ov');ov2.querySelector('[data-cam=\"sync\"]').click();const ya=C.camGuia&&C.camGuia.cv.getContext('2d').getImageData(0,0,1920,1080).data.reduce((s,v,i)=>i%97===0?s+v:s,0);Q2.yaw+=.4;camPinta();await new Promise(r=>setTimeout(r,450));const yb=C.camGuia&&C.camGuia.cv.getContext('2d').getImageData(0,0,1920,1080).data.reduce((s,v,i)=>i%97===0?s+v:s,0);ok('al mover la cámara, el lienzo se actualiza solo',!!C.camGuia&&ya!==yb,ya+' → '+yb);ov2.querySelector('[data-cam=\"sync\"]').click();const yc=C.camGuia.cv.getContext('2d').getImageData(0,0,1920,1080).data.reduce((s,v,i)=>i%97===0?s+v:s,0);Q2.yaw+=.4;camPinta();await new Promise(r=>setTimeout(r,450));const yd=C.camGuia.cv.getContext('2d').getImageData(0,0,1920,1080).data.reduce((s,v,i)=>i%97===0?s+v:s,0);ok('apagada la sincronización, el lienzo ya no cambia',yc===yd)}
    C.opk={};C.camGuia=null;document.getElementById('cam-ov')?.remove();camAbierta=false;
  }catch(e){ok('excepción',false,e.message+' '+(e.stack||'').split('\n')[1])}
  return {todo:out.every(x=>x.ok),fallos:out.filter(x=>!x.ok),total:out.length}})()
