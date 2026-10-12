import { supabase } from '@/lib/supabase';

export interface AdminSettingsValue { maintenance: boolean; auto_approve: boolean; alert_verification: boolean; alert_registration: boolean }
export const DEFAULT_ADMIN_SETTINGS: AdminSettingsValue = { maintenance: false, auto_approve: false, alert_verification: true, alert_registration: true };

export async function loadAdminSettings(): Promise<AdminSettingsValue> {
  try {
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'admin_settings').maybeSingle();
    return { ...DEFAULT_ADMIN_SETTINGS, ...((data?.value as any) || {}) };
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}
