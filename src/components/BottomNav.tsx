import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { Search, Plus, Car, MessageCircle, User } from 'lucide-react';

export function BottomNav() {
  const { isAuthenticated, user } = useStore();
  const { t } = useI18n();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path;

  // Different nav based on user role
  const isDriver = user?.role === 'driver';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F1115]/95 backdrop-blur-xl border-t border-white/5 safe-area-pb md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {/* Search - both roles */}
        <Link to="/search" className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${isActive('/search') ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`}>
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.search')}</span>
        </Link>

        {/* Offer / Publish Trip - DRIVER ONLY */}
        {isDriver && (
          <Link to="/driver" className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${isActive('/driver') ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive('/driver') ? 'bg-[#FF6B00]' : 'bg-[#FF6B00]/20'}`}>
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-medium">{t('driver.publish')}</span>
          </Link>
        )}

        {/* Publish button for passenger too */}
        {!isDriver && (
          <Link to="/publish-trip" className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${isActive('/publish-trip') ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive('/publish-trip') ? 'bg-[#FF6B00]' : 'bg-[#FF6B00]/20'}`}>
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-medium">{t('driver.publish')}</span>
          </Link>
        )}

        {/* My Trips - shows different content based on role */}
        <Link to={isDriver ? '/driver' : '/dashboard'} className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${isActive('/dashboard') || isActive('/driver') ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`}>
          <Car className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.trips')}</span>
        </Link>

        {/* Messages */}
        <Link to="/messages" className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${isActive('/messages') ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`}>
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.chat')}</span>
        </Link>

        {/* Profile */}
        <Link to="/profile" className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${isActive('/profile') ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`}>
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.profile')}</span>
        </Link>
      </div>
    </nav>
  );
}
