import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Supabase REST API helper (works even if tables don't exist in schema cache) ───

const REST_API = `${supabaseUrl}/rest/v1`;
const HEADERS = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

/** Generic GET from Supabase REST API */
export async function apiGet(table: string, options?: { eq?: Record<string, any>; order?: string; ascending?: boolean }) {
  const url = new URL(`${REST_API}/${table}`);
  url.searchParams.set('select', '*');

  if (options?.eq) {
    Object.entries(options.eq).forEach(([key, val]) => {
      url.searchParams.append(`${key}`, `eq.${val}`);
    });
  }

  if (options?.order) {
    url.searchParams.set('order', `${options.order}.${options.ascending !== false ? 'asc' : 'desc'}`);
  }

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Generic POST to Supabase REST API */
export async function apiPost(table: string, data: any) {
  const res = await fetch(`${REST_API}/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Generic PATCH to Supabase REST API */
export async function apiPatch(table: string, column: string, value: any, data: any) {
  const url = new URL(`${REST_API}/${table}`);
  url.searchParams.set(`${column}`, `eq.${value}`);

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Generic DELETE from Supabase REST API */
export async function apiDelete(table: string, column: string, value: any) {
  const url = new URL(`${REST_API}/${table}`);
  url.searchParams.set(`${column}`, `eq.${value}`);

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: HEADERS,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return true;
}
