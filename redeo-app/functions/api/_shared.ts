// Shared helpers for the AI verification endpoints (Cloudflare Pages Functions).

export interface Env {
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string; // vision model for documents
  GROQ_TEXT_MODEL?: string; // text model for the admin summary
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const DEFAULT_SUPABASE_URL = 'https://fxedvtmzqjgzvplclhza.supabase.co';
export const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZWR2dG16cWpnenZwbGNsaHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Njg2NTEsImV4cCI6MjEwNzI0NDY1MX0.3cYNT_c-iXEuVfiSVY2v915SB22Tv0lA0sD_0Y293rs';

export const DOC_TYPES = [
  'cin_front', 'cin_back', 'selfie', 'driver_license', 'gray_card', 'insurance', 'car_photo_front', 'car_photo_back',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DRIVER_REQUIRED: DocType[] = [...DOC_TYPES];
export const PASSENGER_REQUIRED: DocType[] = ['cin_front', 'cin_back', 'selfie'];

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const cfg = (env: Env) => ({
  url: (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, ''),
  anon: env.SUPABASE_ANON_KEY || DEFAULT_ANON_KEY,
  service: env.SUPABASE_SERVICE_ROLE_KEY || '',
  groq: env.GROQ_API_KEY || '',
  model: env.GROQ_MODEL || 'qwen/qwen3.8-27b',
  textModel: env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b',
});

/** Validate the caller's Supabase JWT and return their user id. */
export async function authUser(request: Request, env: Env): Promise<{ id: string; jwt: string } | null> {
  const auth = request.headers.get('Authorization') || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!jwt) return null;
  const c = cfg(env);
  const res = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.anon, Authorization: `Bearer ${jwt}` } });
  if (!res.ok) return null;
  const u: any = await res.json().catch(() => null);
  return u?.id ? { id: u.id as string, jwt } : null;
}

/** Service-role REST call (server only, bypasses RLS). */
export async function sbService(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const c = cfg(env);
  return fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.service,
      Authorization: `Bearer ${c.service}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

/** Pull the first JSON object out of a model reply (handles <think> blocks and code fences). */
export function extractJson(text: string): any {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('llm_no_json');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Call Groq (OpenAI-compatible) and get a JSON object back that follows `schema`. */
export async function callLLM<T>(
  env: Env,
  opts: { model: string; system: string; content: any[]; schemaName: string; schema: any; maxTokens?: number },
): Promise<T> {
  const c = cfg(env);
  const post = async (responseFormat: any, extraSystem = '') => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 40000);
    try {
      return await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${c.groq}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: opts.model,
          temperature: 0.1,
          max_completion_tokens: opts.maxTokens ?? 1800,
          response_format: responseFormat,
          messages: [
            { role: 'system', content: opts.system + extraSystem },
            { role: 'user', content: opts.content },
          ],
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };

  // 1) schema-guided output; 2) plain JSON mode with the schema spelled out in the prompt
  let res = await post({ type: 'json_schema', json_schema: { name: opts.schemaName, strict: false, schema: opts.schema } });
  if (res.status === 400) {
    res = await post(
      { type: 'json_object' },
      `\n\nReply with ONE JSON object only, matching exactly this JSON schema:\n${JSON.stringify(opts.schema)}`,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`groq_${res.status}: ${body.slice(0, 200)}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new Error('groq_no_content');
  return extractJson(text) as T;
}

export const clip = (v: unknown, n = 300): string => (typeof v === 'string' ? v.slice(0, n) : '');
