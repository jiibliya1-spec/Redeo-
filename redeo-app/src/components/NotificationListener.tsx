import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Bell } from 'lucide-react';

const LS_NOTIFS = 'wansniauto_notifications';
const LS_BOOKINGS = 'wansniauto_bookings';

/** Save a Supabase notification into localStorage so NotificationsPage can display it */
function persistNotification(notif: any) {
  try {
    const existing: any[] = JSON.parse(localStorage.getItem(LS_NOTIFS) || '[]');
    if (existing.some(n => n.id === notif.id)) return; // deduplicate

    const mapped = {
      id: notif.id,
      type: notif.type === 'success' ? 'booking' : notif.type === 'warning' ? 'booking' : 'system',
      title: notif.title,
      message: notif.message,
      created_at: notif.created_at || new Date().toISOString(),
      read: false,
    };
    localStorage.setItem(LS_NOTIFS, JSON.stringify([mapped, ...existing].slice(0, 100)));
  } catch {}
}

/** If the message contains ||TRIP:uuid||, sync that trip's booking status in localStorage */
function syncBookingStatus(notif: any, userId: string) {
  try {
    const tripMatch = (notif.message || '').match(/\|\|TRIP:([a-zA-Z0-9-]+)\|\|/);
    if (!tripMatch) return;
    const tripId = tripMatch[1];

    const bookings: any[] = JSON.parse(localStorage.getItem(LS_BOOKINGS) || '[]');
    const newStatus = notif.type === 'success' ? 'confirmed' : 'cancelled';
    const updated = bookings.map(b => {
      if (b.trip_id === tripId && b.passenger_id === userId && b.status === 'pending') {
        return { ...b, status: newStatus };
      }
      return b;
    });
    localStorage.setItem(LS_BOOKINGS, JSON.stringify(updated));
  } catch {}
}

export function NotificationListener() {
  const { user, isAuthenticated, refreshProfile, setUser, setUnreadCount } = useStore();
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
      case 'success':
        toast.success(notif.title || notif.message, {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          duration: 8000,
          description: notif.title ? notif.message?.replace(/\|\|TRIP:[^|]+\|\|/, '').trim() : undefined,
        });
        break;
      case 'warning':
        toast.warning(notif.title || notif.message, {
          duration: 8000,
          description: notif.title ? notif.message?.replace(/\|\|TRIP:[^|]+\|\|/, '').trim() : undefined,
        });
        break;
      default:
        toast.info(notif.title || notif.message, {
          icon: <Bell className="w-5 h-5 text-[#FF6B00]" />,
          duration: 5000,
          description: notif.title ? notif.message?.replace(/\|\|TRIP:[^|]+\|\|/, '').trim() : undefined,
        });
    }
  }, []);

  const processNotification = useCallback(async (notif: any) => {
    showToast(notif);
    persistNotification(notif);

    if (userId) {
      syncBookingStatus(notif, userId);
    }

    // Handle verification changes
    if (notif.type === 'verification_approved') {
      setUser({ ...user!, is_verified: true, verification_status: 'verified' });
      await refreshProfile();
    } else if (notif.type === 'verification_rejected') {
      setUser({ ...user!, is_verified: false, verification_status: 'rejected' });
      await refreshProfile();
    }

    // Update unread count badge
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(LS_NOTIFS) || '[]');
      const unread = existing.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch {}

    // Mark as read in Supabase (best-effort)
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
    } catch {}
  }, [showToast, userId, user, refreshProfile, setUser, setUnreadCount]);

  // ── Realtime listener ──
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          await processNotification(payload.new as any);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, userId, processNotification]);

  // ── Profile UPDATE listener ──
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

  // ── Polling fallback (every 10s) ──
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const check = async () => {
      try {
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!notifs?.length) return;

        for (const n of notifs) {
          await processNotification(n);
        }
      } catch { /* Supabase unavailable */ }
    };

    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [isAuthenticated, userId, processNotification]);

  return null;
}
