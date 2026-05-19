import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, MessageCircle, Check, Bell, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

// ─── User-scoped localStorage helpers ────────────────────────────────────────
function getCacheKey(userId: string) {
  return `wansniauto_notifications_${userId}`;
}
function readCache(userId: string): NotifItem[] {
  try {
    return JSON.parse(localStorage.getItem(getCacheKey(userId)) || '[]');
  } catch { return []; }
}
function writeCache(userId: string, items: NotifItem[]) {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(items.slice(0, 100)));
  } catch {}
}
function clearCache(userId: string) {
  try { localStorage.removeItem(getCacheKey(userId)); } catch {}
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { user, setUnreadCount } = useStore();
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'booking' | 'message'>('all');

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);

    // PRIMARY: Supabase — always filtered by user_id via RLS + explicit eq
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, created_at, read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80);

    let items: NotifItem[] = data || [];

    // SECONDARY: user-scoped localStorage cache (only for the logged-in user)
    const cached = readCache(user.id);
    const sbIds = new Set(items.map(n => n.id));
    for (const c of cached) {
      if (!sbIds.has(c.id)) items.push(c);
    }

    // Write back refreshed cache (user-scoped)
    writeCache(user.id, items);

    setNotifs(items);
    setUnreadCount(items.filter(n => !n.read).length);

    // Mark all as read in Supabase
    if (items.some(n => !n.read)) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(0);
    }

    setLoading(false);
  }, [user?.id, setUnreadCount]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    const next = notifs.filter(n => n.id !== id);
    setNotifs(next);
    writeCache(user.id, next);
    await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    setNotifs([]);
    clearCache(user.id);
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setUnreadCount(0);
  };

  const getDisplayType = (type: string): 'booking' | 'message' | 'system' => {
    if (type === 'success' || type === 'warning' || type === 'verification_approved' || type === 'verification_rejected') return 'booking';
    if (type === 'message') return 'message';
    return 'system';
  };

  const filtered = filter === 'all'
    ? notifs
    : notifs.filter(n => getDisplayType(n.type) === filter);

  const cleanMessage = (msg: string) => msg?.replace(/\|\|TRIP:[^|]+\|\|/, '').trim() || '';

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
          </div>
          {notifs.length > 0 && (
            <Button onClick={handleDeleteAll} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl">
              <Trash2 className="w-4 h-4 mr-1" /> {t('common.delete')}
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-[#1B1F27] rounded-xl mb-6 border border-white/5" dir={dir}>
          {([
            { key: 'all' as const, label: t('notifications.all') },
            { key: 'message' as const, label: t('notifications.messages') },
            { key: 'booking' as const, label: t('notifications.bookings') },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                filter === tab.key ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 text-[#FF6B00] animate-spin" />
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
                filtered.map((n, i) => {
                  const dtype = getDisplayType(n.type);
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ delay: i * 0.03 }}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${
                        n.read ? 'bg-transparent border-white/5' : 'bg-[#FF6B00]/5 border-[#FF6B00]/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        dtype === 'message' ? 'bg-blue-500/10' :
                        dtype === 'booking' ? 'bg-green-500/10' : 'bg-[#FF6B00]/10'
                      }`}>
                        {dtype === 'message' ? <MessageCircle className="w-5 h-5 text-blue-400" /> :
                         dtype === 'booking' ? <Check className="w-5 h-5 text-green-400" /> :
                         <Bell className="w-5 h-5 text-[#FF6B00]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white truncate">{n.title}</p>
                          <span className="text-[10px] text-[#A0A0A0] shrink-0">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-[#A0A0A0] mt-0.5 line-clamp-2">{cleanMessage(n.message)}</p>
                      </div>

                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#A0A0A0] hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
