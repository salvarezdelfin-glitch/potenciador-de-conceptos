/* Auditoría de toda la app: recorre cada pantalla y cada pestaña de un proyecto y reporta errores, botones sin manejador,
   botones sin nombre, campos sin etiqueta y desbordes horizontales. Uso: window.__aud={desde,hasta}; luego eval de este archivo. */
(async()=>{
  const rango=window.__aud||{desde:0,hasta:999};
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  if(!window.__fuente){const t=await fetch('/index.html?'+Date.now()).then(r=>r.text());window.__fuente=t}
  const src=window.__fuente;
  const prefijos=[...src.matchAll(/(?:\ba|\bact|\baccion_?)\.startsWith\('([a-z0-9-]+)'\)/g)].map(m=>m[1]);
  /* un botón está atendido si el código compara su acción (case, ===, !==), la incluye en una lista o la enruta por prefijo */
  const manejado=v=>["case '"+v+"'","==='"+v+"'","!=='"+v+"'","'"+v+"'].includes("].some(x=>src.includes(x))||prefijos.some(p=>v.startsWith(p));
  if(!window.__audP){const p=nuevoProyecto('Auditoría');window.__audPid='aud-'+Date.now();S.P[window.__audPid]=p;window.__audP=p}
  const lista=[];for(const h of HUBS)for(const [v,n] of h[3])if(v[0]!=='@')lista.push({k:'vista:'+v,ir:()=>{S.vista=v}});
  for(const [t] of TABS)lista.push({k:'proyecto:'+t,ir:()=>{S.vista='proyecto';S.cur=window.__audPid;S.tab=t}});
  for(const [t] of HERR_TABS)lista.push({k:'herramientas:'+t,ir:()=>{herrAbre(t)}});
  const out={total:lista.length,revisadas:0,errores:[],huerfanos:{},sinNombre:{},sinEtiqueta:{},desborde:[],vacias:[]};
  const err=[];const oe=console.error;console.error=(...a)=>{err.push(a.map(x=>x&&x.message||String(x)).join(' ').slice(0,200));};
  const onE=e=>err.push(String(e.message||e.reason&&e.reason.message||e.reason).slice(0,200));window.addEventListener('error',onE);window.addEventListener('unhandledrejection',onE);
  for(const it of lista.slice(rango.desde,rango.hasta)){err.length=0;try{it.ir();render()}catch(e){err.push('render: '+e.message)}await w(220);out.revisadas++;
    const m=document.querySelector('#main');
    for(const el of m.querySelectorAll('[data-act]')){const v=el.dataset.act;if(!manejado(v))(out.huerfanos[v]=out.huerfanos[v]||it.k)}
    const sn=[...m.querySelectorAll('button')].filter(b=>!(b.textContent.trim()||b.getAttribute('aria-label')||b.title)).length;if(sn)out.sinNombre[it.k]=sn;
    const se=[...m.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea')].filter(x=>!(x.getAttribute('aria-label')||x.closest('label')||(x.id&&m.querySelector('label[for="'+CSS.escape(x.id)+'"]'))||x.title||x.placeholder)).length;if(se)out.sinEtiqueta[it.k]=se;
    const ex=m.scrollWidth-m.clientWidth;if(ex>4)out.desborde.push(it.k+' +'+ex+'px');
    if(m.innerText.trim().length<40)out.vacias.push(it.k);
    if(err.length)out.errores.push(it.k+': '+[...new Set(err)].join(' | ').slice(0,260))}
  console.error=oe;window.removeEventListener('error',onE);window.removeEventListener('unhandledrejection',onE);
  return out})()
