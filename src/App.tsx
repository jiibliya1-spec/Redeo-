import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';
import { LandingPage } from '@/pages/LandingPage';
import { SearchResultsPage } from '@/pages/SearchResultsPage';
import { TripDetailsPage } from '@/pages/TripDetailsPage';
import { BookingPage } from '@/pages/BookingPage';
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
import { ProfilePage } from '@/pages/ProfilePage';
import { VerificationPage } from '@/pages/VerificationPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PublishTripPage } from '@/pages/PublishTripPage';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/spinner';

/* ─── Role-based redirect for /dashboard ─── */
function DashboardRouter() {
  const { user, isAuthenticated } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    console.log('[DashboardRouter] User role:', user?.role);
    if (user?.role === 'admin') {
      console.log('[DashboardRouter] Admin → redirecting to /admin');
      navigate('/admin', { replace: true });
    }
    // else: render the appropriate dashboard component below
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'driver') return <DriverDashboard />;
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
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminRouteGuard>
  );
}

/* ─── App content with conditional navbar ─── */
function AppContent() {
  const { isAuthenticated, user, isLoading, initAuth, refreshProfile } = useStore();

  useEffect(() => {
    const boot = async () => {
      await initAuth();
      // Refresh profile to ensure latest data from Supabase
      await refreshProfile();
    };
    boot();
  }, []);

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
          <Route path="/login" element={<ProtectedLogin />} />
          <Route path="/register" element={<ProtectedRegister />} />
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/driver" element={isAuthenticated && (user?.role === 'driver' || user?.role === 'admin') ? <DriverDashboard /> : <Navigate to="/login" />} />
          <Route path="/publish-trip" element={isAuthenticated ? <PublishTripPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/verification" element={isAuthenticated ? <VerificationPage /> : <Navigate to="/login" />} />
          <Route path="/messages" element={isAuthenticated ? <MessagesPage /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Show bottomnav only for non-admin users */}
      {!isAdmin && <BottomNav />}

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
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
