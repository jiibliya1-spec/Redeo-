import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function AppContent() {
  const { isAuthenticated, user, isLoading, initAuth } = useStore();

  useEffect(() => {
    initAuth();
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

  return (
    <div className="min-h-screen bg-[#0F1115] text-white font-sans">
      <Routes>
        {/* Admin routes - no navbar/bottomnav */}
        <Route path="/admin/*" element={
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
        } />
      </Routes>

      {/* Non-admin routes with navbar/bottomnav */}
      <Routes>
        <Route path="/admin/*" element={null} />
        <Route path="*" element={
          <>
            <Navbar />
            <main className="pb-20 md:pb-0">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/trip/:id" element={<TripDetailsPage />} />
                <Route path="/booking/:id" element={<BookingPage />} />
                <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
                <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={
                  isAuthenticated ? (
                    user?.role === 'driver' ? <DriverDashboard /> : <PassengerDashboard />
                  ) : <Navigate to="/login" />
                } />
                <Route path="/driver" element={isAuthenticated && (user?.role === 'driver' || user?.role === 'admin') ? <DriverDashboard /> : <Navigate to="/login" />} />
                <Route path="/publish-trip" element={isAuthenticated ? <PublishTripPage /> : <Navigate to="/login" />} />
                <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
                <Route path="/verification" element={isAuthenticated ? <VerificationPage /> : <Navigate to="/login" />} />
                <Route path="/messages" element={isAuthenticated ? <MessagesPage /> : <Navigate to="/login" />} />
                <Route path="/notifications" element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <BottomNav />
          </>
        } />
      </Routes>

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
