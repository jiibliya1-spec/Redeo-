import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

const KEY = 'redeo_active_share';
const PUSH_EVERY_MS = 8000;

export interface ShareSession { token: string; tripId: string; from: string; to: string; startedAt: number }

function loadSession(): ShareSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as ShareSession | null;
    if (s && Date.now() - s.startedAt < 24 * 3600 * 1000) return s;
  } catch { /* ignore */ }
  return null;
}
function saveSession(s: ShareSession | null) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
}

interface ShareState {
  session: ShareSession | null;
  lastSentAt: number | null;
  accuracy: number | null;
  error: 'denied' | 'unavailable' | null;
  set: (p: Partial<ShareState>) => void;
}
export const useShare = create<ShareState>((set) => ({
  session: loadSession(), lastSentAt: null, accuracy: null, error: null,
  set: (p) => set(p),
}));

export const shareUrl = (token: string) => `${window.location.origin}/track/${token}`;

export async function startShare(tripId: string, from: string, to: string): Promise<ShareSession> {
  const { data, error } = await supabase.rpc('start_trip_share', { p_trip_id: tripId });
  if (error || !data) throw new Error(error?.message || 'start_failed');
  const session: ShareSession = { token: data as string, tripId, from, to, startedAt: Date.now() };
  saveSession(session);
  useShare.getState().set({ session, lastSentAt: null, accuracy: null, error: null });
  return session;
}

export async function stopShare() {
  const s = useShare.getState().session;
  saveSession(null);
  useShare.getState().set({ session: null, lastSentAt: null, accuracy: null, error: null });
  if (s) { try { await supabase.rpc('stop_trip_share', { p_token: s.token }); } catch { /* best effort */ } }
}

export async function pushPosition(p: GeolocationPosition): Promise<boolean> {
  const s = useShare.getState().session;
  if (!s) return false;
  const c = p.coords;
  const { data, error } = await supabase.rpc('push_share_position', {
    p_token: s.token, p_lat: c.latitude, p_lng: c.longitude,
    p_heading: c.heading ?? null, p_speed: c.speed ?? null, p_accuracy: c.accuracy ?? null,
  });
  if (error) return true; // network hiccup: keep trying
  if (data === false) { await stopShare(); return false; } // ended or expired on the server
  useShare.getState().set({ lastSentAt: Date.now(), accuracy: c.accuracy ?? null, error: null });
  return true;
}

export { PUSH_EVERY_MS };

export interface PublicShare {
  status: 'waiting' | 'live' | 'ended' | 'expired' | 'not_found';
  name?: string; from?: string; to?: string; date?: string; time?: string;
  lat?: number; lng?: number; heading?: number | null; speed?: number | null; accuracy?: number | null;
  last_at?: string; started_at?: string; trail?: [number, number][]; now?: string;
}
export async function fetchShare(token: string): Promise<PublicShare | null> {
  const { data, error } = await supabase.rpc('get_trip_share', { p_token: token });
  if (error || !data) return null;
  return data as PublicShare;
}
