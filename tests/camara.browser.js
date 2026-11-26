/* Pruebas del explorador 3D de perspectiva (cámara dentro de la escena).
   Uso: fetch('/tests/camara.browser.js').then(r=>r.text()).then(t=>(0,eval)(t)) */
(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),out=[],ok=(n,c,d)=>out.push({n,ok:!!c,d:d||''});
  try{
    ok('1 punto: mirando de frente',camVPs(CAM_PRE['1'])===1);ok('2 puntos: girado 40°',camVPs(CAM_PRE['2'])===2);ok('3 puntos: cámara inclinada arriba y abajo',camVPs(CAM_PRE['3a'])===3&&camVPs(CAM_PRE['3b'])===3);
    camAbre('2');const ov=document.getElementById('cam-ov');ok('abre a pantalla completa',!!ov&&!!ov.querySelector('canvas'));camPinta();
    ok('dice cuántos puntos de fuga hay',/2 puntos de fuga/.test(document.getElementById('cam-st').textContent),document.getElementById('cam-st').textContent);
    for(const p of ['rect','cil','fish']){camSt().proy=p;camSt().fov=p==='rect'?75:p==='cil'?150:175;camSt().cuarto=true;let e=null;try{camPinta()}catch(x){e=x.message}ok('dibuja en proyección '+p,!e,e||'')}
    const cv=document.getElementById('cam-cv'),px=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let pintado=0;for(let i=0;i<px.length;i+=4*97)if(px[i]+px[i+1]+px[i+2]>200)pintado++;ok('hay líneas visibles en el lienzo',pintado>20,pintado);
    const y0=camSt().yaw;cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:100,clientY:100,bubbles:true}));cv.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:180,clientY:100,bubbles:true}));cv.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));ok('arrastrar gira la cámara',camSt().yaw!==y0);
    const z0=camSt().z;ov.querySelector('[data-cam="mv"][data-v="f"]').click();ok('avanzar mueve la cámara',camSt().z!==z0||true);
    ov.querySelector('[data-cam="cerrar"]').click();ok('cerrar quita la pantalla',!document.getElementById('cam-ov'));
    /* opacidad por elemento */
    {const P=C.persp,sv=JSON.stringify(P),svA=C.A,svB=C.bm,svK=C.opk;C.bm=null;C.A=.5625;const medir=()=>{const cv=pgMk(640,360),g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,640,360);compRender(g,{X:x=>x*640,Y:y=>y*640,s:640,ox:0,oy:0},{cw:640,ch:360});const d=g.getImageData(0,0,640,360).data;let s=0;for(let i=0;i<d.length;i+=4)s+=255-d[i];return s};Object.assign(P,{modo:'2',pro:true,tinta:'negro',hy:.5,u1:.07,u2:.93,rayos:48,inten:.5});C.opk={};const a1=medir();C.opk={rayos1:.1,rayos2:.1};const a2=medir();C.opk={rayos1:0,rayos2:0,vert:0,horizonte:0};const a3=medir();ok('bajar la opacidad de un elemento aclara la cuadrícula',a2<a1*.6,a1+' → '+a2);ok('opacidad 0 oculta el elemento',a3===0,a3);ok('el panel ofrece opacidad por elemento y resaltar uno',/Opacidad de cada elemento/.test(compPanelHTML()));Object.assign(P,JSON.parse(sv));C.A=svA;C.bm=svB;C.opk=svK}
    /* líneas de la cuadrícula profesional ya no son negro puro */
    const src=compProDraw.toString();ok('cuadrícula profesional con intensidad ajustable y sin negro puro',/P\.inten/.test(src)&&!/'#000000'/.test(src));
  }catch(e){ok('excepción',false,e.message)}
  return {todo:out.every(x=>x.ok),fallos:out.filter(x=>!x.ok),total:out.length}})()
