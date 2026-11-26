/* Flujos principales con clics y eventos reales sobre la interfaz, contra un servidor de mentira que se puede "desconectar".
   Uso: fetch('/tests/proyectos.browser.js').then(r=>r.text()).then(t=>(0,eval)(t)) */
(async()=>{const out=[],ok=(n,c,d)=>out.push({n,ok:!!c,d:d===undefined?'':String(d)}),w=ms=>new Promise(r=>setTimeout(r,ms));
  const nube=new Map();let caida=false;const falla=()=>{if(caida)throw{code:'unavailable',message:'sin red'}};
  const copia=x=>JSON.parse(JSON.stringify(x));
  const ref=(c,i)=>({id:i,async get(){falla();const v=nube.get(c+'/'+i);return {id:i,exists:!!v,data:()=>v&&copia(v)}},async set(d){falla();nube.set(c+'/'+i,copia(d))},async delete(){falla();nube.delete(c+'/'+i)}});
  const falso={doc:p=>{const [c,i]=p.split('/');return ref(c,i)},collection:c=>({doc:i=>ref(c,i||uid()),where(){return this},async get(){falla();const docs=[...nube].filter(([k])=>k.startsWith(c+'/')).map(([k,v])=>({id:k.slice(c.length+1),data:()=>copia(v)}));return {docs,size:docs.length,empty:!docs.length}}})};
  const dbAntes=S.db,ajAntes=copia(S.ajustes),pAntes=Object.keys(S.P),q=s=>document.querySelector('#main '+s),
    clic=s=>{const el=q(s);if(!el)throw new Error('no existe '+s);el.click()},escribe=(s,v,ev='input')=>{const el=q(s);if(!el)throw new Error('no existe '+s);el.value=v;el.dispatchEvent(new Event(ev,{bubbles:true}))},asienta=async()=>{await w(1100)};
  try{
    for(const k of await PEND.claves())await PEND.quita(k);pendClaves.clear();S.db=falso;
    /* crear */
    S.vista='inicio';render();await w(150);clic('[data-act="nuevo"]');await w(300);const id=S.cur;ok('crear proyecto desde el Estudio abre sus etapas',S.vista==='proyecto'&&S.tab==='seisfases'&&!!q('.mesa'),S.tab);
    /* ficha */
    escribe('#mf-nombre','Templo hundido');escribe('#mf-descripcion','Un templo tragado por el agua');escribe('#mf-objetivo','Pieza de portafolio de entornos');escribe('#mf-direccion','Frío con un acento cálido');escribe('#mf-entrega','2027-01-15','change');await asienta();
    let N=nube.get('proyectos/'+id);ok('la ficha se guarda en el servidor',N&&N.nombre==='Templo hundido'&&N.ficha.objetivo==='Pieza de portafolio de entornos'&&N.entrega==='2027-01-15',N&&N.nombre);
    ok('sin entregables no se inventa un porcentaje',/Sin entregables todavía/.test(q('.mesa-prog').textContent)&&/—/.test(q('.mesa-prog b').textContent));
    /* seis etapas */
    ok('seis etapas',document.querySelectorAll('#main .mesa-et').length===6);clic('[data-act="mesa-etapa"][data-k="exploracion"]');await w(100);ok('cada etapa tiene sus categorías',[...q('#mn-cat').options].some(o=>o.value==='Siluetas'));
    q('.mesa-nuevo button[type=submit]').click();await w(100);ok('validación: sin nombre no se crea y avisa',/Escribe un nombre/.test(q('#mn-err').textContent)&&entregas(S.P[id]).length===0,JSON.stringify({err:q('#mn-err')&&q('#mn-err').textContent,n:entregas(S.P[id]).length,etapa:mesaSt().etapa}));
    q('#mn-cat').value='Siluetas';q('#mn-tit').value='Siluetas del guardián';q('.mesa-nuevo button[type=submit]').click();await w(150);const e=entregas(S.P[id])[0];ok('crear entregable',e&&e.titulo==='Siluetas del guardián'&&e.etapa==='exploracion');
    escribe(`textarea[data-ent="nota"]`,'La silueta 3 lee mejor a 2 cm');escribe(`input[data-ent="fecha"]`,'2026-12-20','change');await w(100);
    escribe(`select[data-ent="estado"][data-id="${e.id}"]`,'des','change');await w(100);ok('cambiar estado deja historial',entregas(S.P[id])[0].estado==='des'&&entregas(S.P[id])[0].hist.some(h=>/Por comenzar → En desarrollo/.test(h.t)));
    /* imagen */
    {const c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d');g.fillStyle='#357';g.fillRect(0,0,640,480);const bl=await new Promise(r=>c.toBlob(r,'image/png')),dt=new DataTransfer();dt.items.add(new File([bl],'boceto-v1.png',{type:'image/png'}));const inp=q(`input[data-ent-img="${e.id}"]`);inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));await w(1500)}
    ok('subir imagen a un entregable como versión 1',entregas(S.P[id])[0].imgs.length===1&&!!q('.ent-imgs img')&&/v1/.test(q('.ent-imgs figcaption').textContent));
    /* portada */
    {const c=document.createElement('canvas');c.width=640;c.height=360;c.getContext('2d').fillRect(0,0,640,360);const bl=await new Promise(r=>c.toBlob(r,'image/png')),dt=new DataTransfer();dt.items.add(new File([bl],'portada.png',{type:'image/png'}));const inp=q('#mesa-portada-f');inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));await w(1500)}
    {const im=q('.mesa-portada img');ok('subir portada y se ve',im&&im.getAttribute('src')&&im.complete&&im.naturalWidth>0,im&&(im.getAttribute('src')||im.dataset.asset||'').slice(0,40))}
    /* relacionar con un personaje */
    S.P[id].personajes=[{id:'pj1',nombre:'Guardián'}];renderMain();await w(100);escribe(`select[data-ent-rel="${e.id}"]`,'pj:pj1','change');await w(100);ok('relacionar el entregable con un personaje',entregas(S.P[id])[0].rel.includes('pj:pj1')&&/Guardián/.test(q('.ent-cuerpo .chips').textContent));
    await asienta();N=nube.get('proyectos/'+id);ok('el entregable completo llega al servidor',N.entregables.length===1&&N.entregables[0].imgs.length===1&&N.entregables[0].nota.includes('silueta 3'));
    /* progreso real */
    clic('[data-act="mesa-etapa"][data-k="diseno"]');await w(80);q('#mn-tit').value='Diseño final del guardián';q('.mesa-nuevo button[type=submit]').click();await w(100);clic('[data-act="mesa-etapa"][data-k="exploracion"]');await w(80);escribe(`select[data-ent="estado"][data-id="${e.id}"]`,'ok','change');await w(100);ok('el progreso sale de los entregables',/1 de 2/.test(q('.mesa-prog').textContent)&&/50%/.test(q('.mesa-prog b').textContent),q('.mesa-prog').textContent.trim());
    /* eliminar con confirmación y deshacer */
    clic(`[data-act="mesa-abre"][data-id="${e.id}"]`);await w(80);clic('[data-act="mesa-pide-borrar"]');await w(80);ok('eliminar pide confirmación',entregas(S.P[id]).length===2&&!!q('[data-act="mesa-borra-si"]'));clic('[data-act="mesa-borra-si"]');await w(300);ok('eliminar tras confirmar',entregas(S.P[id]).length===1);const tz=document.querySelector('.toast.tz button');ok('ofrece deshacer',!!tz);tz&&tz.click();await w(300);ok('deshacer lo recupera completo',entregas(S.P[id]).length===2&&entregas(S.P[id]).some(x=>x.imgs.length===1));await asienta();
    /* recargar: lo que está en el servidor basta para reconstruir */
    S.P[id]=normaliza(copia(nube.get('proyectos/'+id)));S._baseAct[id]=S.P[id].actualizado;renderMain();await w(150);ok('al recargar desde el servidor no se pierde nada',entregas(S.P[id]).length===2&&S.P[id].ficha.descripcion==='Un templo tragado por el agua');
    /* sin conexión */
    caida=true;S.tab='seisfases';renderMain();await w(100);escribe('#mf-descripcion','Cambio hecho sin internet');await asienta();ok('sin internet avisa que quedó guardado en el aparato',/Sin conexión/.test(document.getElementById('status').textContent),document.getElementById('status').textContent);
    let pend=await PEND.da('proyectos/'+id);ok('el cambio sin internet queda en el aparato',pend&&pend.data.ficha.descripcion==='Cambio hecho sin internet');
    /* "cerrar y volver a abrir" sin haber subido */
    S.P[id]=normaliza(copia(nube.get('proyectos/'+id)));S._baseAct[id]=S.P[id].actualizado;S.dirty=false;caida=false;await recuperarPendientes();await w(200);ok('al volver se recupera y se sube',S.P[id].ficha.descripcion==='Cambio hecho sin internet'&&nube.get('proyectos/'+id).ficha.descripcion==='Cambio hecho sin internet');ok('y la copia local se limpia',!(await PEND.da('proyectos/'+id)));
    /* conflicto: otro aparato cambió el mismo proyecto */
    caida=true;S.cur=id;S.vista='proyecto';S.tab='seisfases';render();await w(100);escribe('#mf-objetivo','Cambio en este aparato');await asienta();caida=false;const otro=copia(nube.get('proyectos/'+id));otro.ficha.objetivo='Cambio desde el iPad';otro.actualizado=Date.now()+5000;nube.set('proyectos/'+id,otro);S.P[id]=normaliza(copia(otro));S.dirty=false;const antes=Object.keys(S.P).length;await recuperarPendientes();await w(200);const dup=Object.entries(S.P).find(([k,p])=>/cambios sin subir/.test(p.nombre));
    ok('en conflicto se conservan las dos versiones',Object.keys(S.P).length===antes+1&&S.P[id].ficha.objetivo==='Cambio desde el iPad'&&dup&&dup[1].ficha.objetivo==='Cambio en este aparato');if(dup){delete S.P[dup[0]];nube.delete('proyectos/'+dup[0])}
    /* ajustes en dos aparatos */
    ok('mezcla de ajustes a tres bandas',JSON.stringify(mezcla3({a:1,b:1,c:1},{a:3,b:1},{a:1,b:2,c:1}))===JSON.stringify({a:3,b:2}));
    clearTimeout(ajT);nube.set('ajustes/principios',{x:1,y:1});S._ajBase={x:1,y:1};const guard=S.ajustes;S.ajustes={x:9,y:1};nube.set('ajustes/principios',{x:1,y:7});await guardarAjustes();ok('dos aparatos: no gana el último, se combinan',nube.get('ajustes/principios').x===9&&nube.get('ajustes/principios').y===7,JSON.stringify(nube.get('ajustes/principios')));S.ajustes=guard;S._ajBase=null;S.ajDirty=false;
    /* guardar ANTES de que carguen los ajustes no puede vaciar nada (fallo real del 11-nov-2026) */
    {const aj=S.ajustes,nb={principios:[{id:'p1'}],referentes:[{id:'r1'}],galeria:[{id:'g1'}],gusto:'mi gusto',vacVistas:['a','b'],cv:{email:'x@ejemplo.test',skills:[{k:'a',v:'editado'}]}};nube.set('ajustes/principios',copia(nb));clearTimeout(ajT);delete S._ajBase;S.ajustes=copia(AJUSTES_BASE);S.ajustes.vacVistas=[];S.ajustes.uso={n:1};S.ajustes.cv={email:'',skills:[{k:'a',v:'de fábrica'}]};S.ajustes.principios.push({id:'p2'});await guardarAjustes();const N2=nube.get('ajustes/principios');
    ok('guardado antes de cargar no vacía los ajustes',N2.galeria.length===1&&N2.referentes.length===1&&N2.gusto==='mi gusto'&&N2.vacVistas.length===2&&N2.cv.email==='x@ejemplo.test'&&N2.cv.skills[0].v==='editado',JSON.stringify(N2).slice(0,160));ok('y conserva lo nuevo de este aparato',N2.principios.map(x=>x.id).join()==='p1,p2'&&N2.uso.n===1);ok('la pantalla queda con los datos completos',S.ajustes.galeria.length===1&&S.ajustes.cv.email==='x@ejemplo.test');S.ajustes=aj;delete S._ajBase;S.ajDirty=false}
    /* Estudio */
    const e2=entregas(S.P[id]).find(x=>x.estado!=='ok');entCambia(e2,'estado','rev');entCambia(e2,'fecha','2026-12-30');S.vista='inicio';render();await w(250);const es=q('.es').textContent;
    ok('Estudio: proyecto activo con progreso real',/Templo hundido/.test(es)&&/1 de 2 entregables/.test(es));ok('Estudio: entregable próximo, pendiente y actividad',/2026-12-30/.test(es)&&/En revisión/.test(es)&&/Diseño final del guardián/.test(es));
    localStorage.setItem('taller.ultimo',JSON.stringify({id,tab:'seisfases',ts:Date.now()}));render();await w(150);clic('[data-act="est-continuar"]');await w(200);ok('Continuar lleva a donde lo dejaste',S.vista==='proyecto'&&S.cur===id&&S.tab==='seisfases');
    S.vista='inicio';render();await w(150);clic('.es-l button');await w(200);ok('abrir un entregable desde el Estudio lo muestra desplegado',S.tab==='seisfases'&&!!q('.ent-cuerpo'));
    /* navegación: los cinco espacios */
    renderSide();const gr=[...document.querySelectorAll('#side .nav-g')].map(x=>x.textContent);ok('el menú tiene los cinco espacios',['Estudio','Laboratorio','Archivo visual','Academia','Carrera'].every(x=>gr.includes(x)),gr.join(' · '));
    /* Portafolio en PDF: los botones, con clic */
    const C0=S.ajustes.pdfPort;S.ajustes.pdfPort=undefined;const pz=c=>{const k=document.createElement('canvas');k.width=800;k.height=450;const g=k.getContext('2d');g.fillStyle=c;g.fillRect(0,0,800,450);return k.toDataURL('image/jpeg',.7)},apr=t=>({estado:'aprobada',titulo:t,anio:'2026',disciplina:'Environment',seccion:'projects',desc:'',revisada:true,mejor:true,ts:1});
    S.P[id].piezas=[{id:'z1',etapa:'Color',src:pz('#456'),pf:apr('Uno')},{id:'z2',etapa:'Color',src:pz('#654'),pf:apr('Dos')}];S.vista='pdfport';render();await w(700);
    clic('[data-act="pdfp-perfil"][data-v="cine"]');await w(200);ok('PDF: elegir industria con clic',pdfCfg().perfil==='cine');clic('[data-act="pdfp-tema"][data-v="claro"]');await w(200);ok('PDF: cambiar estilo con clic',pdfCfg().tema==='claro');clic('[data-act="pdfp-cal"][data-v="ligera"]');await w(200);ok('PDF: peso con clic',pdfCfg().cal==='ligera');
    const orden0=pdfCfg().sel.join();clic('[data-act="pdfp-baja"]:not([disabled])');await w(200);ok('PDF: reordenar con clic',pdfCfg().sel.join()!==orden0);clic('[data-act="pdfp-toggle"]');await w(200);ok('PDF: quitar una pieza con clic',pdfCfg().sel.length===1);
    let bajado=null;const og=window.guardarArchivo;window.guardarArchivo=async(n,b)=>{bajado={n,b}};try{clic('[data-act="pdfp-pdf"]');for(let i=0;i<40&&!bajado;i++)await w(250)}finally{window.guardarArchivo=og}ok('PDF: «Descargar PDF» entrega un archivo',bajado&&/\.pdf$/.test(bajado.n)&&bajado.b.size>3000,bajado&&bajado.n);S.ajustes.pdfPort=C0;
  }catch(err){ok('excepción',false,err.message+' '+(err.stack||'').split('\n')[1])}
  finally{clearTimeout(saveT);clearTimeout(ajT);S.db=dbAntes;for(const k of Object.keys(S.P))if(!pAntes.includes(k))delete S.P[k];for(const k of Object.keys(S.ajustes))delete S.ajustes[k];Object.assign(S.ajustes,ajAntes);S.dirty=false;S.ajDirty=false;S._ajBase=null;try{for(const k of await PEND.claves())await PEND.quita(k)}catch{}pendClaves.clear();document.querySelectorAll('.toast').forEach(x=>x.remove());S.vista='inicio';render()}
  return {todo:out.every(x=>x.ok),fallos:out.filter(x=>!x.ok),total:out.length}})()
