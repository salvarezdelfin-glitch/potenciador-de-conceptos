/* Prueba del Taller de diseño con bocetos sintéticos.
   Uso: abrir la app (npm run / preview), pegar este archivo en la consola o ejecutarlo con javascript_tool.
   Devuelve un arreglo de {caso, ok, detalle}. */
(async()=>{
  const W=1000,H=420,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,W,H);g.strokeStyle='#2255cc';g.lineWidth=3;g.lineCap='round';
  const L=(...p)=>{g.beginPath();g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.stroke()};
  /* 0: pose rígida */ L(80,40,80,380);L(50,120,110,120);L(60,380,100,380);g.beginPath();g.arc(80,28,14,0,7);g.stroke();
  /* 1: pose S dinámica */ g.beginPath();g.moveTo(260,380);g.bezierCurveTo(200,300,330,230,250,150);g.bezierCurveTo(230,110,280,90,290,60);g.stroke();L(250,150,190,200);L(250,150,320,130);g.beginPath();g.arc(292,45,14,0,7);g.stroke();
  /* 2: busto con tocado cerrado */ g.beginPath();g.ellipse(520,260,70,90,0,0,7);g.stroke();g.beginPath();g.moveTo(450,200);g.lineTo(470,90);g.lineTo(520,150);g.lineTo(570,80);g.lineTo(590,200);g.stroke();
  const bm=await createImageBitmap(c);S.es=Object.assign(esPreparar(bm,.5),{orig:bm,crops:[],foco:null});
  const cajas=[[.03,.03,.16,.94],[.2,.03,.2,.94],[.4,.03,.2,.94]].map(q=>esCrop(...q));
  S.es.crops=cajas;const out=[];
  for(const r of cajas)await esAnaliza(r);
  const crit=cajas.map(r=>esCrit(r)),tipos=crit.map(c=>c&&c.tipo);
  const chk=(caso,ok,detalle)=>out.push({caso,ok,detalle});
  chk('pose rígida → pose',tipos[0]==='pose',tipos[0]);
  chk('pose S → pose',tipos[1]==='pose',tipos[1]);
  chk('busto cerrado NO es pose',tipos[2]!=='pose',tipos[2]);
  chk('S vence a la rígida',crit[1].total>crit[0].total,crit[0].total+' vs '+crit[1].total);
  /* escena ancha aparte */
  const c2=document.createElement('canvas');c2.width=900;c2.height=450;const h=c2.getContext('2d');h.fillStyle='#fff';h.fillRect(0,0,900,450);h.fillStyle='#bbc';h.fillRect(0,150,900,110);h.fillStyle='#223';h.fillRect(0,260,900,190);h.fillStyle='#99a';h.fillRect(0,0,900,150);h.fillStyle='#dde';h.beginPath();h.arc(300,110,50,0,7);h.fill();h.fillStyle='#556';h.fillRect(560,150,200,150);
  const bm2=await createImageBitmap(c2);S.es=Object.assign(esPreparar(bm2,.5),{orig:bm2,crops:[],foco:null});const k=esCrop(.02,.02,.96,.96);S.es.crops=[k];await esAnaliza(k);
  chk('escena → key',esCrit(k).tipo==='key',esCrit(k).tipo);
  return out;
})()
