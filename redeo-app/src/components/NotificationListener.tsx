import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Bell } from 'lucide-react';

/**
 * Global NotificationListener
 * 
 * - Listens to realtime INSERT on notifications table
 * - Shows toast notification when new notification arrives
 * - Automatically refreshes user profile on verification changes
 * - Works as a hidden component (no UI rendered)
 */
export function NotificationListener() {
  const { user, isAuthenticated, refreshProfile, setUser } = useStore();
  const userId = user?.id;
  const toastRef = useRef<string[]>([]);

  const getJwt = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }, []);

  // Show toast for a notification
  const showToast = useCallback((notif: any) => {
    // Prevent duplicate toasts
    if (toastRef.current.includes(notif.id)) return;
    toastRef.current.push(notif.id);
    // Keep only last 50
    if (toastRef.current.length > 50) toastRef.current = toastRef.current.slice(-50);

    switch (notif.type) {
      case 'verification_approved':
        toast.success(notif.message, {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          duration: 8000,
        });
        break;
      case 'verification_rejected':
        toast.error(notif.message, {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          duration: 8000,
        });
        break;
      default:
        toast.info(notif.message, {
          icon: <Bell className="w-5 h-5 text-[#FF6B00]" />,
          duration: 5000,
        });
    }
  }, []);

  // Main realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    console.log('[NotificationListener] Starting for user:', userId);

    // Subscribe to notifications for this user
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const notif = payload.new as any;
          console.log('[NotificationListener] New notification:', notif);

          // Show toast
          showToast(notif);

          // If verification notification, refresh profile
          if (notif.type === 'verification_approved') {
            // Update user state immediately
            setUser({
              ...user!,
              is_verified: true,
              verification_status: 'verified',
            });
            // Then refresh from server
            await refreshProfile();
          } else if (notif.type === 'verification_rejected') {
            setUser({
              ...user!,
              is_verified: false,
              verification_status: 'rejected',
            });
            await refreshProfile();
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationListener] Subscription status:', status);
      });

    return () => {
      console.log('[NotificationListener] Cleaning up');
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, showToast, refreshProfile, setUser, user]);

  // Polling fallback: check for new notifications every 10 seconds
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const checkNotifications = async () => {
      try {
        const jwt = await getJwt();
        const res = await fetch(
          `https://qhbiafoyhvmvyyzwdzhd.supabase.co/rest/v1/notifications?select=*&user_id=eq.${userId}&read=eq.false&order=created_at.desc&limit=5`,
          {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM',
              'Authorization': `Bearer ${jwt}`,
            },
          }
        );
        if (!res.ok) return;
        const notifs = await res.json();
        if (!notifs?.length) return;

        // Check if there's a verification notification we haven't processed
        for (const notif of notifs) {
          showToast(notif);

          if (notif.type === 'verification_approved') {
            setUser({ ...user!, is_verified: true, verification_status: 'verified' });
            await refreshProfile();
          } else if (notif.type === 'verification_rejected') {
            setUser({ ...user!, is_verified: false, verification_status: 'rejected' });
            await refreshProfile();
          }
        }
      } catch (e) {
        // Silent
      }
    };

    // Run immediately once
    checkNotifications();

    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userId, showToast, refreshProfile, setUser, user, getJwt]);

  // Also subscribe to profile changes (verification_status updates directly)
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const channel = supabase
      .channel(`profile-verification-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const p = payload.new as any;
          console.log('[NotificationListener] Profile updated:', p);

          // Update user state directly
          setUser({
            ...user!,
            is_verified: p.is_verified === true,
            verification_status: p.verification_status,
          });

          // Show toast on status change
          if (p.verification_status === 'verified' && !user?.is_verified) {
            toast.success('Your account has been verified! You can now publish trips.', {
              icon: <CheckCircle className="w-5 h-5 text-green-500" />,
              duration: 10000,
            });
          } else if (p.verification_status === 'rejected' && user?.verification_status !== 'rejected') {
            toast.error('Your verification was rejected. Please re-upload your documents.', {
              icon: <XCircle className="w-5 h-5 text-red-500" />,
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, setUser, user]);

  // This component renders nothing visible
  return null;
}
