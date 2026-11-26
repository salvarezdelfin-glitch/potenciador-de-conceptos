// Pruebas del backend del Director de Arte con Node:  node --test tests/director.test.mjs
// La base de datos y la API son simuladas. Prueban permisos, propiedad, formatos, límites, duplicados, guardado
// y que los bytes de la imagen llegan íntegros a la petición. NO prueban la calidad de las críticas de Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { analizar, estado, inspeccionarImagen, imagenesDelProyecto, Fallo, LIMITES } from '../ia/servidor.js';
import { ESPECIALIDADES, MODOS, ESQUEMA_CRITICA, ESQUEMA_COMPARACION, ESQUEMA_DESATORAR, instrucciones, contextoProyecto, validarResultado, aMarkdown, costoEstimado } from '../ia/nucleo.js';

/* PNG real, generado byte a byte */
function png(ancho, alto, tono) {
  const crc = (b) => { let c, r = 0xffffffff; for (const x of b) { c = (r ^ x) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = c ^ (r >>> 8); } return (r ^ 0xffffffff) >>> 0; };
  const trozo = (t, d) => { const n = Buffer.alloc(4); n.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([n, td, c]); };
  const h = Buffer.alloc(13); h.writeUInt32BE(ancho, 0); h.writeUInt32BE(alto, 4); h[8] = 8; h[9] = 0;
  const filas = Buffer.alloc((ancho + 1) * alto, tono); for (let y = 0; y < alto; y++) filas[y * (ancho + 1)] = 0;
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', h), trozo('IDAT', deflateSync(filas)), trozo('IEND', Buffer.alloc(0))]));
}

const relleno = (e) => e.type === 'object' ? Object.fromEntries(Object.entries(e.properties).map(([k, v]) => [k, relleno(v)])) : e.type === 'array' ? [] : e.type === 'integer' ? 5 : e.type === 'boolean' ? true : e.enum ? e.enum[0] : 'dato de prueba';
const criticaValida = () => { const r = relleno(ESQUEMA_CRITICA); r.problemas = [{ ...relleno(ESQUEMA_CRITICA.properties.problemas.items), id: 'p1' }]; return r; };

function mundo(extra = {}) {
  const tablas = new Map(), k = (c, i) => c + '/' + i, archivos = new Map([['a1.png', png(64, 48, 40)], ['a2.png', png(64, 48, 200)], ['ref.png', png(32, 32, 90)], ['ajena.png', png(32, 32, 1)], ['texto.png', new Uint8Array(Buffer.from('esto no es una imagen, aunque diga .png en el nombre'))]]);
  tablas.set(k('proyectos', 'proj1'), { nombre: 'Templo', tipo: 'Entorno', estado: 'Boceto', brief: { texto: 'Un templo hundido' }, ad: 'Frío con un acento cálido', piezas: [{ asset: 'a1.png' }, { asset: 'a2.png' }, { asset: 'texto.png' }], refs: [{ asset: 'ref.png', porque: 'la escala de la escalinata' }], director: { noModificar: 'Conservar la máscara y la silueta' }, decisiones: [{ t: 'La luz entra por arriba', estado: 'Decidida' }] });
  const enviado = []; let t = Date.parse('2026-11-26T12:00:00Z');
  const deps = {
    permitido: async () => true,
    docs: {
      get: async (c, i) => structuredClone(tablas.get(k(c, i)) ?? null),
      listar: async (c, pid) => [...tablas].filter(([key, v]) => key.startsWith(c + '/') && (!pid || v.pid === pid)).map(([key, v]) => ({ id: key.slice(c.length + 1), data: structuredClone(v) })),
      crear: async (c, i, d) => { if (tablas.has(k(c, i))) return false; tablas.set(k(c, i), structuredClone(d)); return true; },
      poner: async (c, i, d) => { tablas.set(k(c, i), structuredClone(d)); },
      borrar: async (c, i) => { tablas.delete(k(c, i)); },
    },
    bajar: async (r) => archivos.has(r) ? { bytes: archivos.get(r) } : null,
    llave: async () => ({ valor: 'llave-de-prueba', origen: 'prueba' }),
    config: async () => ({}),
    llamar: async (pet, llave) => { enviado.push({ pet, llave }); return { model: pet.model, stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 500 }, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(pet.output_config.format.schema.properties.direcciones ? { ...relleno(ESQUEMA_DESATORAR), direcciones: [1, 2, 3].map(() => relleno(ESQUEMA_DESATORAR.properties.direcciones.items)) } : pet.output_config.format.schema.properties.persistentes ? relleno(ESQUEMA_COMPARACION) : criticaValida()) }] }; },
    ahora: () => t++, uuid: () => randomUUID(), sha256: async (v) => createHash('sha256').update(v).digest('hex'), base64: (b) => Buffer.from(b).toString('base64'),
    ...extra,
  };
  return { deps, tablas, enviado, archivos, k };
}
const base = { tarea: 'critica', proyectoId: 'proj1', especialidad: 'entorno', modo: 'diseno', intensidad: 'estudio', objetivo: 'Revisar la escala', imagenes: [{ asset: 'a1.png', rotulo: 'versión 1' }] };
const rechaza = (promesa, codigo) => assert.rejects(promesa, (e) => e instanceof Fallo && e.codigo === codigo, 'se esperaba el error ' + codigo);

