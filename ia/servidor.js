// Lógica del backend del Director de Arte con las dependencias inyectadas, para poder probarla sin red ni llave.
// deps: { permitido(), docs:{get(col,id),listar(col,pid),crear(col,id,data)->bool,poner(col,id,data),borrar(col,id)},
//         bajar(ruta)->{bytes:Uint8Array}|null, llave()->{valor,origen}|null, config()->{...}, llamar(peticionAPI, llave)->message, ahora(), uuid(), sha256(Uint8Array|string)->hex, base64(Uint8Array)->string }
import { IA_VERSION, ESPECIALIDADES, MODOS, INTENSIDADES, esquemaDe, validarResultado, contextoProyecto, instrucciones, peticion, costoEstimado, PRECIOS } from './nucleo.js';

export const LIMITES = { imagenes: 3, referencias: 4, bytesImagen: 5 * 1024 * 1024, bytesTotal: 20 * 1024 * 1024, lado: 8000, porHora: 12, porDia: 40 };
export const MODELO_DEFECTO = 'claude-opus-5-5';
const CON_FALLBACK = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-2']);

export class Fallo extends Error { constructor(codigo, mensaje, estado = 400, extra = {}) { super(mensaje); this.codigo = codigo; this.estado = estado; this.extra = extra; } }

/* tipo y tamaño reales leídos de los bytes (no del nombre ni de lo que diga el cliente) */
export function inspeccionarImagen(b) {
  const be = (i, n) => { let v = 0; for (let k = 0; k < n; k++) v = v * 256 + b[i + k]; return v; };
  const txt = (i, n) => String.fromCharCode(...b.subarray(i, i + n));
  if (b.length > 24 && b[0] === 0x89 && txt(1, 3) === 'PNG') return { tipo: 'image/png', ancho: be(16, 4), alto: be(20, 4) };
  if (b.length > 10 && txt(0, 4) === 'GIF8') return { tipo: 'image/gif', ancho: b[6] + b[7] * 256, alto: b[8] + b[9] * 256 };
  if (b.length > 30 && txt(0, 4) === 'RIFF' && txt(8, 4) === 'WEBP') {
    const k = txt(12, 4), le = (i, n) => { let v = 0; for (let j = n - 1; j >= 0; j--) v = v * 256 + b[i + j]; return v; };
    if (k === 'VP8X') return { tipo: 'image/webp', ancho: le(24, 3) + 1, alto: le(27, 3) + 1 };
    if (k === 'VP8 ') return { tipo: 'image/webp', ancho: le(26, 2) & 0x3fff, alto: le(28, 2) & 0x3fff };
    if (k === 'VP8L') { const v = le(21, 4); return { tipo: 'image/webp', ancho: (v & 0x3fff) + 1, alto: ((v >>> 14) & 0x3fff) + 1 }; }
    return null;
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) return null; const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { tipo: 'image/jpeg', alto: be(i + 5, 2), ancho: be(i + 7, 2) };
      i += 2 + be(i + 2, 2);
    }
  }
  return null;
}

/* qué imágenes pertenecen a un proyecto: solo esas se pueden analizar */
export function imagenesDelProyecto(p, galeria = [], pid = '') {
  const m = new Map(), add = (r, de) => { if (r && typeof r.asset === 'string' && r.asset) { if (!m.has(r.asset)) m.set(r.asset, de); if (r.mini && !m.has(r.mini)) m.set(r.mini, de); } };
  (p.piezas || []).forEach((x) => add(x, 'pieza'));
  (p.entregables || []).forEach((e) => (e.imgs || []).forEach((x) => add(x, 'entregable')));
  add(p.portada, 'portada');
  (p.refs || []).forEach((x) => add(x, 'referencia'));
  galeria.filter((g) => g.pid === pid).forEach((x) => add(x, 'galeria'));
  return m;
}

const configurar = async (deps) => {
  const c = (await deps.config()) || {};
  const modelo = c.modelo || MODELO_DEFECTO;
  return { modelo: PRECIOS[modelo] ? modelo : MODELO_DEFECTO, esfuerzo: ['low', 'medium', 'high', 'xhigh', 'max'].includes(c.esfuerzo) ? c.esfuerzo : 'medium', porHora: +c.porHora > 0 ? +c.porHora : LIMITES.porHora, porDia: +c.porDia > 0 ? +c.porDia : LIMITES.porDia };
};

