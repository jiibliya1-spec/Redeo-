// Shared helpers for the AI verification endpoints (Cloudflare Pages Functions).

export interface Env {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
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
  anthropic: env.ANTHROPIC_API_KEY || '',
  model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
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

/** Call Claude and force a structured result through a single tool. */
export async function callClaude<T>(
  env: Env,
  opts: { system: string; content: any[]; toolName: string; toolDescription: string; schema: any; maxTokens?: number },
): Promise<T> {
  const c = cfg(env);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'x-api-key': c.anthropic, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: c.model,
        max_tokens: opts.maxTokens ?? 1800,
        system: opts.system,
        tools: [{ name: opts.toolName, description: opts.toolDescription, input_schema: opts.schema }],
        tool_choice: { type: 'tool', name: opts.toolName },
        messages: [{ role: 'user', content: opts.content }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`anthropic_${res.status}: ${body.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const block = (data.content || []).find((b: any) => b.type === 'tool_use');
    if (!block?.input) throw new Error('anthropic_no_tool_output');
    return block.input as T;
  } finally {
    clearTimeout(timer);
  }
}

export const clip = (v: unknown, n = 300): string => (typeof v === 'string' ? v.slice(0, n) : '');
