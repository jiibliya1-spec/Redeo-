import { supabase } from '@/lib/supabase';

/** Returns whether the driver is blocked from publishing because of the wallet rule. */
export async function walletBlocksPublishing(userId: string): Promise<{ blocked: boolean; min: number; balance: number }> {
  try {
    const [{ data: st }, { data: w }] = await Promise.all([
      supabase.from('platform_settings').select('value').eq('key', 'commission').maybeSingle(),
      supabase.from('driver_wallets').select('balance').eq('driver_id', userId).maybeSingle(),
    ]);
    const v: any = st?.value || {};
    const min = Number(v.min_balance || 0);
    const balance = Number(w?.balance ?? 0);
    return { blocked: !!v.enabled && balance < min, min, balance };
  } catch {
    return { blocked: false, min: 0, balance: 0 };
  }
}
