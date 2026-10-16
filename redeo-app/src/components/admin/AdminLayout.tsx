import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Logo } from '@/components/Logo';
import { resolveAvatar } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { LayoutDashboard, ShieldCheck, Users, Settings, LogOut, Menu, ChevronRight, MessageSquare, Bell, Ticket, Wallet } from 'lucide-react';
import { Car } from '@/components/icons/CarIcon';

const navItems = [
  { path: '/admin', label: 'adm.overview_3b87', icon: LayoutDashboard },
  { path: '/admin/verifications', label: 'adm.verifications_4ba2', icon: ShieldCheck },
  { path: '/admin/users', label: 'adm.users_f9aa', icon: Users },
  { path: '/admin/trips', label: 'adm.trips_4473', icon: Car },
  { path: '/admin/messages', label: 'adm.messages_41de', icon: MessageSquare },
  { path: '/admin/support', label: 'adm.support_tickets_fdca', icon: Ticket },
  { path: '/admin/alerts', label: 'adm.alerts', icon: Bell },
  { path: '/admin/wallet', label: 'adm.wallet', icon: Wallet },
  { path: '/admin/settings', label: 'adm.settings_f4f7', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, unreadCount } = useStore();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-white flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`safe-top fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111318] border-r border-white/5 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <Link to="/admin" className="flex items-center gap-3">
            <Logo className="w-9 h-9" />
            <div>
              <h1 className="text-sm font-bold text-white">Redeo</h1>
              <p className="text-[10px] text-[#FF6B00] uppercase tracking-wider font-semibold">{t('adm.admin_panel_a0e0')}</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${active ? 'text-[#FF6B00]' : ''}`} />
                <span>{t(item.label)}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {/* Admin profile */}
          <div className="flex items-center gap-3 px-3 py-2">
            <img
              src={resolveAvatar(user?.avatar, user?.id)}
              alt=""
              className="w-9 h-9 rounded-full bg-[#1B1F27]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-[#A0A0A0]">{t('adm.administrator_7b7b')}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>{t('adm.logout_0323')}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="safe-top-sticky sticky top-0 z-30 bg-[#0A0C10]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-white/5"
              >
                <Menu className="w-5 h-5 text-[#A0A0A0]" />
              </button>
              <h2 className="text-lg font-bold text-white">
                {t(navItems.find((n) => isActive(n.path))?.label || 'adm.admin_e3af')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="relative p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <Bell className="w-5 h-5 text-[#A0A0A0]" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF6B00] rounded-full" />}
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
