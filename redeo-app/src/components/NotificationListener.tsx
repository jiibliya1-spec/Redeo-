import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { localizeNotification } from '@/lib/notifText';
import { getTranslation } from '@/lib/i18n';
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
    let changed = false;
    const updated = bookings.map(b => {
      if (b.trip_id === tripId && b.passenger_id === userId && b.status === 'pending') {
        changed = true;
        return { ...b, status: newStatus };
      }
      return b;
    });
    localStorage.setItem(LS_BOOKINGS, JSON.stringify(updated));

    // Notify MyTripsPage (and any listener) to refresh
    if (changed) {
      window.dispatchEvent(new CustomEvent('wansniauto:booking-updated', { detail: { tripId, status: newStatus } }));
    }
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

    const lang = useStore.getState().language;
    const { title, message } = localizeNotification(notif, lang);

    switch (notif.type) {
      case 'verification_approved':
        toast.success(message || title, { icon: <CheckCircle className="w-5 h-5 text-green-500" />, duration: 8000 });
        break;
      case 'verification_rejected':
        toast.error(message || title, { icon: <XCircle className="w-5 h-5 text-red-500" />, duration: 8000 });
        break;
      case 'success':
        toast.success(title || message, { icon: <CheckCircle className="w-5 h-5 text-green-500" />, duration: 8000, description: title ? message : undefined });
        break;
      case 'warning':
        toast.warning(title || message, { duration: 8000, description: title ? message : undefined });
        break;
      default:
        toast.info(title || message, { icon: <Bell className="w-5 h-5 text-[#FF6B00]" />, duration: 5000, description: title ? message : undefined });
    }
  }, []);

  // Keep the latest user/actions in refs so realtime channels are NOT torn down and
  // re-created every time the user object changes.
  const userRef = useRef(user);
  userRef.current = user;
  const actionsRef = useRef({ refreshProfile, setUser, setUnreadCount });
  actionsRef.current = { refreshProfile, setUser, setUnreadCount };
  const handledRef = useRef<Set<string>>(new Set());

  const processNotification = useCallback(async (notif: any) => {
    if (handledRef.current.has(notif.id)) return;
    handledRef.current.add(notif.id);
    if (handledRef.current.size > 300) handledRef.current.clear();

    const { refreshProfile, setUser, setUnreadCount } = actionsRef.current;
    const current = userRef.current;

    showToast(notif);
    persistNotification(notif);
    if (current?.id) syncBookingStatus(notif, current.id);

    // Handle verification changes
    if (current && notif.type === 'verification_approved') {
      setUser({ ...current, is_verified: true, verification_status: 'verified' });
      refreshProfile();
    } else if (current && notif.type === 'verification_rejected') {
      setUser({ ...current, is_verified: false, verification_status: 'rejected' });
      refreshProfile();
    }

    // Update unread count badge
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(LS_NOTIFS) || '[]');
      setUnreadCount(existing.filter(n => !n.read).length);
    } catch {}

    // Mark as read in Supabase (best-effort, not awaited)
    supabase.from('notifications').update({ read: true }).eq('id', notif.id).then(() => {}, () => {});
  }, [showToast]);

  // ── Realtime listeners (one channel per user, stable) ──
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => { processNotification(payload.new as any); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const p = payload.new as any;
          const current = userRef.current;
          if (!current) return;
          const wasVerified = current.is_verified;
          const prevStatus = current.verification_status;
          actionsRef.current.setUser({
            ...current,
            is_verified: p.is_verified === true,
            verification_status: p.verification_status,
          });
          if (p.verification_status === 'verified' && !wasVerified) {
            toast.success(getTranslation(useStore.getState().language, 'notif.toast_verified'), {
              icon: <CheckCircle className="w-5 h-5 text-green-500" />,
              duration: 10000,
            });
          } else if (p.verification_status === 'rejected' && prevStatus !== 'rejected') {
            toast.error(getTranslation(useStore.getState().language, 'notif.toast_rejected'), {
              icon: <XCircle className="w-5 h-5 text-red-500" />,
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, userId, processNotification]);

  // ── Polling fallback: only while the app is visible, every 30s, plus on return to the app ──
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!notifs?.length) return;
        await Promise.all(notifs.map((n) => processNotification(n)));
      } catch { /* Supabase unavailable */ }
    };

    const first = setTimeout(check, 1500); // don't compete with first paint
    const iv = setInterval(check, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(first); clearInterval(iv); document.removeEventListener('visibilitychange', onVisible); };
  }, [isAuthenticated, userId, processNotification]);

  return null;
}