async function consumo(deps) {
  const todo = await deps.docs.listar('ia_consumo'), t = deps.ahora();
  const dentro = (ms) => todo.filter((x) => t - x.data.ts < ms);
  const mes = new Date(t).toISOString().slice(0, 7), delMes = todo.filter((x) => new Date(x.data.ts).toISOString().slice(0, 7) === mes);
  return { hora: dentro(36e5).length, dia: dentro(864e5).length, mesPeticiones: delMes.length, mesUSD: Math.round(delMes.reduce((a, x) => a + (x.data.usd || 0), 0) * 100) / 100 };
}

export async function estado(deps) {
  if (!(await deps.permitido())) throw new Fallo('sin_acceso', 'Esta cuenta no tiene acceso.', 403);
  const k = await deps.llave(), c = await configurar(deps);
  return { conectado: !!k, origenLlave: k ? k.origen : null, modelo: c.modelo, esfuerzo: c.esfuerzo, limites: { porHora: c.porHora, porDia: c.porDia, imagenes: LIMITES.imagenes, referencias: LIMITES.referencias }, consumo: await consumo(deps), version: IA_VERSION };
}

export async function analizar(deps, cuerpo) {
  if (!(await deps.permitido())) throw new Fallo('sin_acceso', 'Esta cuenta no tiene acceso.', 403);
  const c = cuerpo || {}, tarea = ['critica', 'comparar', 'desatorar'].includes(c.tarea) ? c.tarea : null;
  if (!tarea) throw new Fallo('peticion_invalida', 'Tarea desconocida.');
  const pid = String(c.proyectoId || '');
  if (!/^[\w~-]{1,80}$/.test(pid)) throw new Fallo('peticion_invalida', 'Falta el proyecto.');
  const proyecto = await deps.docs.get('proyectos', pid); // con la sesión del usuario: RLS decide si puede verlo
  if (!proyecto) throw new Fallo('sin_proyecto', 'Ese proyecto no existe o no tienes acceso. Si es nuevo, espera a que diga «Guardado».', 404);
  if (tarea !== 'desatorar') {
    if (!ESPECIALIDADES[c.especialidad]) throw new Fallo('peticion_invalida', 'Elige el tipo de diseño.');
    if (!MODOS[c.modo]) throw new Fallo('peticion_invalida', 'Elige el modo de análisis.');
    if (!INTENSIDADES[c.intensidad]) throw new Fallo('peticion_invalida', 'Elige la intensidad.');
  }
  const imgs = Array.isArray(c.imagenes) ? c.imagenes : [], refs = Array.isArray(c.referencias) ? c.referencias : [];
  if (tarea === 'critica' && imgs.length !== 1) throw new Fallo('peticion_invalida', 'La crítica necesita exactamente una imagen.');
  if (tarea === 'comparar' && (imgs.length < 2 || imgs.length > LIMITES.imagenes)) throw new Fallo('peticion_invalida', 'La comparación necesita 2 o 3 versiones.');
  if (tarea === 'desatorar' && !String(c.problema || '').trim()) throw new Fallo('peticion_invalida', 'Describe el problema creativo.');
  if (imgs.length > LIMITES.imagenes || refs.length > LIMITES.referencias) throw new Fallo('peticion_invalida', 'Demasiadas imágenes.');
  const todas = [...imgs.map((x) => ({ ...x, esRef: false })), ...refs.map((x) => ({ ...x, esRef: true }))];
  if (new Set(imgs.map((x) => x.asset)).size !== imgs.length) throw new Fallo('peticion_invalida', 'Repetiste la misma imagen.');

  const ajustes = (await deps.docs.get('ajustes', 'principios')) || {};
  const propias = imagenesDelProyecto(proyecto, ajustes.galeria || [], pid);
  const manifiesto = [], bloques = []; let total = 0;
  for (const x of todas) {
    if (typeof x.asset !== 'string' || !propias.has(x.asset)) throw new Fallo('imagen_ajena', 'Una de las imágenes no pertenece a este proyecto. Si la acabas de subir, espera a que diga «Guardado».', 403);
    const d = await deps.bajar(x.asset);
    if (!d || !d.bytes?.length) throw new Fallo('imagen_no_disponible', 'No pude leer una imagen desde tu almacenamiento privado.', 404);
    const info = inspeccionarImagen(d.bytes);
    if (!info) throw new Fallo('formato', 'Solo se aceptan PNG, JPG, WebP o GIF.');
    if (d.bytes.length > LIMITES.bytesImagen) throw new Fallo('muy_pesada', 'Una imagen pesa más de 5 MB. Súbela de nuevo para que la app la optimice.');
    if (Math.max(info.ancho, info.alto) > LIMITES.lado || Math.min(info.ancho, info.alto) < 16) throw new Fallo('dimensiones', 'Dimensiones no válidas (' + info.ancho + '×' + info.alto + ').');
    total += d.bytes.length;
    if (total > LIMITES.bytesTotal) throw new Fallo('muy_pesada', 'Entre todas las imágenes pesan demasiado.');
    const sha = await deps.sha256(d.bytes);
    manifiesto.push({ asset: x.asset, rol: x.esRef ? 'referencia' : 'trabajo', rotulo: String(x.rotulo || '').slice(0, 80), nota: String(x.nota || '').slice(0, 160), tipo: info.tipo, ancho: info.ancho, alto: info.alto, bytes: d.bytes.length, sha256: sha });
    bloques.push({ esRef: x.esRef, rotulo: String(x.rotulo || ''), bloque: { type: 'image', source: { type: 'base64', media_type: info.tipo, data: deps.base64(d.bytes) } } });
  }

  const previos = (await deps.docs.listar('ia_analisis', pid)).map((x) => x.data).sort((a, b) => b.ts - a.ts);
  // las críticas anteriores van como contexto, pero no entran en la huella: repetir la misma petición no debe cobrar otra vez
  const contextoBase = contextoProyecto(proyecto), contexto = contextoProyecto(proyecto, previos.filter((a) => a.tarea !== 'desatorar'));
  const noModificar = [proyecto.director?.noModificar, c.noModificar].filter((v) => String(v || '').trim()).join(' | ');
  const cfg = await configurar(deps);
  const partes = { tarea, objetivo: c.objetivo, etapa: c.etapa, noModificar, problema: c.problema, conservar: c.conservar, rotulos: manifiesto.filter((m) => m.rol === 'trabajo').map((m) => m.rotulo || 'trabajo'), referencias: manifiesto.filter((m) => m.rol === 'referencia').map((m) => m.nota) };
  const sistema = instrucciones({ tarea, especialidad: c.especialidad, modo: c.modo, intensidad: c.intensidad });
  const huella = await deps.sha256(JSON.stringify([IA_VERSION, cfg.modelo, cfg.esfuerzo, sistema, peticion({ ...partes, contexto: contextoBase }), manifiesto.map((m) => [m.rol, m.sha256]), pid]));
  if (!c.forzar) { const igual = previos.find((a) => a.huella === huella); if (igual) return { reutilizado: true, analisis: igual }; }

  const llave = await deps.llave();
  if (!llave) throw new Fallo('sin_llave', 'Falta configurar la llave de la API de Claude.', 409);
  const uso = await consumo(deps);
  if (uso.hora >= cfg.porHora) throw new Fallo('limite', 'Llegaste al límite de ' + cfg.porHora + ' análisis por hora.', 429);
  if (uso.dia >= cfg.porDia) throw new Fallo('limite', 'Llegaste al límite de ' + cfg.porDia + ' análisis por día.', 429);

  const candado = 'c_' + huella.slice(0, 40), ya = await deps.docs.get('ia_candado', candado);
  if (ya && deps.ahora() - ya.ts > 5 * 60e3) await deps.docs.borrar('ia_candado', candado);
  if (!(await deps.docs.crear('ia_candado', candado, { ts: deps.ahora() }))) throw new Fallo('en_curso', 'Ese mismo análisis ya se está haciendo. Espera un momento.', 409);

  const consumoId = deps.uuid();
  try {
    const contenido = [];
    bloques.forEach((b, i) => { contenido.push({ type: 'text', text: b.esRef ? 'REFERENCIA (no es el trabajo evaluado):' : 'TRABAJO' + (b.rotulo ? ' — ' + b.rotulo : '') + ':' }); contenido.push(b.bloque); });
    contenido.push({ type: 'text', text: peticion({ ...partes, contexto }) });
    const pet = { model: cfg.modelo, max_tokens: 24000, system: sistema, messages: [{ role: 'user', content: contenido }], output_config: { effort: cfg.esfuerzo, format: { type: 'json_schema', schema: esquemaDe(tarea) } } };
    if (CON_FALLBACK.has(cfg.modelo)) { pet.betas = ['server-side-fallback-2026-07-01']; pet.fallbacks = 'default'; }
    // se anota antes de llamar: un intento cuenta para el límite aunque falle
    await deps.docs.poner('ia_consumo', consumoId, { ts: deps.ahora(), pid, tarea, modelo: cfg.modelo, ok: false });
    const msg = await deps.llamar(pet, llave.valor);
    const modeloReal = msg.model || cfg.modelo, usd = costoEstimado(modeloReal, msg.usage);
    const registrar = (extra) => deps.docs.poner('ia_consumo', consumoId, { ts: deps.ahora(), pid, tarea, modelo: modeloReal, entrada: msg.usage?.input_tokens || 0, salida: msg.usage?.output_tokens || 0, usd, ...extra });
    if (msg.stop_reason === 'refusal') { await registrar({ ok: false, error: 'rechazo' }); throw new Fallo('rechazo', 'Claude no aceptó analizar esta petición.', 422); }
    if (msg.stop_reason === 'max_tokens') { await registrar({ ok: false, error: 'cortada' }); throw new Fallo('cortada', 'La respuesta se cortó antes de terminar. Vuelve a intentar.', 502); }
    const texto = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let resultado; try { resultado = JSON.parse(texto); } catch { await registrar({ ok: false, error: 'json' }); throw new Fallo('respuesta_invalida', 'La respuesta no llegó en el formato esperado.', 502); }
    const mal = validarResultado(tarea, resultado);
    if (mal) { await registrar({ ok: false, error: 'esquema' }); throw new Fallo('respuesta_invalida', 'La respuesta llegó incompleta: ' + mal + '.', 502); }
    await registrar({ ok: true });
    const analisis = { id: deps.uuid(), pid, proyecto: proyecto.nombre || '', ts: deps.ahora(), tarea, origen: 'api', modelo: modeloReal, esfuerzo: cfg.esfuerzo, version: IA_VERSION,
      especialidad: c.especialidad || '', modo: c.modo || '', intensidad: c.intensidad || '', objetivo: String(c.objetivo || '').slice(0, 600), etapa: String(c.etapa || '').slice(0, 120), noModificar, problema: String(c.problema || '').slice(0, 1500), conservar: String(c.conservar || '').slice(0, 600),
      imagenes: manifiesto, contexto, huella, uso: { entrada: msg.usage?.input_tokens || 0, salida: msg.usage?.output_tokens || 0, usd }, resultado, marcas: {} };
    await deps.docs.poner('ia_analisis', analisis.id, analisis);
    return { reutilizado: false, analisis };
  } catch (e) {
    if (e instanceof Fallo) throw e;
    const s = e?.status;
    if (s === 401) throw new Fallo('llave_invalida', 'La llave de la API no es válida.', 502);
    if (s === 429) throw new Fallo('limite_api', 'La API de Claude pide esperar (límite de solicitudes).', 429);
    if (s === 529) throw new Fallo('saturada', 'La API de Claude está saturada. Intenta en unos minutos.', 503);
    if (s === 400) throw new Fallo('rechazada_por_api', 'La API rechazó la petición: ' + String(e.message || '').slice(0, 300), 502);
    throw new Fallo('error_api', 'No se pudo completar el análisis' + (s ? ' (código ' + s + ')' : '') + '.', 502);
  } finally {
    await deps.docs.borrar('ia_candado', candado);
  }
}
