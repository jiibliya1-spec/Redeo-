import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Spinner } from '@/components/ui/spinner';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { isAuthenticated, user, isLoading } = useStore();

  // Wait for auth to initialize
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-10 h-10 text-[#FF6B00]" />
          <p className="text-[#A0A0A0] text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Not logged in → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin → home
  if (user?.role !== 'admin') {
    console.log('[AdminRouteGuard] Access denied. User role:', user?.role, 'Expected: admin');
    return <Navigate to="/" replace />;
  }

  // Admin confirmed → show admin content
  console.log('[AdminRouteGuard] Admin access granted for:', user?.name);
  return <>{children}</>;
}
