import { useEffect, useState } from 'react';
import { Bell, Database, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { DEFAULT_ADMIN_SETTINGS, loadAdminSettings, type AdminSettingsValue } from '@/lib/adminSettings';

function Toggle({ on, busy, onChange, danger }: { on: boolean; busy: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-60 ${on ? (danger ? 'bg-red-500' : 'bg-[#FF6B00]') : 'bg-white/15'}`}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-t border-white/5">
      <div className="min-w-0">
        <p className="text-sm text-white break-words">{label}</p>
        {hint && <p className="text-xs text-[#A0A0A0] mt-0.5 break-words">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Card({ icon, tone, title, sub, children }: { icon: React.ReactNode; tone: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-[#A0A0A0]">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function AdminSettings() {
  const { t } = useI18n();
  const [s, setS] = useState<AdminSettingsValue>(DEFAULT_ADMIN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadAdminSettings().then((v) => { setS(v); setLoading(false); }); }, []);

  const set = async (patch: Partial<AdminSettingsValue>) => {
    const next = { ...s, ...patch };
    setBusy(true);
    const { error } = await supabase.from('platform_settings').upsert({ key: 'admin_settings', value: next, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast.error(t('adm.set_save_failed')); return; }
    setS(next);
    toast.success(t('adm.set_saved'));
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-6">{t('adm.admin_settings_659c')}</h2>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <Card icon={<Bell className="w-5 h-5 text-blue-400" />} tone="bg-blue-500/10" title={t('adm.notifications_a274')} sub={t('adm.admin_notification_preferences_997b')}>
              <Row label={t('adm.new_verification_alerts_e045')}>
                <Toggle on={s.alert_verification} busy={busy} onChange={(v) => set({ alert_verification: v })} />
              </Row>
              <Row label={t('adm.new_user_registration_alerts_cef9')}>
                <Toggle on={s.alert_registration} busy={busy} onChange={(v) => set({ alert_registration: v })} />
              </Row>
            </Card>

            <Card icon={<Database className="w-5 h-5 text-purple-400" />} tone="bg-purple-500/10" title={t('adm.system_a45d')} sub={t('adm.platform_configuration_152e')}>
              <Row label={t('adm.maintenance_mode_38a2')} hint={t('adm.set_maintenance_hint')}>
                <Toggle on={s.maintenance} busy={busy} onChange={(v) => set({ maintenance: v })} danger />
              </Row>
              <Row label={t('adm.auto_approve_verifications_6b56')} hint={t('adm.set_auto_hint')}>
                <Toggle on={s.auto_approve} busy={busy} onChange={(v) => set({ auto_approve: v })} danger />
              </Row>
            </Card>

            <Card icon={<Info className="w-5 h-5 text-green-400" />} tone="bg-green-500/10" title={t('adm.about_8f7f')} sub="Redeo">
              <Row label={t('adm.version_34b6')}><span className="text-sm text-white">1.0.0</span></Row>
              <Row label={t('adm.environment_0ba2')}><span className="text-sm text-white">{t('adm.production_756d')}</span></Row>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
