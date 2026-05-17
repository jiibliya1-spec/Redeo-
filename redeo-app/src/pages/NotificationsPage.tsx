import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, deleteAllNotifications, subscribeToNotifications,
} from '@/services/notificationService';
import { ArrowLeft, MessageCircle, Check, Bell, Trash2, Loader2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types';
import { toast } from 'sonner';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { user, setUnreadCount } = useStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'error'>('all');

  const loadNotifications = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data);
      const unread = data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = subscribeToNotifications(user.id, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { toast.error('Failed to mark all as read'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { toast.error('Failed to delete notification'); }
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    try {
      await deleteAllNotifications(user.id);
      setNotifications([]);
      setUnreadCount(0);
    } catch { toast.error('Failed to clear notifications'); }
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* silent */ }
    }
    if (n.link) navigate(n.link);
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
            </button>
            <h1 className="text-xl font-bold text-white" dir={dir}>{t('notifications.title')}</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-[#FF6B00] text-white text-xs font-bold rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllRead} variant="ghost" size="sm" className="text-[#A0A0A0] hover:text-white rounded-xl">
                <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button onClick={handleDeleteAll} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl">
                <Trash2 className="w-4 h-4 mr-1" /> {t('common.delete')}
              </Button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-[#1B1F27] rounded-xl mb-6 border border-white/5" dir={dir}>
          {([
            { key: 'all' as const, label: t('notifications.all') },
            { key: 'info' as const, label: t('notifications.messages') },
            { key: 'success' as const, label: t('notifications.bookings') },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${filter === tab.key ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-[#A0A0A0] hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" />
            </div>
          ) : (
            <AnimatePresence>
              {filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                  <Bell className="w-12 h-12 text-[#A0A0A0] mx-auto mb-4" />
                  <p className="text-lg text-white font-medium mb-1">{t('notifications.empty')}</p>
                  <p className="text-sm text-[#A0A0A0]">{t('notifications.empty_desc')}</p>
                </motion.div>
              ) : (
                filtered.map((n, i) => (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left hover:bg-white/5 ${n.read ? 'bg-transparent border-white/5' : 'bg-[#FF6B00]/5 border-[#FF6B00]/20'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.type === 'info' ? 'bg-blue-500/10' :
                      n.type === 'success' ? 'bg-green-500/10' :
                      n.type === 'error' ? 'bg-red-500/10' : 'bg-[#FF6B00]/10'
                    }`}>
                      {n.type === 'info' ? <MessageCircle className="w-5 h-5 text-blue-400" /> :
                       n.type === 'success' ? <Check className="w-5 h-5 text-green-400" /> :
                       n.type === 'error' ? <Bell className="w-5 h-5 text-red-400" /> :
                       <Bell className="w-5 h-5 text-[#FF6B00]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                        <span className="text-[10px] text-[#A0A0A0] shrink-0">
                          {n.created_at ? new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-[#A0A0A0] mt-0.5 line-clamp-2">{n.message}</p>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#A0A0A0] hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
