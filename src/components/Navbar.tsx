import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  Car, Menu, X, Bell, MessageCircle, User, LogOut,
  Shield, ChevronDown, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, isAuthenticated, logout, notifications, unreadCount } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLanding = location.pathname === '/';

  const scrollToSection = (id: string) => {
    if (!isLanding) {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isLanding ? 'bg-transparent' : 'glass border-b border-white/5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">
              Wansni<span className="text-[#FF6B00]">Auto</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('search')} className="text-sm text-[#A0A0A0] hover:text-white transition-colors">
              Find a ride
            </button>
            <button onClick={() => scrollToSection('features')} className="text-sm text-[#A0A0A0] hover:text-white transition-colors">
              How it works
            </button>
            <button onClick={() => scrollToSection('routes')} className="text-sm text-[#A0A0A0] hover:text-white transition-colors">
              Popular routes
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                      <Bell className="w-5 h-5 text-[#A0A0A0]" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-[#FF6B00] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 bg-[#1B1F27] border border-white/10">
                    <div className="px-4 py-3 border-b border-white/5">
                      <span className="text-sm font-medium text-white">Notifications</span>
                    </div>
                    {notifications.length > 0 ? notifications.slice(0, 5).map(n => (
                      <DropdownMenuItem key={n.id} className={`px-4 py-3 cursor-pointer ${!n.read ? 'bg-[#FF6B00]/5' : ''}`}>
                        <div>
                          <p className="text-sm text-white font-medium">{n.title}</p>
                          <p className="text-xs text-[#A0A0A0] mt-0.5">{n.message}</p>
                        </div>
                      </DropdownMenuItem>
                    )) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-[#A0A0A0]">No notifications yet</p>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-white/5 transition-colors">
                      <img src={user?.avatar || '/images/avatar-passenger-1.jpg'} alt={user?.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FF6B00]/40" />
                      <span className="text-sm text-white hidden sm:block font-medium">{user?.name?.split(' ')[0]}</span>
                      <ChevronDown className="w-4 h-4 text-[#A0A0A0] hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#1B1F27] border border-white/10">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-sm font-medium text-white">{user?.name}</p>
                      <p className="text-xs text-[#A0A0A0]">{user?.email}</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer px-4 py-2.5">
                      <User className="w-4 h-4 mr-2.5 text-[#A0A0A0]" /> Profile
                    </DropdownMenuItem>
                    {user?.role === 'driver' && (
                      <DropdownMenuItem onClick={() => navigate('/driver')} className="cursor-pointer px-4 py-2.5">
                        <Car className="w-4 h-4 mr-2.5 text-[#A0A0A0]" /> Driver Dashboard
                      </DropdownMenuItem>
                    )}
                    {user?.role === 'passenger' && (
                      <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer px-4 py-2.5">
                        <Search className="w-4 h-4 mr-2.5 text-[#A0A0A0]" /> My Trips
                      </DropdownMenuItem>
                    )}
                    {user?.role === 'admin' && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer px-4 py-2.5">
                        <Shield className="w-4 h-4 mr-2.5 text-[#A0A0A0]" /> Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/verification')} className="cursor-pointer px-4 py-2.5">
                      <Shield className="w-4 h-4 mr-2.5 text-[#A0A0A0]" /> Verification
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/messages')} className="cursor-pointer px-4 py-2.5">
                      <MessageCircle className="w-4 h-4 mr-2.5 text-[#A0A0A0]" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-400 px-4 py-2.5">
                      <LogOut className="w-4 h-4 mr-2.5" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden sm:block text-sm text-[#A0A0A0] hover:text-white transition-colors px-4 py-2">
                  Sign in
                </Link>
                <Button onClick={() => navigate('/register')} className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl px-5 text-sm font-medium">
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2.5 rounded-xl hover:bg-white/5 transition-colors">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass rounded-2xl mt-2 p-4 space-y-1 border border-white/5">
            <button onClick={() => scrollToSection('search')} className="block w-full text-left px-4 py-2.5 text-[#A0A0A0] hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm">Find a ride</button>
            <button onClick={() => scrollToSection('features')} className="block w-full text-left px-4 py-2.5 text-[#A0A0A0] hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm">How it works</button>
            <button onClick={() => scrollToSection('routes')} className="block w-full text-left px-4 py-2.5 text-[#A0A0A0] hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm">Popular routes</button>
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-white hover:bg-white/5 rounded-xl transition-colors text-sm font-medium">Profile</Link>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-red-400 hover:bg-white/5 rounded-xl transition-colors text-sm">Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-[#FF6B00] hover:bg-white/5 rounded-xl transition-colors text-sm font-medium">Sign in</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
