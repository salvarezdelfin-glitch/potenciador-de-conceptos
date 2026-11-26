/* Pruebas de Portafolio en PDF y del editor de páginas. Uso: fetch('/tests/portafolio-pdf.browser.js').then(r=>r.text()).then(t=>(0,eval)(t)) */
(async()=>{const out=[],ok=(n,c,d)=>out.push({n,ok:!!c,d:d||''});
  try{
    const mk=(c1,c2,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fillRect(0,0,w,h);return c.toDataURL('image/jpeg',.8)};
    const pf=(t,d)=>({estado:'aprobada',titulo:t,anio:'2026',disciplina:d,seccion:'projects',desc:'Descripción',asesor:'x',notasAsesor:'',revisada:true,mejor:true,ts:1});
    const p=nuevoProyecto('Prueba PDF');p.piezas=[{id:'a',etapa:'Color',src:mk('#2a3b5a','#d9824a',1600,900),pf:pf('Plaza','Environment')},{id:'b',etapa:'Thumbnail',src:mk('#333','#999',800,450)},{id:'c',etapa:'Color',src:mk('#3a2b2a','#4aa0d9',1200,1500),pf:pf('Guardián','Character')}];S.P['tpdf']=p;
    const C=pdfCfg();C.init=false;C.sel=[];C.mail='a@b.c';C.proc={};C.lay={};C.sobre='';const sel=pdfSelecc();ok('toma solo piezas con visto bueno',sel.length===2,sel.length);
    C.proc[pdfKey(sel[0])]=true;C.lay[pdfKey(sel[1])]='datos';C.sobre='Texto';
    const pgs=await pdfPaginas(480,270);const t=pgs.map(x=>x.t);ok('portada, sobre mí, piezas, proceso y contacto',t[0]==='Portada'&&t.includes('Sobre mí')&&t.some(x=>/^Proceso/.test(x))&&t[t.length-1]==='Contacto',t.join('|'));
    const [,W,H,wpt,hpt]=PDF_SZ.pantalla;const blob=await pgPdfBlob(pgs.map(x=>x.cv),wpt,hpt,'Test',.7),b=new Uint8Array(await blob.arrayBuffer()),txt=new TextDecoder('latin1').decode(b);
    ok('PDF válido: cabecera, fin y número de páginas',txt.startsWith('%PDF-1.4')&&/%%EOF$/.test(txt.trim())&&+(txt.match(/\/Count (\d+)/)||[])[1]===pgs.length);
    const sx=+txt.match(/startxref\n(\d+)/)[1];const offs=[...txt.slice(sx).matchAll(/(\d{10}) 00000 n/g)].map(x=>+x[1]);ok('tabla de referencias correcta',offs.every((o,i)=>txt.slice(o,o+((i+1)+' 0 obj').length)===(i+1)+' 0 obj'));
    ok('la revisión da recomendaciones',pdfRevision().length>=6);
    S.vista='pdfport';render();await new Promise(r=>setTimeout(r,800));ok('la pantalla lista las piezas aprobadas',document.querySelectorAll('.pdfp-f').length===2);
    /* editor de páginas */
    pgUsaSet('concept');const st=pgEst(1);st.t='X';st.esq=28;st.num=false;st.cred='Cr';st.tOn=false;let e=null;try{await pgRender(1,true)}catch(x){e=x.message}ok('la página se dibuja con esquinas, sin número y con crédito',!e,e||'');
    {const C2=pdfCfg();C2.perfil='estudios';C2.chk={};const h=pdfEstudiosHTML();ok('revisión para Disney, DreamWorks y Netflix',/Walt Disney/.test(h)&&/DreamWorks/.test(h)&&/Netflix/.test(h)&&PDF_PERFIL.estudios.pide.length>=3);const p0=pdfSelecc();ok('una casilla marcada por ti sube el porcentaje',(()=>{const a1=pdfEstudiosHTML().match(/([0-9]+)%/g).join();C2.chk.persp=true;C2.chk.luz=true;return pdfEstudiosHTML().match(/([0-9]+)%/g).join()!==a1})());C2.chk={};C2.perfil='juegos'}
    ok('hay consejos por plantilla',Object.keys(PG_TIPS).length===5);delete S.P['tpdf'];st.esq=0;st.num=true;st.cred='';st.tOn=true;
  }catch(e){ok('excepción',false,e.message)}
  return {todo:out.every(x=>x.ok),fallos:out.filter(x=>!x.ok),total:out.length}})()