test('la imagen original llega íntegra a la API, con el contexto y las restricciones', async () => {
  const m = mundo(), r = await analizar(m.deps, { ...base, referencias: [{ asset: 'ref.png', nota: 'escalinata' }], noModificar: 'No cambiar el horizonte' });
  const { pet } = m.enviado[0], bloques = pet.messages[0].content, imgs = bloques.filter((b) => b.type === 'image');
  assert.equal(imgs.length, 2);
  assert.deepEqual(new Uint8Array(Buffer.from(imgs[0].source.data, 'base64')), m.archivos.get('a1.png'), 'los bytes enviados son los del archivo');
  assert.equal(imgs[0].source.media_type, 'image/png');
  const texto = bloques.at(-1).text;
  for (const dato of ['Un templo hundido', 'Frío con un acento cálido', 'La luz entra por arriba', 'Revisar la escala', 'Conservar la máscara y la silueta', 'No cambiar el horizonte']) assert.ok(texto.includes(dato), 'falta en el contexto: ' + dato);
  assert.equal(bloques[0].text.startsWith('TRABAJO'), true);
  assert.ok(bloques.some((b) => b.type === 'text' && b.text.startsWith('REFERENCIA')));
  assert.equal(pet.model, 'claude-opus-5-5');
  assert.equal(pet.output_config.format.type, 'json_schema');
  assert.equal(pet.fallbacks, 'default');
  assert.ok(!('thinking' in pet) && !('temperature' in pet));
  assert.deepEqual([r.analisis.imagenes[0].ancho, r.analisis.imagenes[0].alto], [64, 48]);
  assert.equal(r.analisis.imagenes[0].sha256, createHash('sha256').update(m.archivos.get('a1.png')).digest('hex'));
});

test('guarda el análisis, el consumo y el costo estimado, y se puede recuperar', async () => {
  const m = mundo(), r = await analizar(m.deps, base);
  assert.equal((await m.deps.docs.listar('ia_analisis', 'proj1'))[0].data.id, r.analisis.id);
  assert.equal(r.analisis.uso.usd, costoEstimado('claude-opus-5-5', { input_tokens: 1000, output_tokens: 500 }));
  const e = await estado(m.deps);
  assert.equal(e.conectado, true); assert.equal(e.consumo.mesPeticiones, 1); assert.ok(e.consumo.mesUSD > 0);
  assert.equal([...m.tablas.keys()].filter((x) => x.startsWith('ia_candado/')).length, 0, 'el candado se libera');
});

test('la misma petición no se cobra dos veces; con "forzar" sí vuelve a llamar', async () => {
  const m = mundo(), a = await analizar(m.deps, base), b = await analizar(m.deps, base);
  assert.equal(b.reutilizado, true); assert.equal(b.analisis.id, a.analisis.id); assert.equal(m.enviado.length, 1);
  await analizar(m.deps, { ...base, forzar: true }); assert.equal(m.enviado.length, 2);
  await analizar(m.deps, { ...base, intensidad: 'exigente' }); assert.equal(m.enviado.length, 3);
  assert.ok(m.enviado[2].pet.messages[0].content.at(-1).text.includes('Críticas anteriores'), 'la crítica anterior va como contexto');
});

