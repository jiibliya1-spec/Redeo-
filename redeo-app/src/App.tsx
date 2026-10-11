import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, Component, lazy, Suspense, type ReactNode, type ErrorInfo } from 'react';

/* ─── Error Boundary: catches component crashes, shows friendly message instead of blank screen ─── */
class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center px-4 gap-4">
          <p className="text-white text-lg font-semibold">Something went wrong</p>
          <p className="text-[#A0A0A0] text-sm text-center">{this.state.error}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: '' }); window.location.href = '/'; }}
            className="mt-2 px-6 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-medium"
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';
import { SplashScreen } from '@/components/SplashScreen';
import { LandingPage } from '@/pages/LandingPage';
const SearchResultsPage = lazy(() => import('@/pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })));
const TripDetailsPage = lazy(() => import('@/pages/TripDetailsPage').then((m) => ({ default: m.TripDetailsPage })));
const BookingPage = lazy(() => import('@/pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const MyTripsPage = lazy(() => import('@/pages/MyTripsPage').then((m) => ({ default: m.MyTripsPage })));
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
const PassengerDashboard = lazy(() => import('@/pages/PassengerDashboard').then((m) => ({ default: m.PassengerDashboard })));
const DriverDashboard = lazy(() => import('@/pages/DriverDashboard').then((m) => ({ default: m.DriverDashboard })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminVerifications = lazy(() => import('@/pages/admin/AdminVerifications').then((m) => ({ default: m.AdminVerifications })));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminTrips = lazy(() => import('@/pages/admin/AdminTrips').then((m) => ({ default: m.AdminTrips })));
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages').then((m) => ({ default: m.AdminMessages })));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })));
const AdminSupportTickets = lazy(() => import('@/pages/admin/AdminSupportTickets').then((m) => ({ default: m.AdminSupportTickets })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const VerificationPage = lazy(() => import('@/pages/VerificationPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const PublishTripPage = lazy(() => import('@/pages/PublishTripPage').then((m) => ({ default: m.PublishTripPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ContactSupportPage = lazy(() => import('@/pages/ContactSupportPage').then((m) => ({ default: m.ContactSupportPage })));
const DriverProfilePage = lazy(() => import('@/pages/DriverProfilePage').then((m) => ({ default: m.DriverProfilePage })));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage'));
const CareersPage = lazy(() => import('@/pages/CareersPage'));
const SafetyPage = lazy(() => import('@/pages/SafetyPage'));
const FAQPage = lazy(() => import('@/pages/FAQPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
import { NotificationListener } from '@/components/NotificationListener';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/spinner';

/* ─── Role-based redirect for /dashboard ─── */
function DashboardRouter() {
  const { user, isAuthenticated, mode } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (mode === 'driver') return <DriverDashboard />;
  return <PassengerDashboard />;
}

/* ─── Protected login - redirect if already authenticated ─── */
function ProtectedLogin() {
  const { isAuthenticated, user } = useStore();
  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage />;
}

/* ─── Protected register - redirect if already authenticated ─── */
function ProtectedRegister() {
  const { isAuthenticated, user } = useStore();
  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <RegisterPage />;
}

/* ─── Admin pages wrapper ─── */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>('main, [data-scroll-root]').forEach((el) => { el.scrollTop = 0; });
  }, [pathname]);
  return null;
}

function AdminRoutes() {
  return (
    <AdminRouteGuard>
      <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Spinner /></div>}>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/verifications" element={<AdminVerifications />} />
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/trips" element={<AdminTrips />} />
        <Route path="/messages" element={<AdminMessages />} />
        <Route path="/settings" element={<AdminSettings />} />
        <Route path="/support" element={<AdminSupportTickets />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      </Suspense>
    </AdminRouteGuard>
  );
}

/* ─── App content with conditional navbar ─── */
function AppContent() {
  const { isAuthenticated, user, isLoading, initAuth, refreshProfile, setUser, mode } = useStore();
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();
  const language = useStore((s) => s.language);

  // Apply the chosen language to the whole document (text direction + lang attribute)
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Apply the chosen theme (dark / light) to the whole document
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme !== 'light');
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F5F7' : '#FF6B00');
  }, [theme]);

  useEffect(() => {
    const boot = async () => {
      await initAuth();
      await refreshProfile();
    };
    boot();

    // Listen for auth state changes — catches email confirmation redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // User just confirmed email and got signed in automatically
        await refreshProfile();
        const freshState = useStore.getState();
        if (freshState.user) {
          const role = freshState.user.role;
          if (role === 'admin') navigate('/admin', { replace: true });
          else navigate('/dashboard', { replace: true });
        }
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // Show splash screen on first load (independent of auth state)
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-10 h-10 text-[#FF6B00]" />
          <p className="text-[#A0A0A0] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#0F1115] text-white font-sans">
      {/* Show navbar only for non-admin users */}
      <ScrollToTop />
      {!isAdmin && <Navbar />}

      <main className={isAdmin ? '' : 'pb-20 md:pb-0'}>
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Spinner /></div>}>
        <Routes>
          {/* Admin routes - NO navbar, NO bottomnav */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* Normal user routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/trip/:id" element={<TripDetailsPage />} />
          <Route path="/booking/:id" element={<BookingPage />} />
          <Route path="/my-trips" element={isAuthenticated ? <MyTripsPage /> : <Navigate to="/login" />} />
          <Route path="/login" element={<ProtectedLogin />} />
          <Route path="/register" element={<ProtectedRegister />} />
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/driver" element={isAuthenticated && (mode === 'driver' || user?.role === 'admin') ? <DriverDashboard /> : <Navigate to="/dashboard" />} />
          <Route path="/publish-trip" element={isAuthenticated ? (mode === 'driver' ? <PublishTripPage /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/verification" element={isAuthenticated ? <VerificationPage /> : <Navigate to="/login" />} />
          <Route path="/messages" element={isAuthenticated ? <MessagesPage /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/support" element={<ContactSupportPage />} />
          <Route path="/contact" element={<ContactSupportPage />} />
          <Route path="/profile/:id" element={<DriverProfilePage />} />

          {/* Static pages - footer links */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="/cookies" element={<LegalPage />} />
          <Route path="/driver-agreement" element={<LegalPage />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </main>

      {/* Show bottomnav only for non-admin users */}
      {!isAdmin && <BottomNav />}

      <NotificationListener />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1B1F27',
            border: '1px solid rgba(255,107,0,0.2)',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <PageErrorBoundary>
      <BrowserRouter>
        <PageErrorBoundary>
          <AppContent />
        </PageErrorBoundary>
      </BrowserRouter>
    </PageErrorBoundary>
  );
}

export default App;
