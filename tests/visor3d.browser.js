/* Pruebas del visor 3D: perspectiva dramática, hoja de luces, manos (separar dedos) y pies.
   Uso: abrir la app y ejecutar con javascript_tool: fetch('/tests/visor3d.browser.js').then(r=>r.text()).then(t=>(0,eval)(t)) */
(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),out=[],ok=(n,c,d)=>out.push({n,ok:!!c,d:d||''});
  try{
    v3dAbrir('maniqui','poses');for(let i=0;i<40&&!(V3.open&&V3.figs&&V3.figs[0]);i++)await w(300);ok('el visor abre con un maniquí',V3.open&&V3.figs&&V3.figs[0]);
    /* perspectiva dramática: el lente baja, la cámara se acerca y vuelve a normal */
    S.v3d.drama=0;S.v3d.dramaRef=null;const l0=S.v3d.lente,d0=V3.camera.position.distanceTo(V3.controls.target);v3dDrama(70);const d1=V3.camera.position.distanceTo(V3.controls.target);
    ok('dolly: el lente se abre',S.v3d.lente<l0*.6,l0+'→'+Math.round(S.v3d.lente)+' mm');ok('dolly: la cámara se acerca en proporción',Math.abs(d1/d0-S.v3d.lente/l0)<.05,d0.toFixed(2)+'→'+d1.toFixed(2));
    v3dDrama(100);ok('extremo llega a 10 mm',Math.abs(S.v3d.lente-10)<.6,S.v3d.lente.toFixed(1));v3dDrama(-40);ok('aplanado usa teleobjetivo',S.v3d.lente>90,S.v3d.lente.toFixed(0));v3dDrama(0);ok('vuelve a normal',Math.abs(S.v3d.lente-l0)<1,S.v3d.lente.toFixed(1));
    /* hoja de luces: baja 2 archivos y deja la luz como estaba */
    const luz0=JSON.stringify(S.v3d.luz),rej0=V3.rej&&V3.rej.visible;let cap=[];const og=window.bajarBlob;window.bajarBlob=async(n,b)=>{cap.push({n,b})};
    try{await v3dHojaLuces('color');await v3dHojaLuces('notan')}finally{window.bajarBlob=og}
    ok('hoja de luces: 2 imágenes',cap.length===2&&cap.every(c=>c.b.size>20000),cap.map(c=>c.n).join(', '));ok('la luz del usuario se restaura',JSON.stringify(S.v3d.luz)===luz0);ok('la rejilla del piso se restaura',(V3.rej&&V3.rej.visible)===rej0);
    /* manos */
    ok('21 gestos de mano',Object.keys(V3_MANOS).length>=21,Object.keys(V3_MANOS).length);
    const f=S.v3d.figs[0],en=V3.figs[0],bn=en.model.userData.bn;ok('separar dedos está calibrado',['Index','Ring','Pinky'].every(d=>bn['LeftHand'+d+'1']&&bn['LeftHand'+d+'1'].userData.spr));
    const T=V3.T,dist=()=>{const a=new T.Vector3(),b=new T.Vector3();bn.LeftHandIndex4.getWorldPosition(a);bn.LeftHandPinky4.getWorldPosition(b);return a.distanceTo(b)};
    f.dedos={L:V3_MANOS['Abierta'].slice(),R:V3_MANOS['Abierta'].slice()};f.abre={L:0,R:0};v3dManos(en.model,f);en.model.updateMatrixWorld(true);const a0=dist();f.abre.L=1;v3dManos(en.model,f);en.model.updateMatrixWorld(true);const a1=dist();ok('separar dedos abre la mano',a1>a0*1.4,a0.toFixed(3)+'→'+a1.toFixed(3));
    f.abre.L=0;f.pies={L:48,R:0};v3dManos(en.model,f);ok('pies rápidos aplican',f.pies.L===48&&V3_PIES_RAPIDOS.length>=6);
    /* lógica anatómica de las poses */
    let cod=0,rod=0,n=0;for(const k in V3_POSES){const P=V3_POSES[k];n++;if(P.aLe<0||P.aRe<0||P.aLe>150||P.aRe>150)cod++;if(P.lLk<0||P.lRk<0)rod++}ok('ningún codo ni rodilla hiperextendidos en '+n+' poses',!cod&&!rod,cod+' codos, '+rod+' rodillas');
    ok('la cabeza mira al frente en la salida de carrera (torso inclinado)',V3_POSES['Salida de carrera'].hn<-25,V3_POSES['Salida de carrera'].hn);ok('la cabeza acompaña la torsión de la estocada',Math.abs(V3_POSES['Estocada de espada'].hy)>=10,V3_POSES['Estocada de espada'].hy);ok('la reverencia conserva la cabeza baja',V3_POSES['Reverencia'].hn>=10,V3_POSES['Reverencia'].hn);
    f.pose={...V3_POSES['Estocada de espada']};ok('el pie de atrás apunta en la estocada',v3dPieLogico(f,'R')>20,v3dPieLogico(f,'R'));f.pose={...V3_POSES['De pie']};ok('de pie los pies no se tuercen',v3dPieLogico(f,'L')===0&&v3dPieLogico(f,'R')===0);
    /* movimientos y fondos */
    S.v3d.movK=0;v3dMovPon(0);const pA=JSON.stringify(S.v3d.pose);v3dMovPon(.5);ok('el deslizador de movimiento cambia la pose',JSON.stringify(S.v3d.pose)!==pA&&V3_MOVS.length>=12,V3_MOVS.length+' movimientos');ok('ambientes nuevos de fondo',!!V3_FONDO_N.atelier&&!!V3_FONDO_N.foto);ok('poses nuevas con línea de acción en la biblioteca',['Puñetazo a cámara','Alcanzando algo (escorzo)','Estocada de espada','Salida de carrera'].every(x=>V3_POSES[x]))
  }catch(e){ok('excepción',false,e.message)}
  return {todo:out.every(x=>x.ok),fallos:out.filter(x=>!x.ok),total:out.length}})()