test('dos peticiones iguales al mismo tiempo: solo una llama a la API', async () => {
  const m = mundo(); const original = m.deps.llamar; m.deps.llamar = async (...x) => { await new Promise((r) => setTimeout(r, 30)); return original(...x); };
  const r = await Promise.allSettled([analizar(m.deps, base), analizar(m.deps, base)]);
  assert.equal(m.enviado.length, 1); assert.equal(r.filter((x) => x.status === 'rejected' && x.reason.codigo === 'en_curso').length, 1);
});

test('permisos: cuenta no autorizada, proyecto ajeno e imagen ajena', async () => {
  const no = mundo({ permitido: async () => false }); await rechaza(analizar(no.deps, base), 'sin_acceso'); await rechaza(estado(no.deps), 'sin_acceso');
  const m = mundo();
  await rechaza(analizar(m.deps, { ...base, proyectoId: 'otro' }), 'sin_proyecto');
  await rechaza(analizar(m.deps, { ...base, imagenes: [{ asset: 'ajena.png' }] }), 'imagen_ajena');
  await rechaza(analizar(m.deps, { ...base, imagenes: [{ asset: '../secreto' }] }), 'imagen_ajena');
  await rechaza(analizar(m.deps, { ...base, referencias: [{ asset: 'ajena.png' }] }), 'imagen_ajena');
  await rechaza(analizar(m.deps, { ...base, proyectoId: "x' or 1=1" }), 'peticion_invalida');
  assert.equal(m.enviado.length, 0, 'nada llegó a la API');
});

test('valida formato real, peso, dimensiones y la petición', async () => {
  const m = mundo();
  await rechaza(analizar(m.deps, { ...base, imagenes: [{ asset: 'texto.png' }] }), 'formato');
  const gorda = new Uint8Array(LIMITES.bytesImagen + 10); gorda.set(png(40, 40, 3)); m.archivos.set('a1.png', gorda); await rechaza(analizar(m.deps, base), 'muy_pesada');
  m.archivos.set('a1.png', png(8, 8, 3)); await rechaza(analizar(m.deps, base), 'dimensiones');
  m.archivos.delete('a1.png'); await rechaza(analizar(m.deps, base), 'imagen_no_disponible');
  for (const mala of [{ especialidad: 'nada' }, { modo: 'x' }, { intensidad: '' }, { imagenes: [] }, { tarea: 'borrar' }]) await rechaza(analizar(m.deps, { ...base, ...mala }), 'peticion_invalida');
  await rechaza(analizar(m.deps, { ...base, tarea: 'comparar' }), 'peticion_invalida');
  assert.equal(m.enviado.length, 0);
});

test('sin llave no se inventa nada', async () => {
  const m = mundo({ llave: async () => null });
  await rechaza(analizar(m.deps, base), 'sin_llave');
  assert.equal((await estado(m.deps)).conectado, false);
  assert.equal((await m.deps.docs.listar('ia_analisis', 'proj1')).length, 0);
});

test('límite por hora', async () => {
  const m = mundo({ config: async () => ({ porHora: 2 }) });
  await analizar(m.deps, base); await analizar(m.deps, { ...base, forzar: true });
  await rechaza(analizar(m.deps, { ...base, forzar: true }), 'limite'); assert.equal(m.enviado.length, 2);
});

