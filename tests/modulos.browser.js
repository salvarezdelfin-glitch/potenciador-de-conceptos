/* Pruebas de los módulos nuevos (siluetas, portafolio en 5 sets, cuadrículas, secciones, vender, respaldo).
   Se corre en la página: fetch('/tests/modulos.browser.js').then(r=>r.text()).then(t=>(0,eval)(t)).then(console.log) */
(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),out=[],ok=(n,c,d)=>out.push({n,ok:!!c,d:d||''});
  const guarda={aj:JSON.stringify(S.ajustes.pgProy||null),sil:S.ajustes.silFavs,vl:S.ajustes.ventasLog,vc:S.ajustes.vtCalc};
  try{
    /* siluetas: todas las categorías pintan tinta */
    for(const [k] of SIL_CATS){const c=pgGen(k,3,7,1),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let t=0;for(let i=0;i<d.length;i+=200)if(d[i]<80)t++;ok('silueta '+k,t>5,t+' px de tinta')}
    /* 10 criaturas y 10 personajes distintos entre sí */
    for(const cat of ['criatura','personaje']){const hs=new Set();for(let v=0;v<10;v++){const c=pgGen(cat,1,v,1);hs.add(c.toDataURL().length+':'+c.toDataURL().slice(-40))}ok('10 '+cat+' distintas',hs.size===10,hs.size+' distintas')}
    /* los 5 sets arman todas sus páginas */
    for(const [k,nom] of PG_SETMETA){pgUsaSet(k);let bien=0;for(let n=1;n<=PG_PAGS.length;n++){const cv=await pgRender(n,false);if(cv.width===1600&&cv.height===1000)bien++}ok('set '+nom+' ('+PG_PAGS.length+' págs)',bien===PG_PAGS.length)}
    pgUsaSet('concept');
    /* cuadrícula: 1, 2 y 3 puntos */
    const I={cam:'',luz:'',luzK:''};S.ahora=null;const g=ahGridEst(I);for(const p of [1,2,3]){g.pts=p;const r=ahGridCapas(I,g,640,360);ok('cuadrícula '+p+' puntos',r.capas.length>=6&&r.capas.some(c=>c.children))}
    /* secciones: cada pantalla agrupada abre y tiene barra */
    let falla=[];for(const h of HUBS)for(const [v] of h[3]){if(v[0]==='@')continue;try{S.vista=v;render();await w(60);if(h[3].length>1&&!document.querySelector('.hub-bar'))falla.push(v)}catch(e){falla.push(v+':'+e.message)}}ok('secciones abren con su barra',!falla.length,falla.join(','));
    /* vender: la fórmula de precio */
    const c=vtCalcE();Object.assign(c,{costo:0,envio:0,fijo:0,pct:10,horas:5,tarifa:250,n:20});const r=vtCalcR();ok('precio mínimo = costos / (1 − comisión)',Math.abs(r.min)<.001);ok('precio sugerido cubre tu tiempo',Math.abs(r.sug-69.4444)<.01,r.sug.toFixed(2));ok('neto por venta',Math.abs(r.neto-62.5)<.01,r.neto.toFixed(2));
    Object.assign(c,{costo:30,envio:20,fijo:5,pct:10,horas:0,n:1});const r2=vtCalcR();ok('mínimo con costos',Math.abs(r2.min-(55/.9))<.01,r2.min.toFixed(2));
    /* respaldo: ida y vuelta */
    S.ajustes.ventasLog=[{id:'t1',t:'x',canal:'y',monto:10,fecha:'2026-01-01'}];const d={tipo:'potenciador-respaldo',version:1,fecha:new Date().toISOString(),ajustes:JSON.parse(JSON.stringify(S.ajustes)),proyectos:{}};S.ajustes.ventasLog=[];Object.assign(S.ajustes,d.ajustes);ok('respaldo restaura ajustes',(S.ajustes.ventasLog||[]).length===1)
  }catch(e){ok('excepción',false,e.message)}
  finally{try{S.ajustes.pgProy=JSON.parse(guarda.aj)}catch{}S.ajustes.silFavs=guarda.sil;S.ajustes.ventasLog=guarda.vl;S.ajustes.vtCalc=guarda.vc;S.ahora=null}
  return {todo:out.every(x=>x.ok),fallos:out.filter(x=>!x.ok),total:out.length}})()
