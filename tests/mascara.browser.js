/* Pruebas de Iluminar ilustración: máscara pintable, mapa normal, fondo y luz que sigue.
   Uso: abrir la app y ejecutar con javascript_tool: fetch('/tests/mascara.browser.js').then(r=>r.text()).then(t=>(0,eval)(t)) */
(async()=>{const w=ms=>new Promise(r=>{setTimeout(r,ms);requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,ms)))}),out=[],ok=(n,c,d)=>out.push({n,ok:!!c,d:d||''});
  try{
    const c=document.createElement('canvas');c.width=300;c.height=200;const g=c.getContext('2d');g.fillStyle='#226a66';g.fillRect(0,0,300,200);const gr=g.createRadialGradient(150,100,5,150,100,70);gr.addColorStop(0,'#fff');gr.addColorStop(1,'#a33');g.fillStyle=gr;g.beginPath();g.arc(150,100,70,0,7);g.fill();
    await rlCarga(await createImageBitmap(c),'prueba');herrAbre('relite');await w(500);
    const box=document.querySelector('#rl-box'),cv=document.querySelector('#rl-cv');ok('lienzo y panel',!!box&&!!document.querySelector('[data-act="rl-pinta"]'));
    const ev=(t,x,y)=>{const r=cv.getBoundingClientRect();cv.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+r.width*x,clientY:r.top+r.height*y,pointerId:1,isPrimary:true}))};
    const kk=(((RL.R.H/2)|0)*RL.R.W+((RL.R.W*.62)|0));
    S.rl.fuerza=1;S.rl.x=.1;S.rl.y=.1;S.rl.int=2.5;rlActualiza(false);const antes=Array.from(RL.R.out.data.slice(0,0)),conLuz=[...RL.R.out.data.slice(kk*4,kk*4+3)];
    const orig=[...RL.R.src.data.slice(kk*4,kk*4+3)];
    ok('la luz cambia el centro',conLuz.some((v,i)=>Math.abs(v-orig[i])>3),conLuz+' vs '+orig);
    /* pintar */
    await accionRl('rl-pinta',null,null,{v:'quita'});await w(700);ok('modo pintar activo',S.rl.pinta==='quita'&&document.querySelector('#rl-box.pinta'));
    const box2=document.querySelector('#rl-box'),cv2=document.querySelector('#rl-cv'),ev2=(t,x,y)=>{const r=cv2.getBoundingClientRect();box2.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+r.width*x,clientY:r.top+r.height*y,pointerId:1,isPrimary:true}))};
    if(!box2.dataset.m)rlMonta();S.rl.pincel=.4;ev2('pointerdown',.4,.5);for(let i=0;i<=12;i++)ev2('pointermove',.4+i*.017,.5);ev2('pointerup',.6,.5);await w(300);
    const k=kk;ok('la máscara se guarda',RL.mkHay&&RL.R.mk,RL.mkHay);ok('máscara fuerte en lo pintado',RL.R.mk&&RL.R.mk[k]>.9,RL.R.mk&&RL.R.mk[k].toFixed(2));
    ok('lo no pintado queda sin máscara',RL.R.mk[5]===0,RL.R.mk[5]);
    const tras=[...RL.R.out.data.slice(k*4,k*4+3)];ok('zona pintada vuelve a la pintura original',tras.every((v,i)=>Math.abs(v-orig[i])<=4),tras+' vs '+orig);
    /* deshacer */
    rlMkOp('deshacer');ok('deshacer limpia la pincelada',!RL.mkHay&&!RL.R.mk);rlMkOp('todo');ok('todo sin luz',RL.R.mk&&RL.R.mk[5]>.99);rlMkOp('invertir');ok('invertir deja todo con luz',RL.R.mk&&RL.R.mk[5]<.01);
    /* devolver luz */
    rlMkOp('limpiar');S.rl.pinta='quita';ev2('pointerdown',.5,.5);ev2('pointerup',.5,.5);S.rl.pinta='da';ev2('pointerdown',.5,.5);ev2('pointerup',.5,.5);ok('devolver luz borra',RL.R.mk&&RL.R.mk[k]<.5||!RL.R.mk,RL.R.mk&&RL.R.mk[k].toFixed(2));
    /* sobrevive a re-preparar y a la exportación */
    rlMkOp('limpiar');rlMkOp('todo');rlReprepara();ok('la máscara sobrevive al re-preparar',RL.R.mk&&RL.R.mk[k]>.99);
    let cap=[];const og=window.bajarBlob;window.bajarBlob=async(n,b)=>{cap.push({n,b})};try{await rlExporta('png')}finally{window.bajarBlob=og}ok('exporta PNG con la máscara',cap.length===1&&cap[0].b.size>500,cap[0]&&cap[0].n);
    /* imagen nueva reinicia la máscara */
    await rlCarga(await createImageBitmap(c),'otra');ok('imagen nueva: máscara vacía',!RL.mkHay&&!RL.R.mk&&S.rl.pinta==='');
    /* renderizar varias veces seguidas no duplica la pincelada */
    S.rl.pinta='quita';rlMkOp('limpiar');renderMain();renderMain();renderMain();await w(900);{const b=document.querySelector('#rl-box');rlMonta();rlMonta();const r=b.getBoundingClientRect(),n0=RL.mkU.length;b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width*.5,clientY:r.top+r.height*.5,pointerId:1}));b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));ok('una pincelada = un solo deshacer',RL.mkU.length===n0+1,n0+' → '+RL.mkU.length)}
    /* luz que sigue sigue funcionando sin pintar */
    renderMain();await w(300);S.rl.sigue=true;const b3=document.querySelector('#rl-box');b3.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:b3.getBoundingClientRect().left+20,clientY:b3.getBoundingClientRect().top+20,pointerId:1}));ok('la luz sigue al cursor',S.rl.x<.2,S.rl.x.toFixed(2));S.rl.sigue=false;
  }catch(e){ok('excepción',false,e.message+' '+(e.stack||'').slice(0,200))}
  return {todo:out.every(x=>x.ok),fallos:out.filter(x=>!x.ok),total:out.length}})()