test('errores de la API, rechazo, respuesta cortada o incompleta: no se guarda análisis y se libera el candado', async () => {
  const casos = [
    [async () => { throw Object.assign(new Error('x'), { status: 401 }); }, 'llave_invalida'],
    [async () => { throw Object.assign(new Error('x'), { status: 429 }); }, 'limite_api'],
    [async () => { throw Object.assign(new Error('x'), { status: 529 }); }, 'saturada'],
    [async () => { throw new Error('red'); }, 'error_api'],
    [async () => ({ model: 'claude-opus-5-5', stop_reason: 'refusal', usage: {}, content: [] }), 'rechazo'],
    [async () => ({ model: 'claude-opus-5-5', stop_reason: 'max_tokens', usage: {}, content: [{ type: 'text', text: '{' }] }), 'cortada'],
    [async () => ({ model: 'claude-opus-5-5', stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Qué bonito dibujo' }] }), 'respuesta_invalida'],
    [async () => ({ model: 'claude-opus-5-5', stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: JSON.stringify({ ...criticaValida(), veredicto: undefined }) }] }), 'respuesta_invalida'],
  ];
  for (const [llamar, codigo] of casos) {
    const m = mundo({ llamar }); await rechaza(analizar(m.deps, base), codigo);
    assert.equal((await m.deps.docs.listar('ia_analisis', 'proj1')).length, 0, codigo);
    assert.equal([...m.tablas.keys()].filter((x) => x.startsWith('ia_candado/')).length, 0, codigo);
  }
});

test('comparación: manda las versiones en orden y rotuladas', async () => {
  const m = mundo(), r = await analizar(m.deps, { ...base, tarea: 'comparar', imagenes: [{ asset: 'a1.png', rotulo: 'inicial' }, { asset: 'a2.png', rotulo: 'corregida' }] });
  const c = m.enviado[0].pet.messages[0].content;
  assert.deepEqual(c.filter((b) => b.type === 'image').map((b) => Buffer.from(b.source.data, 'base64').length), [m.archivos.get('a1.png').length, m.archivos.get('a2.png').length]);
  assert.ok(c.at(-1).text.includes('imagen 1 = inicial; imagen 2 = corregida'));
  assert.deepEqual(r.analisis.imagenes.map((x) => x.asset), ['a1.png', 'a2.png']);
  await rechaza(analizar(m.deps, { ...base, tarea: 'comparar', imagenes: [{ asset: 'a1.png' }, { asset: 'a1.png' }] }), 'peticion_invalida');
});

test('desatorarme: exige problema y exactamente tres direcciones', async () => {
  const m = mundo(); await rechaza(analizar(m.deps, { tarea: 'desatorar', proyectoId: 'proj1' }), 'peticion_invalida');
  const r = await analizar(m.deps, { tarea: 'desatorar', proyectoId: 'proj1', problema: 'El guardián se ve genérico' });
  assert.equal(r.analisis.resultado.direcciones.length, 3);
  assert.equal(m.enviado[0].pet.messages[0].content.filter((b) => b.type === 'image').length, 0);
  assert.match(validarResultado('desatorar', { ...r.analisis.resultado, direcciones: r.analisis.resultado.direcciones.slice(0, 2) }), /exactamente 3/);
});

test('nueve rúbricas y cinco modos realmente distintos', () => {
  assert.equal(Object.keys(ESPECIALIDADES).length, 9); assert.equal(Object.keys(MODOS).length, 5);
  assert.equal(new Set(Object.values(ESPECIALIDADES).map((e) => JSON.stringify(e.criterios))).size, 9);
  const todas = Object.values(ESPECIALIDADES).flatMap((e) => e.criterios.map((c) => c[1])); assert.equal(new Set(todas).size, todas.length, 'ningún criterio repetido');
  const prompts = Object.keys(ESPECIALIDADES).flatMap((e) => Object.keys(MODOS).map((mo) => instrucciones({ especialidad: e, modo: mo, intensidad: 'estudio' })));
  assert.equal(new Set(prompts).size, 45);
});

test('los esquemas cumplen las reglas de salida estructurada', () => {
  const revisa = (e) => { if (e.type === 'object') { assert.equal(e.additionalProperties, false); assert.deepEqual(e.required, Object.keys(e.properties)); Object.values(e.properties).forEach(revisa); } if (e.type === 'array') revisa(e.items); for (const k of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems']) assert.ok(!(k in e)); };
  [ESQUEMA_CRITICA, ESQUEMA_COMPARACION, ESQUEMA_DESATORAR].forEach(revisa);
});

test('lee tipo y tamaño de los bytes', () => {
  assert.deepEqual(inspeccionarImagen(png(120, 90, 5)), { tipo: 'image/png', ancho: 120, alto: 90 });
  assert.equal(inspeccionarImagen(new Uint8Array([1, 2, 3, 4, 5])), null);
  assert.equal(imagenesDelProyecto({ piezas: [{ asset: 'a', mini: 'b' }, { src: 'http://x' }] }).size, 2);
});

test('el contexto no incluye referencias como si se hubieran visto, y exporta a texto', async () => {
  const m = mundo(), r = await analizar(m.deps, base);
  assert.match(contextoProyecto(m.tablas.get(m.k('proyectos', 'proj1'))), /SOLO TEXTO/);
  const md = aMarkdown(r.analisis);
  for (const parte of ['## Resumen', '## Problemas', '## Orden de prioridades', '## Veredicto', 'No se pudo confirmar']) assert.ok(md.includes(parte), parte);
});
