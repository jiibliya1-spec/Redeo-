import { AdminLayout } from '@/components/admin/AdminLayout';
import { useI18n } from '@/lib/i18n';
import { Shield, Bell, Database, Info } from 'lucide-react';

export function AdminSettings() {
  const { t } = useI18n();
  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-6">{t('adm.admin_settings_659c')}</h2>

        <div className="space-y-4">
          {/* Security */}
          <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{t('adm.security_2fae')}</h3>
                <p className="text-xs text-[#A0A0A0]">{t('adm.admin_access_and_permissions_d1b0')}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.two_factor_authentication_8b10')}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400">{t('adm.coming_soon_8115')}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.admin_ip_whitelist_c7d5')}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400">{t('adm.coming_soon_8115')}</span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{t('adm.notifications_a274')}</h3>
                <p className="text-xs text-[#A0A0A0]">{t('adm.admin_notification_preferences_997b')}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.new_verification_alerts_e045')}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">{t('adm.enabled_00d2')}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.new_user_registration_alerts_cef9')}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">{t('adm.enabled_00d2')}</span>
              </div>
            </div>
          </div>

          {/* System */}
          <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{t('adm.system_a45d')}</h3>
                <p className="text-xs text-[#A0A0A0]">{t('adm.platform_configuration_152e')}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.maintenance_mode_38a2')}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">{t('adm.off_d153')}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.auto_approve_verifications_6b56')}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">{t('adm.disabled_b9f5')}</span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{t('adm.about_8f7f')}</h3>
                <p className="text-xs text-[#A0A0A0]">{t('adm.wansniauto_admin_panel_ae60')}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.version_34b6')}</span>
                <span className="text-sm text-white">1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">{t('adm.environment_0ba2')}</span>
                <span className="text-sm text-white">{t('adm.production_756d')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
