import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Home, Search, Car, User, MessageCircle } from 'lucide-react';

export function BottomNav() {
  const { isAuthenticated, user } = useStore();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    ...(user?.role === 'driver' ? [{ icon: Car, label: 'Drive', path: '/driver' }] : []),
    ...(user?.role === 'passenger' ? [{ icon: Car, label: 'Trips', path: '/dashboard' }] : []),
    { icon: MessageCircle, label: 'Chat', path: '/messages' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5 md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
              isActive(item.path) ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-[#FF6B00]' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
