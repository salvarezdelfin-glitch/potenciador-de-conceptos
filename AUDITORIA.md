# Taller: auditoría y decisiones (fase 1)

Fecha: 2026-11-26.

## Diagnóstico

| Área | Estado encontrado | Decisión |
|---|---|---|
| Stack | PWA de un solo archivo (JavaScript sin framework) + Supabase. Librerías por CDN: JSZip, supabase-js, ag-psd, three, MediaPipe, pdf.js, heic2any. | Se conserva. Reescribir arriesgaba datos y funciones que ya sirven. |
| Código fuente | La fuente vivía fuera del repositorio. | `build.js` guarda copia en `src/app.html`. |
| Botones muertos | Ningún botón de «Portafolio en PDF» respondía al clic, incluido «Descargar PDF». Las pruebas anteriores llamaban a las funciones directo y no lo detectaron. | Corregido. Las pruebas ahora usan clics reales. |
| Datos | Sin copia local de lo que no se había subido. | Cola local en IndexedDB, reintento automático. |
| Sesión sin red | Si fallaba la verificación de acceso, se cerraba la sesión. | Pantalla de reintento; la sesión se conserva. |
| Ajustes en varios aparatos | Ganaba el último que guardaba. | Mezcla a tres bandas. |
| Seguridad | RLS en las tablas `pc_*`, lista de acceso, bucket privado, historial de versiones por documento. La llave de Claude se guarda del lado del servidor; el frontend solo lleva la llave publicable. Las funciones sin verificación de JWT validan dentro. | Sin cambios. |
| Accesibilidad | Unos 30 campos sin etiqueta. | La auditoría ya no reporta ninguno. No se probó con lector de pantalla ni se midió contraste. |
| Rendimiento | `index.html` pesa unos 3 MB. | No se atendió en esta fase. No se midió en celular real. |

## Decisiones

- **Etapas** es una pestaña nueva y la primera del proyecto. Las pestañas anteriores siguen; cada etapa enlaza a sus herramientas.
- El progreso del proyecto sale solo de entregables terminados entre entregables creados. Sin entregables no hay porcentaje. En la pestaña Etapas se oculta el contador anterior de pasos para no mostrar dos avances.
- Conflicto entre aparatos: si el mismo proyecto cambió en los dos, se conservan ambas versiones (la local como copia con nombre propio).
- Los cinco espacios (Estudio, Laboratorio, Archivo visual, Academia, Carrera) reagrupan pantallas que ya existían. **No** significa que los módulos pedidos para cada espacio estén construidos.
- `build.js` se detiene si hay dos funciones con el mismo nombre. En esta fase dos funciones nuevas pisaban (o eran pisadas por) funciones existentes sin dar error.

## Pruebas

Todas corren en el navegador local. `proyectos` usa un **servidor simulado** que se puede «desconectar»; no prueba la cuenta real de Supabase ni dos aparatos físicos. La pantalla sin conexión se probó aparte, ejecutando las funciones de `src/shim.js` con un cliente simulado.

## Falta

- Probar guardado, sin conexión y dos aparatos con la cuenta real.
- Quitar emojis usados como íconos.
- Fase 2: archivo visual y moodboards según la especificación, módulos del Laboratorio, comparación de versiones WIP, entregables ampliados.
- Fase 3: director de arte con análisis de 10 partes y desatorador. Existe la función `pc-claude`; requiere una llave de API configurada en «Conexión con Claude». Sin llave queda el puente de copiar y pegar.
- Fase 4: Academia, crecimiento, CV y vacantes según la especificación.
- Fase 5: estabilización y rendimiento.
- Los correos de `pc-avisos` aún usan el nombre anterior.

## Estudio y menú (26 de noviembre de 2026)

**Incidente de datos.** El 11 de noviembre los ajustes (principios, referentes, ilustraciones y otras secciones) fueron reemplazados por una copia casi vacía. Causa reproducida: un guardado antes de que cargaran los ajustes del servidor subía los valores de fábrica y reemplazaba todo. Corregido: en ese caso manda el servidor y lo local solo agrega. No se probó qué acción concreta lo disparó aquel día. La última versión completa se copió a un documento de respaldo aparte; restaurarla es decisión del dueño.

**Guardado, otros fallos corregidos:** los proyectos que no estaban abiertos se guardaban sin revisar conflictos ni dejar copia local; cambiar de proyecto antes de guardar podía dejar el primero sin subir; el reintento podía descartar una copia sin subirla.

**Pantalla principal:** encabezado compacto, accesos a herramientas, tarjetas de proyecto, WIP reciente, pendientes (fechas, entregables, notas de feedback, tareas) y actividad. Todo sale de datos existentes. No cambia el esquema: usa `piezas`, `entregables`, `rondas[].notas[].estado` y `ajustes.tareas`. La imagen de tarjeta es la portada o, si no hay, el boceto o entregable más reciente, con rótulo.

**Menú:** proyectos arriba, nombres completos, lo de sistema plegado; las mismas secciones de antes.

**Build:** se detiene si hay funciones duplicadas o si un script no compila.
