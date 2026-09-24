/* Potenciador de Conceptos — capa para GitHub Pages.
   Da a la app las mismas piezas que tiene como artifact (db, assets, sample, downloads)
   usando Supabase: login, datos privados por RLS, imágenes en bucket privado y Claude vía Edge Function. */
(function(){
  const SUPA_URL='https://smjktuithhvfmexysvkf.supabase.co';
  const SUPA_KEY='sb_publishable_h7YxlJXIADT1827fFx6hyg_jtjmnmGZ';
  const BUCKET='potenciador';
  // Sesión guardada en dos lugares (localStorage + IndexedDB): el iPhone a veces vacía uno de los dos
  // en las apps web de pantalla de inicio; con esto no te vuelve a pedir la contraseña.
  const IDB=(()=>{let dbp;const open=()=>dbp=dbp||new Promise((ok,ko)=>{const r=indexedDB.open('pc-sesion',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)});
    const tx=async(modo,fn)=>{const db=await open();return new Promise((ok,ko)=>{const t=db.transaction('kv',modo),st=t.objectStore('kv'),req=fn(st);t.oncomplete=()=>ok(req?.result);t.onerror=()=>ko(t.error)})};
    return {get:k=>tx('readonly',st=>st.get(k)).catch(()=>null),set:(k,v)=>tx('readwrite',st=>st.put(v,k)).catch(()=>{}),del:k=>tx('readwrite',st=>st.delete(k)).catch(()=>{})}})();
  const almacen={
    async getItem(k){let v=null;try{v=localStorage.getItem(k)}catch{}if(v==null){v=await IDB.get(k);if(v!=null)try{localStorage.setItem(k,v)}catch{}}return v??null},
    async setItem(k,v){try{localStorage.setItem(k,v)}catch{}await IDB.set(k,v)},
    async removeItem(k){try{localStorage.removeItem(k)}catch{}await IDB.del(k)}
  };
  try{navigator.storage?.persist?.()}catch{}
  const sb=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,storage:almacen,storageKey:'pc-auth'}});
  let listo;const ready=new Promise(r=>listo=r);
  let tieneLlave=false;

  /* ---------- estilos de login y modales ---------- */
  const css=document.createElement('style');css.textContent=`
  .pcx{position:fixed;inset:0;z-index:80;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px 16px calc(24px + env(safe-area-inset-bottom,0px))}
  .pcx.modal{background:rgba(8,9,12,.6);align-items:flex-start;overflow:auto;padding-top:calc(24px + env(safe-area-inset-top,0px))}
  .pcx-card{background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);padding:24px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:14px}
  .pcx.modal .pcx-card{max-width:680px}
  .pcx-card h1{font-family:var(--display);font-weight:800;font-size:30px;line-height:1;letter-spacing:-.02em;margin:0}
  .pcx-card h2{font-family:var(--display);font-size:20px;margin:0}
  .pcx-card p{margin:0;color:var(--ink2);font-size:14px}
  .pcx-card input,.pcx-card textarea{width:100%;border:1px solid var(--line);background:var(--bg);border-radius:6px;padding:10px 12px;font-size:16px}
  .pcx-card textarea{min-height:140px;font-family:var(--mono);font-size:13px}
  .pcx-err{color:var(--warn);font-size:13px;min-height:18px}
  .pcx-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .pcx-link{background:none;border:0;color:var(--accent);cursor:pointer;padding:0;font-size:13px}
  .pcx-thumbs{display:flex;gap:8px;flex-wrap:wrap}.pcx-thumbs img{width:90px;height:90px;object-fit:cover;border-radius:4px}`;
  document.head.append(css);
  const el=(h)=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild};
  const escH=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- login ---------- */
  function pantallaLogin(msg){
    document.querySelector('.pcx.login')?.remove();
    let recordado='';try{recordado=localStorage.getItem('pc-email')||''}catch{}
    const v=el(`<div class="pcx login"><form class="pcx-card" id="pcx-login" method="post" action="#" autocomplete="on">
      <h1>Potenciador<br>de Conceptos</h1><p>Tu sistema privado. Entra una vez: la sesión se queda abierta en este aparato.</p>
      <input type="email" id="pcx-email" name="email" autocomplete="username" inputmode="email" autocapitalize="off" placeholder="Correo" value="${escH(recordado)}" required>
      <input type="password" id="pcx-pass" name="password" autocomplete="current-password" placeholder="Contraseña" required>
      <div class="pcx-err" id="pcx-err">${escH(msg||'')}</div>
      <button class="btn pri" type="submit">Entrar</button>
      <button class="pcx-link" type="button" id="pcx-olvide">¿Olvidaste tu contraseña?</button></form></div>`);
    document.body.append(v);
    const err=t=>v.querySelector('#pcx-err').textContent=t;
    v.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();err('Entrando…');
      const email=v.querySelector('#pcx-email').value.trim(),password=v.querySelector('#pcx-pass').value;
      const {error}=await sb.auth.signInWithPassword({email,password});
      if(error){err(error.message.includes('Invalid')?'Correo o contraseña incorrectos.':error.message);return}
      try{localStorage.setItem('pc-email',email)}catch{}
      // Ofrece guardar la contraseña en el llavero del aparato (navegadores que lo soportan)
      try{if(window.PasswordCredential&&navigator.credentials?.store)await navigator.credentials.store(new PasswordCredential({id:email,password,name:'Potenciador de Conceptos'}))}catch{}
      await tras_login();
    });
    v.querySelector('#pcx-olvide').onclick=async()=>{
      const email=v.querySelector('#pcx-email').value.trim();if(!email){err('Escribe tu correo arriba primero.');return}
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
      err(error?error.message:'Te mandamos un correo para cambiar tu contraseña.');
    };
  }
  function pantallaNuevaPass(){
    document.querySelector('.pcx.login')?.remove();
    const v=el(`<div class="pcx login"><form class="pcx-card"><h2>Nueva contraseña</h2>
      <input type="password" id="pcx-np" autocomplete="new-password" placeholder="Nueva contraseña (mín. 8)" minlength="8" required>
      <div class="pcx-err" id="pcx-err"></div><button class="btn pri" type="submit">Guardar</button></form></div>`);
    document.body.append(v);
    v.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();
      const {error}=await sb.auth.updateUser({password:v.querySelector('#pcx-np').value});
      if(error){v.querySelector('#pcx-err').textContent=error.message;return}
      await tras_login();});
  }
  async function tras_login(){
    const {data:ok}=await sb.rpc('pc_allowed');
    if(ok!==true){await sb.auth.signOut();pantallaLogin('Esta cuenta no tiene acceso a este sistema.');return}
    const {data:k}=await sb.rpc('pc_has_secret');tieneLlave=k===true;
    document.querySelector('.pcx.login')?.remove();listo();
  }
  sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY')pantallaNuevaPass()});
  (async()=>{
    if(/type=recovery/.test(location.hash))return;// lo maneja onAuthStateChange
    const {data:{session}}=await sb.auth.getSession();
    if(session)await tras_login();else pantallaLogin();
  })();

  /* ---------- db: documentos JSON en pc_docs ---------- */
  const fallo=(error)=>({code:error?.code==='42501'?'invalid_argument':'unavailable',message:error?.message||''});
  const vigilantes=new Set();
  const refrescar=()=>vigilantes.forEach(f=>f());
  window.addEventListener('focus',refrescar);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refrescar()});
  function docRef(col,id){return{id,path:col+'/'+id,
    async get(){const {data,error}=await sb.from('pc_docs').select('data').match({col,id}).maybeSingle();if(error)throw fallo(error);return{id,exists:!!data,data:()=>data?.data,metadata:{fromCache:false,hasPendingWrites:false}}},
    async set(data){const {error}=await sb.from('pc_docs').upsert({col,id,data,updated_at:new Date().toISOString()});if(error)throw fallo(error)},
    async update(data){const s=await this.get();if(!s.exists)throw{code:'invalid_argument'};await this.set({...s.data(),...data})},
    async delete(){const {error}=await sb.from('pc_docs').delete().match({col,id});if(error)throw fallo(error)},
    onSnapshot(next,err){const f=async()=>{try{next(await this.get())}catch(e){}};vigilantes.add(f);f();return()=>vigilantes.delete(f)}
  }}
  const db={
    doc(path){const [c,i]=path.split('/');return docRef(c,i)},
    collection(col,filtro){return{path:col,doc:id=>docRef(col,id||crypto.randomUUID()),
      where(field,op,value){if(op!=='==')throw new TypeError('Solo == está soportado');return db.collection(col,[field,String(value)])},
      async get(){let q=sb.from('pc_docs').select('id,data').eq('col',col);if(filtro)q=q.eq('data->>'+filtro[0],filtro[1]);
        const {data,error}=await q;if(error)throw fallo(error);
        const docs=data.map(r=>({id:r.id,exists:true,data:()=>r.data,metadata:{fromCache:false,hasPendingWrites:false}}));
        return{docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:false,hasPendingWrites:false}}},
      onSnapshot(next,err){let primera=true;const f=async()=>{try{next(await this.get());primera=false}catch(e){if(primera)err?.(e)}};vigilantes.add(f);f();return()=>vigilantes.delete(f)}
    }}
  };

  /* ---------- assets: bucket privado + URLs firmadas ---------- */
  const urls={};
  const assets={
    async upload(blob){
      const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');
      const path=`${crypto.randomUUID()}.${ext}`;
      const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:blob.type,cacheControl:'31536000'});
      if(error)throw{code:/size|large/i.test(error.message)?'too_large':'upstream_error',message:error.message};
      urls[path]=URL.createObjectURL(blob);return{id:path,url:urls[path],sizeBytes:blob.size,contentType:blob.type};
    },
    async delete(id){await sb.storage.from(BUCKET).remove([id]);delete urls[id];return{deleted:true}},
    async list(){return{assets:[],usage:{}}},
    url:id=>urls[id]||'',
    async blob(id){const {data,error}=await sb.storage.from(BUCKET).download(id);if(error)throw error;return data},
    async hydrate(){
      const imgs=[...document.querySelectorAll('img[data-asset]')].filter(i=>!i.getAttribute('src'));
      const faltan=[...new Set(imgs.map(i=>i.dataset.asset))].filter(id=>!urls[id]);
      if(faltan.length){const {data}=await sb.storage.from(BUCKET).createSignedUrls(faltan,60*60*12);(data||[]).forEach(d=>{if(d.signedUrl&&d.path)urls[d.path]=d.signedUrl})}
      document.querySelectorAll('img[data-asset]').forEach(i=>{if(!i.getAttribute('src')&&urls[i.dataset.asset])i.src=urls[i.dataset.asset]});
    }
  };

  /* ---------- downloads ---------- */
  const downloads={async save({filename,data}){
    const b=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(b);
    const a=document.createElement('a');a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),30000);return{status:'saved'};
  }};

  /* ---------- sample: Claude vía Edge Function, o puente copiar/pegar ---------- */
  async function aBase64(blob){
    const im=await createImageBitmap(blob);const k=Math.min(1,1568/Math.max(im.width,im.height));
    const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    const url=c.toDataURL('image/jpeg',.88);return{media_type:'image/jpeg',data:url.split(',')[1]};
  }
  const aMensajes=input=>typeof input==='string'?[{role:'user',content:input}]:input;
  async function directo(input,opts={}){
    const {data:{session}}=await sb.auth.getSession();
    const images=opts.images?await Promise.all([...opts.images].slice(0,5).map(aBase64)):[];
    let r;
    try{r=await fetch(`${SUPA_URL}/functions/v1/pc-claude`,{method:'POST',signal:opts.signal,
      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session?.access_token},
      body:JSON.stringify({messages:aMensajes(input),images,tier:opts.modelTier||'default'})})}
    catch(e){throw{code:e?.name==='AbortError'?'cancelled':'upstream_error',message:String(e)}}
    const out=await r.json().catch(()=>({}));
    if(!r.ok){if(out.code==='no_key'||out.code==='bad_key'){tieneLlave=false;throw {code:'pedir_claude',message:out.code}}
      throw{code:out.code==='rate_limited'?'rate_limited':'upstream_error',message:out.message||''}}
    return{text:out.text,truncated:!!out.truncated};
  }
  function puente(input,opts={},aviso=''){
    const ms=aMensajes(input);
    const prompt=ms.length===1?ms[0].content:ms[0].content+'\n\n--- Conversación hasta ahora ---\n'+ms.slice(2).map(m=>(m.role==='user'?'ARTISTA: ':'TÚ: ')+m.content).join('\n\n')+'\n\n--- Responde ahora como "TÚ" al último mensaje del artista (solo tu respuesta). ---';
    return new Promise((resolve,reject)=>{
      const v=el(`<div class="pcx modal"><div class="pcx-card">
        <h2>Pregúntale a Claude</h2>
        ${aviso?`<p class="pcx-err">${escH(aviso)}</p>`:''}
        <p>1. Copia la pregunta. 2. Pégala en Claude${opts.images?' y <b>adjunta la imagen</b> (descárgala abajo)':''}. 3. Pega aquí su respuesta completa.</p>
        ${opts.images?'<div class="pcx-thumbs" id="pcx-th"></div>':''}
        <div class="pcx-row"><button class="btn pri" id="pcx-copy">Copiar pregunta</button><a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a></div>
        <textarea id="pcx-resp" placeholder="Pega aquí la respuesta de Claude"></textarea>
        <div class="pcx-row"><button class="btn pri" id="pcx-ok">Usar respuesta</button><button class="btn ghost" id="pcx-cancel">Cancelar</button>
        <span style="flex:1"></span><button class="pcx-link" id="pcx-cfg">Conectar Claude directo</button></div></div></div>`);
      document.body.append(v);
      const cerrar=()=>{v.remove();opts.signal?.removeEventListener('abort',abort)};
      const abort=()=>{cerrar();reject({code:'cancelled'})};
      opts.signal?.addEventListener('abort',abort);
      if(opts.images){const th=v.querySelector('#pcx-th');[...opts.images].forEach((b,i)=>{const u=URL.createObjectURL(b);
        th.append(el(`<a href="${u}" download="pieza-${i+1}.${(b.type.split('/')[1]||'jpg').replace('jpeg','jpg')}" title="Descargar para adjuntar"><img src="${u}" alt=""></a>`))})}
      v.querySelector('#pcx-copy').onclick=async e=>{try{await navigator.clipboard.writeText(prompt);e.target.textContent='Copiada ✓'}catch{const t=v.querySelector('#pcx-resp');t.value=prompt;t.select();e.target.textContent='Selecciona y copia'}};
      v.querySelector('#pcx-ok').onclick=()=>{const t=v.querySelector('#pcx-resp').value.trim();if(!t)return;cerrar();resolve({text:t,truncated:false,modelTierApplied:'default'})};
      v.querySelector('#pcx-cancel').onclick=abort;
      v.querySelector('#pcx-cfg').onclick=()=>{abort();ajustes()};
    });
  }
  function parseJSON(t){
    try{return JSON.parse(t)}catch{}
    const f=/```(?:json)?\s*([\s\S]*?)```/.exec(t);if(f){try{return JSON.parse(f[1])}catch{}}
    const a=t.search(/[\[{]/),b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));
    if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch{}}
    throw{code:'invalid_json',text:t};
  }
  async function sample(input,opts={}){
    // Sin conexión directa no mostramos la pregunta técnica: la app le dice qué pedirle a Claude en su chat
    if(!tieneLlave)throw {code:'pedir_claude',message:'Sin conexión directa con Claude'};
    const r=await directo(input,opts);
    opts.onText?.({text:r.text,delta:r.text});return r;
  }
  sample.json=async(input,opts={})=>{
    const extra='\n\nResponde únicamente con el JSON, sin texto antes ni después.';
    const i=typeof input==='string'?input+extra:input;
    return parseJSON((await sample(i,opts)).text);
  };
  sample.limits=async()=>({maxPromptBytes:65536,images:{maxCount:5,maxInputBytes:20971520,mediaTypes:['image/png','image/jpeg','image/webp','image/gif']}});

  function ajustes(){
    const v=el(`<div class="pcx modal"><form class="pcx-card"><h2>Conexión con Claude</h2>
      <p>${tieneLlave?'<b>Conectado.</b> Las preguntas al asesor y las críticas van directo a Claude.':'Sin conectar: el asesor funciona copiando y pegando en claude.ai.'}</p>
      <p>Para conectarlo directo (también desde el iPhone y con imágenes), pega una API key de Anthropic (<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>). Se guarda en tu servidor privado y nunca vuelve al navegador. El uso de la API se cobra aparte de tu plan de Claude.</p>
      <input type="password" id="pcx-key" autocomplete="off" placeholder="${tieneLlave?'Pega una nueva para reemplazarla':'sk-ant-…'}">
      <div class="pcx-err" id="pcx-kerr"></div>
      <div class="pcx-row"><button class="btn pri" type="submit">Guardar</button>${tieneLlave?'<button class="btn danger" type="button" id="pcx-quitar">Desconectar</button>':''}<button class="btn ghost" type="button" id="pcx-x">Cerrar</button></div></form></div>`);
    document.body.append(v);
    const err=t=>v.querySelector('#pcx-kerr').textContent=t;
    v.querySelector('#pcx-x').onclick=()=>v.remove();
    v.querySelector('#pcx-quitar')?.addEventListener('click',async()=>{await sb.rpc('pc_set_secret',{p_value:''});tieneLlave=false;v.remove()});
    v.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const k=v.querySelector('#pcx-key').value.trim();
      if(!/^sk-ant-/.test(k)){err('Esa no parece una API key de Anthropic (empieza con sk-ant-).');return}
      const {error}=await sb.rpc('pc_set_secret',{p_value:k});if(error){err(error.message);return}
      tieneLlave=true;v.remove();});
  }

  async function vacantes(){
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(`${SUPA_URL}/functions/v1/pc-vacantes`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session?.access_token},body:'{}'});
    if(!r.ok)throw new Error('vacantes '+r.status);return r.json();
  }

  async function llamar(fn,cuerpo){
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(`${SUPA_URL}/functions/v1/${fn}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session?.access_token},body:JSON.stringify(cuerpo||{})});
    const out=await r.json().catch(()=>({}));if(!r.ok)throw out;return out;
  }

  window.PC_SHIM={
    vacantes,
    async hasSecret(n){const {data}=await sb.rpc('pc_has_named_secret',{p_name:n});return data===true},
    async setSecret(n,v){const {error}=await sb.rpc('pc_set_named_secret',{p_name:n,p_value:v});if(error)throw error},
    avisarAhora:()=>llamar('pc-avisos'),
    avisarMes:()=>llamar('pc-avisos',{tipo:'mensual'}),
    async use(n){await ready;return {db,assets,sample,downloads}[n]||null},
    async signOut(){await sb.auth.signOut();location.reload()},
    openSettings:ajustes
  };
})();
