import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Bell } from 'lucide-react';

/**
 * Global NotificationListener
 * Listens to realtime notifications + profile updates
 */
export function NotificationListener() {
  const { user, isAuthenticated, refreshProfile, setUser } = useStore();
  const userId = user?.id;
  const shownRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((notif: any) => {
    if (shownRef.current.has(notif.id)) return;
    shownRef.current.add(notif.id);
    if (shownRef.current.size > 100) shownRef.current.clear();

    switch (notif.type) {
      case 'verification_approved':
        toast.success(notif.message || 'Your documents have been verified!', {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          duration: 8000,
        });
        break;
      case 'verification_rejected':
        toast.error(notif.message || 'Your verification was rejected.', {
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

  // Listen to notifications INSERT
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const notif = payload.new as any;
          showToast(notif);

          if (notif.type === 'verification_approved') {
            setUser({ ...user!, is_verified: true, verification_status: 'verified' });
            await refreshProfile();
          } else if (notif.type === 'verification_rejected') {
            setUser({ ...user!, is_verified: false, verification_status: 'rejected' });
            await refreshProfile();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, userId, showToast, refreshProfile, setUser, user]);

  // Listen to profile UPDATE (verification status changes)
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const p = payload.new as any;
          setUser({
            ...user!,
            is_verified: p.is_verified === true,
            verification_status: p.verification_status,
          });

          if (p.verification_status === 'verified' && !user?.is_verified) {
            toast.success('Your account has been verified! You can now publish trips.', {
              icon: <CheckCircle className="w-5 h-5 text-green-500" />,
              duration: 10000,
            });
          } else if (p.verification_status === 'rejected' && user?.verification_status !== 'rejected') {
            toast.error('Your verification was rejected. Please re-upload.', {
              icon: <XCircle className="w-5 h-5 text-red-500" />,
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, userId, setUser, user]);

  // Polling fallback
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const check = async () => {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!notifs?.length) return;

      for (const n of notifs) {
        showToast(n);
        if (n.type === 'verification_approved') {
          setUser({ ...user!, is_verified: true, verification_status: 'verified' });
        } else if (n.type === 'verification_rejected') {
          setUser({ ...user!, is_verified: false, verification_status: 'rejected' });
        }
      }
    };

    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [isAuthenticated, userId, showToast, setUser, user]);

  return null;
}
