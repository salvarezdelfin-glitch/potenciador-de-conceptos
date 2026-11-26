# Director de Arte: estado y despliegue

## Hecho
- `ia/nucleo.js`: 9 rúbricas, 5 modos, 3 intensidades, esquemas (crítica, comparación, Desatorarme), contexto del proyecto, validación y exportación a texto.
- `ia/servidor.js` y `supabase/functions/pc-director/index.ts`: backend.
- `node --test tests/director.test.mjs`: 15 pruebas con base de datos y API simuladas.

## Pendiente
1. La interfaz en la app (todavía no existe) y que `build.js` incruste `nucleo.js`.
2. Desplegar `pc-director` (sin desplegar) con tres archivos: `index.ts`, `nucleo.js` y `servidor.js` (copiados de `ia/`), con verificación de JWT activada. No modifica `pc-claude`.
3. Configurar el secreto `ANTHROPIC_API_KEY` en Supabase (Edge Functions > Secrets). Opcionales: `PC_DIRECTOR_MODEL` (por defecto `claude-opus-5-5`), `PC_DIRECTOR_EFFORT`, `PC_DIRECTOR_PER_HOUR`, `PC_DIRECTOR_PER_DAY`.
4. Probar contra la API real. Nunca se ha llamado: la forma de la petición, el tiempo de respuesta y la calidad de las críticas están sin verificar.
