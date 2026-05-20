import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Supabase REST API helpers with AUTH (JWT token) ───
// These use the user's JWT token so RLS policies work correctly

const REST_API = `${supabaseUrl}/rest/v1`;

/** Get headers with the CURRENT USER's JWT token */
async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token || supabaseAnonKey;
  return {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

/** Generic GET from Supabase REST API */
export async function apiGet(table: string, options?: { eq?: Record<string, any>; order?: string; ascending?: boolean }) {
  const headers = await getAuthHeaders();
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

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Generic POST to Supabase REST API */
export async function apiPost(table: string, data: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${REST_API}/${table}`, {
    method: 'POST',
    headers,
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
  const headers = await getAuthHeaders();
  const url = new URL(`${REST_API}/${table}`);
  url.searchParams.set(`${column}`, `eq.${value}`);

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers,
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
  const headers = await getAuthHeaders();
  const url = new URL(`${REST_API}/${table}`);
  url.searchParams.set(`${column}`, `eq.${value}`);

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return true;
}
