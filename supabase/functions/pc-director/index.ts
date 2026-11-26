// Edge Function pc-director: conecta ia/servidor.js con Supabase y con la API de Claude.
// Al desplegar se suben tres archivos: este (index.ts), nucleo.js y servidor.js (ver ia/DESPLIEGUE.md).
// Secretos (opcionales): ANTHROPIC_API_KEY, PC_DIRECTOR_MODEL, PC_DIRECTOR_EFFORT, PC_DIRECTOR_PER_HOUR, PC_DIRECTOR_PER_DAY.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { analizar, estado, Fallo } from "./servidor.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function dependencias(auth: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  // TODO lo del usuario (documentos e imágenes) pasa por su sesión, así que RLS aplica
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const must = <T>(r: { data: T; error: { message: string; code?: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };
  return {
    permitido: async () => (await user.rpc("pc_allowed")).data === true,
    docs: {
      get: async (col: string, id: string) => (must(await user.from("pc_docs").select("data").match({ col, id }).maybeSingle()) as { data: unknown } | null)?.data ?? null,
      listar: async (col: string, pid?: string) => {
        let q = user.from("pc_docs").select("id,data").eq("col", col);
        if (pid) q = q.eq("data->>pid", pid);
        return must(await q.order("updated_at", { ascending: false }).limit(500)) ?? [];
      },
      crear: async (col: string, id: string, data: unknown) => {
        const r = await user.from("pc_docs").insert({ col, id, data, updated_at: new Date().toISOString() });
        if (r.error?.code === "23505") return false;
        if (r.error) throw new Error(r.error.message);
        return true;
      },
      poner: async (col: string, id: string, data: unknown) => { must(await user.from("pc_docs").upsert({ col, id, data, updated_at: new Date().toISOString() })); },
      borrar: async (col: string, id: string) => { must(await user.from("pc_docs").delete().match({ col, id })); },
    },
    bajar: async (ruta: string) => {
      const r = await user.storage.from("potenciador").download(ruta);
      return r.error || !r.data ? null : { bytes: new Uint8Array(await r.data.arrayBuffer()) };
    },
    llave: async () => {
      const env = Deno.env.get("ANTHROPIC_API_KEY");
      if (env) return { valor: env, origen: "secretos de Supabase" };
      // la llave guardada desde la app («Conexión con Claude»); solo el rol de servicio puede leerla
      const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const { data } = await admin.from("pc_secrets").select("value").eq("name", "anthropic").maybeSingle();
      return data?.value ? { valor: data.value as string, origen: "guardada desde la app" } : null;
    },
    config: async () => ({
      modelo: Deno.env.get("PC_DIRECTOR_MODEL"), esfuerzo: Deno.env.get("PC_DIRECTOR_EFFORT"),
      porHora: Deno.env.get("PC_DIRECTOR_PER_HOUR"), porDia: Deno.env.get("PC_DIRECTOR_PER_DAY"),
    }),
    llamar: async (pet: Record<string, unknown>, apiKey: string) => {
      const client = new Anthropic({ apiKey, maxRetries: 1 });
      // streaming: evita que una respuesta larga corte la conexión
      // deno-lint-ignore no-explicit-any
      return await client.beta.messages.stream(pet as any).finalMessage();
    },
    ahora: () => Date.now(),
    uuid: () => crypto.randomUUID(),
    sha256: async (v: Uint8Array | string) => {
      const b = typeof v === "string" ? new TextEncoder().encode(v) : v;
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource))].map((x) => x.toString(16).padStart(2, "0")).join("");
    },
    base64: (b: Uint8Array) => encodeBase64(b),
  };
}

const comoError = (e: unknown) => {
  if (e instanceof Fallo) return { code: e.codigo, message: e.message, status: e.estado };
  console.error("pc-director", e instanceof Error ? e.message : e);
  return { code: "error_interno", message: "Error interno del servidor.", status: 500 };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ code: "peticion_invalida" }, 405);
  if (+(req.headers.get("content-length") || 0) > 100_000) return json({ code: "peticion_invalida", message: "Petición demasiado grande." }, 413);
  const deps = dependencias(req.headers.get("Authorization") ?? "");
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ code: "peticion_invalida" }, 400); }

  if (body.accion !== "analizar") {
    try { return json(await estado(deps)); } catch (e) { const x = comoError(e); return json(x, x.status); }
  }
  if (!(await deps.permitido())) return json({ code: "sin_acceso", message: "Esta cuenta no tiene acceso." }, 403);
  // Un análisis puede tardar minutos: se manda un espacio cada 10 s (JSON.parse los ignora) y el resultado o el error al final.
  // El análisis se guarda en el servidor aunque la app se cierre antes de recibirlo.
  const trabajo = analizar(deps, body).then((r) => r as unknown, (e) => ({ error: comoError(e) }));
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(trabajo);
  const enc = new TextEncoder();
  let latido: number | undefined;
  const cuerpo = new ReadableStream({
    start(ctl) {
      latido = setInterval(() => { try { ctl.enqueue(enc.encode(" ")); } catch { clearInterval(latido); } }, 10_000);
      trabajo.then((r) => { clearInterval(latido); try { ctl.enqueue(enc.encode(JSON.stringify(r))); ctl.close(); } catch { /* el cliente se fue */ } });
    },
    cancel() { clearInterval(latido); },
  });
  return new Response(cuerpo, { headers: { ...CORS, "Content-Type": "application/json" } });
});
