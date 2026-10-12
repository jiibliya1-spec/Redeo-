import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

/** A real (uploaded) profile photo — the auto-generated placeholder avatar does not count. */
export function hasRealPhoto(avatar?: string | null): boolean {
  return !!avatar && avatar.trim() !== '' && !/dicebear\.com/i.test(avatar);
}

export interface PassengerChecks { photo: boolean; phone: boolean; name: boolean; complete: boolean }

export function passengerChecks(u?: { avatar?: string | null; phone?: string | null; name?: string | null } | null): PassengerChecks {
  const photo = hasRealPhoto(u?.avatar);
  const phone = !!u?.phone && u.phone.trim().length >= 6;
  const name = !!u?.name && u.name.trim().length >= 2;
  return { photo, phone, name, complete: photo && phone && name };
}

/** Re-read verification fields (set by DB triggers) into the local store. */
export async function syncVerification(): Promise<void> {
  const cur = useStore.getState().user;
  if (!cur?.id) return;
  try {
    const { data } = await supabase.from('profiles').select('role, is_verified, verification_status').eq('id', cur.id).single();
    if (data) {
      useStore.getState().setUser({
        ...cur,
        role: data.role === 'admin' ? 'admin' : (data.role as any),
        is_verified: data.is_verified === true,
        verification_status: (data.verification_status as any) || 'unverified',
      });
    }
  } catch { /* ignore */ }
}
