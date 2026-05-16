import { AdminLayout } from '@/components/admin/AdminLayout';
import { Shield, Bell, Database, Info } from 'lucide-react';

export function AdminSettings() {
  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Admin Settings</h2>

        <div className="space-y-4">
          {/* Security */}
          <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Security</h3>
                <p className="text-xs text-[#A0A0A0]">Admin access and permissions</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">Two-factor authentication</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400">Coming soon</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">Admin IP whitelist</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400">Coming soon</span>
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
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                <p className="text-xs text-[#A0A0A0]">Admin notification preferences</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">New verification alerts</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">New user registration alerts</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">Enabled</span>
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
                <h3 className="text-sm font-semibold text-white">System</h3>
                <p className="text-xs text-[#A0A0A0]">Platform configuration</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">Maintenance mode</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">Off</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">Auto-approve verifications</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">Disabled</span>
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
                <h3 className="text-sm font-semibold text-white">About</h3>
                <p className="text-xs text-[#A0A0A0]">WansniAuto Admin Panel</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">Version</span>
                <span className="text-sm text-white">1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-[#A0A0A0]">Environment</span>
                <span className="text-sm text-white">Production</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
