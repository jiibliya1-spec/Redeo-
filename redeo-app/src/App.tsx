import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, Component, type ReactNode, type ErrorInfo } from 'react';

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
import { SearchResultsPage } from '@/pages/SearchResultsPage';
import { TripDetailsPage } from '@/pages/TripDetailsPage';
import { BookingPage } from '@/pages/BookingPage';
import { MyTripsPage } from '@/pages/MyTripsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PassengerDashboard } from '@/pages/PassengerDashboard';
import { DriverDashboard } from '@/pages/DriverDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminVerifications } from '@/pages/admin/AdminVerifications';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminTrips } from '@/pages/admin/AdminTrips';
import { AdminMessages } from '@/pages/admin/AdminMessages';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminSupportTickets } from '@/pages/admin/AdminSupportTickets';
import { ProfilePage } from '@/pages/ProfilePage';
import VerificationPage from '@/pages/VerificationPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PublishTripPage } from '@/pages/PublishTripPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ContactSupportPage } from '@/pages/ContactSupportPage';
import { DriverProfilePage } from '@/pages/DriverProfilePage';
import AboutPage from '@/pages/AboutPage';
import HowItWorksPage from '@/pages/HowItWorksPage';
import CareersPage from '@/pages/CareersPage';
import SafetyPage from '@/pages/SafetyPage';
import FAQPage from '@/pages/FAQPage';
import LegalPage from '@/pages/LegalPage';
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
function AdminRoutes() {
  return (
    <AdminRouteGuard>
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
    </AdminRouteGuard>
  );
}

/* ─── App content with conditional navbar ─── */
function AppContent() {
  const { isAuthenticated, user, isLoading, initAuth, refreshProfile, setUser, mode } = useStore();
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

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
      {!isAdmin && <Navbar />}

      <main className={isAdmin ? '' : 'pb-20 md:pb-0'}>
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
