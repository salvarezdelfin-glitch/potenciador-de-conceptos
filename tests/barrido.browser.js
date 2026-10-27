/* Barrido: abre cada pestaña de Herramientas y verifica que no haya errores de JS. Pegar en consola con la app abierta. */
(async()=>{const errs=[];addEventListener('error',e=>errs.push(e.message));addEventListener('unhandledrejection',e=>errs.push(String(e.reason)));
const out=[];for(const t of ['forma','color','perspectiva','luz','referencias','herramientas']){try{herrAbre(t);await new Promise(r=>setTimeout(r,300));out.push({tab:t,ok:true})}catch(e){out.push({tab:t,ok:false,e:e.message})}}
await new Promise(r=>setTimeout(r,300));return {out,errs}})()
