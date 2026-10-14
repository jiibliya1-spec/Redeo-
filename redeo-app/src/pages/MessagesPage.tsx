import { useState, useRef, useEffect } from 'react';
import { uploadChatImage } from '@/services/storageService';
import { decodeText } from '@/lib/notifText';
import { resolveAvatar } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Image, Check, CheckCheck, Loader2, Camera, User, X
} from 'lucide-react';


import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
// ─── REST API helper with JWT ───
async function getAuthHeaders() {
  const { data: s } = await supabase.auth.getSession();
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${s.session?.access_token || ''}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

/** Shrink a photo to max 1024px JPEG so chat images are ~100KB instead of several MB */
function shrinkDataUrl(dataUrl: string, maxSide = 1024, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  user_id: string;
  name: string;
  avatar: string;
  last_message: string;
  timestamp: string;
  unread: number;
  ts?: number;
}

export function MessagesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUnreadCount, incrementUnread } = useStore();
  const { t, dir, lang } = useI18n();
  const SUPPORT_ID = '00000000-0000-0000-0000-000000000000';
  const convName = (c: { user_id: string; name: string }) => c.user_id === SUPPORT_ID ? t('chat.support_team') : (c.name === 'User' ? t('chat.user') : c.name);
  const lastText = (s: string) => s === '\u{1F4F7} Photo' ? t('chat.photo') : s === 'Start a conversation...' ? t('chat.start') : (decodeText(s, lang) ?? s);


  const navState = (location.state || {}) as {
    contactId?: string; contactName?: string; contactAvatar?: string;
  };

  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const loadRef = useRef<() => Promise<void>>(async () => {});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [contactNames, setContactNames] = useState<Record<string, { name: string; avatar: string }>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  /* ─── Handle navigation from other pages ─── */
  useEffect(() => {
    if (!user?.id) return;
    const { contactId, contactName, contactAvatar } = navState;
    if (!contactId || contactId === user.id) {
      if (contactId === user.id) {
        toast.error(t('ui.cannot_chat_with_f0d9'));
      }
      return;
    }

    const name = contactName || 'User';
    const avatar = resolveAvatar(contactAvatar, contactId);
    setContactNames(prev => ({ ...prev, [contactId]: { name, avatar } }));

    setConversations(prev => {
      if (prev.find(c => c.user_id === contactId)) return prev;
      return [{ user_id: contactId, name, avatar, last_message: 'Start a conversation...', timestamp: '', unread: 0, ts: Date.now() }, ...prev];
    });

    setActiveConv(contactId);
    navigate('/messages', { replace: true, state: {} });
  }, [navState?.contactId, user?.id]);

  /* ─── LOAD ALL DATA FROM SUPABASE ─── */
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        // Load messages where I'm sender OR receiver
        const { data: allMsgs, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(300);

        if (error || !allMsgs) { console.error('[Messages] Load error:', error); return; }
        allMsgs.reverse(); // oldest → newest for display

        // Group by partner
        const grouped: Record<string, ChatMessage[]> = {};
        const partnerIds = new Set<string>();

        allMsgs.forEach((msg: any) => {
          const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (partnerId === user.id) return;
          partnerIds.add(partnerId);
          if (!grouped[partnerId]) grouped[partnerId] = [];
          grouped[partnerId].push(msg);
        });

        // Fetch contact info
        if (partnerIds.size > 0) {
          const { data: profiles } = await supabase
            .from('public_profiles')
            .select('id, name, avatar')
            .in('id', Array.from(partnerIds));

          if (profiles) {
            const map: Record<string, { name: string; avatar: string }> = {};
            profiles.forEach((p: any) => {
              map[p.id] = { name: p.name || 'User', avatar: resolveAvatar(p.avatar, p.id) };
            });
            setContactNames(prev => ({ ...prev, ...map }));
            const built = buildConvs(user.id, grouped, map);
            // keep conversations that were just opened and have no messages yet
            setConversations(prev => [...built, ...prev.filter(c => !built.some(b => b.user_id === c.user_id))]);
          }
        }

        // keep optimistic (not yet confirmed) messages that are still in flight
        setMessages(prev => {
          const merged: Record<string, ChatMessage[]> = { ...grouped };
          Object.entries(prev).forEach(([k, list]) => {
            const temps = list.filter(m => String(m.id).startsWith('tmp-'));
            if (temps.length) merged[k] = [...(merged[k] || []), ...temps];
            else if (!merged[k]) merged[k] = list;
          });
          return merged;
        });

        const totalUnread = allMsgs.filter((m: any) => m.receiver_id === user.id && !m.read).length;
        setUnreadCount(totalUnread);
      } catch (err) { console.error('[Messages] Error:', err); }
    };

    loadRef.current = load;
    load();
  }, [user?.id, setUnreadCount]);

  /* ─── Never miss a message: resync when the app comes back, the network returns, and every few seconds while open ─── */
  useEffect(() => {
    if (!user?.id) return;
    const resync = () => { if (document.visibilityState === 'visible') loadRef.current(); };
    const timer = setInterval(resync, 8000);
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    window.addEventListener('online', resync);
    window.addEventListener('pageshow', resync);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
      window.removeEventListener('online', resync);
      window.removeEventListener('pageshow', resync);
    };
  }, [user?.id]);

  const markReadRemote = async (partnerId: string) => {
    if (!user?.id) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`${SUPABASE_URL}/rest/v1/messages?receiver_id=eq.${user.id}&sender_id=eq.${partnerId}&read=eq.false`, {
        method: 'PATCH', headers, body: JSON.stringify({ read: true }),
      });
    } catch { /* silent */ }
  };

  /* ─── REALTIME SUBSCRIPTION (stable: reads the latest state through refs) ─── */
  const activeConvRef = useRef(activeConv);
  activeConvRef.current = activeConv;
  const contactNamesRef = useRef(contactNames);
  contactNamesRef.current = contactNames;
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, (payload: any) => {
        const activeConv = activeConvRef.current;
        const contactNames = contactNamesRef.current;
        const msg = payload.new as ChatMessage;
        if (msg.sender_id === user.id) return;
        if (msg.receiver_id !== user.id) return;

        const partnerId = msg.sender_id;

        setMessages(prev => {
          const existing = prev[partnerId] || [];
          if (existing.find(m => m.id === msg.id)) return prev;
          return { ...prev, [partnerId]: [...existing, msg] };
        });

        const viewing = activeConv === partnerId && document.visibilityState === 'visible';
        if (viewing) markReadRemote(partnerId); else incrementUnread();

        setConversations(prev => {
          const existing = prev.find(c => c.user_id === partnerId);
          if (existing) {
            return prev.map(c =>
              c.user_id === partnerId
                ? { ...c, last_message: msg.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : msg.content, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread: viewing ? 0 : c.unread + 1, ts: Date.now() }
                : c
            );
          }
          return [{
            user_id: partnerId,
            name: contactNames[partnerId]?.name || 'User',
            avatar: resolveAvatar(contactNames[partnerId]?.avatar, partnerId),
            last_message: msg.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : msg.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: viewing ? 0 : 1,
            ts: Date.now(),
          }, ...prev];
        });
      })
      .subscribe((status: string) => { if (status === 'SUBSCRIBED') loadRef.current(); });

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, incrementUnread]);

  /* ─── Mark as read ─── */
  useEffect(() => {
    if (!user?.id || !activeConv) return;

    setConversations(prev => prev.map(c => c.user_id === activeConv ? { ...c, unread: 0 } : c));

    markReadRemote(activeConv);
  }, [activeConv, user?.id]);

  /* ─── Scroll to bottom ─── */
  useEffect(() => {
    if (activeConv) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[activeConv || '']?.length, activeConv]);

  const activeConversation = conversations.find(c => c.user_id === activeConv);
  const currentMessages = activeConv ? (messages[activeConv] || []) : [];

  /* ─── BUILD CONVERSATIONS ─── */
  function buildConvs(uid: string, msgs: Record<string, ChatMessage[]>, names: Record<string, { name: string; avatar: string }>): Conversation[] {
    const map: Record<string, Conversation> = {};
    Object.entries(msgs).forEach(([key, list]) => {
      const last = [...list].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)).at(-1);
      if (!last) return;
      const c = names[key] || { name: 'User', avatar: resolveAvatar(null, key) };
      map[key] = {
        user_id: key, name: c.name, avatar: c.avatar,
        last_message: last.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : last.content,
        timestamp: last.created_at ? new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: list.filter(m => m.receiver_id === uid && !m.read).length,
        ts: last.created_at ? +new Date(last.created_at) : 0,
      };
    });
    return Object.values(map).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }

  /* ─── SEND TEXT MESSAGE (optimistic: appears instantly, confirmed in background) ─── */
  const handleSend = async () => {
    if (!messageText.trim() || !activeConv || !user?.id) return;
    if (activeConv === user.id) { toast.error(t('ui.cannot_message_yourself_2fe6')); return; }

    const text = messageText.trim();
    const convId = activeConv;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const tempMsg = { id: tempId, sender_id: user.id, receiver_id: convId, content: text, read: false, created_at: nowIso } as ChatMessage;
    setMessages(prev => ({ ...prev, [convId]: [...(prev[convId] || []), tempMsg] }));
    setConversations(prev => {
      const existing = prev.find(c => c.user_id === convId);
      if (existing) {
        return [{ ...existing, last_message: text, timestamp: timeLabel, unread: 0 }, ...prev.filter(c => c.user_id !== convId)];
      }
      const c = contactNames[convId] || { name: activeConversation?.name || 'User', avatar: activeConversation?.avatar || '' };
      return [{ user_id: convId, name: c.name, avatar: c.avatar, last_message: text, timestamp: timeLabel, unread: 0 }, ...prev];
    });
    setMessageText('');

    const rollback = (reason: string) => {
      setMessages(prev => ({ ...prev, [convId]: (prev[convId] || []).filter(m => m.id !== tempId) }));
      setMessageText(prevText => prevText || text);
      toast.error(t('ui.failed_to_send_6834') + reason);
    };

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sender_id: user.id, receiver_id: convId, content: text, read: false }),
      });
      if (!res.ok) { rollback(`${res.status}`); return; }
      const result = await res.json();
      const saved: ChatMessage | null = result[0] || null;
      if (!saved) { rollback(''); return; }
      // Swap the temporary message for the saved one (realtime may already have added it)
      setMessages(prev => {
        const list = prev[convId] || [];
        const withoutTemp = list.filter(m => m.id !== tempId);
        const alreadyThere = withoutTemp.some(m => m.id === saved.id);
        return { ...prev, [convId]: alreadyThere ? withoutTemp : [...withoutTemp, saved] };
      });
    } catch (err: any) {
      rollback(err?.message || '');
    }
  };

  /* ─── SEND IMAGE ─── */
  const handleSendImage = async (dataUrl: string) => {
    if (!activeConv || !user?.id) return;
    if (activeConv === user.id) { toast.error(t('ui.cannot_message_yourself_2fe6')); return; }

    setIsUploading(true);

    // Upload the (already shrunk) photo to Storage and send only its URL; fall back to inline data if the upload fails
    let imageRef = dataUrl;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'chat.jpg', { type: blob.type || 'image/jpeg' });
      imageRef = await uploadChatImage(user.id, file);
    } catch { /* keep inline data URL */ }

    let data: ChatMessage | null = null;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sender_id: user.id, receiver_id: activeConv, content: `[Image] ${imageRef}`, read: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      data = result[0] || null;
    } catch { toast.error(t('ui.failed_to_send_d496')); setIsUploading(false); return; }

    if (data) {
      setMessages(prev => ({ ...prev, [activeConv]: [...(prev[activeConv] || []), data] }));
    }

    setConversations(prev => {
      const existing = prev.find(c => c.user_id === activeConv);
      if (!existing) return prev;
      return [{ ...existing, last_message: '\u{1F4F7} Photo', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev.filter(c => c.user_id !== activeConv)];
    });

    setIsUploading(false);
    setPreviewImage(null);
  };

  const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => { const url = ev.target?.result as string; if (url) setPreviewImage(await shrinkDataUrl(url)); };
    reader.readAsDataURL(file);
  };

  const handleCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => { const url = ev.target?.result as string; if (url) handleSendImage(await shrinkDataUrl(url)); };
    reader.readAsDataURL(file);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">{t('auth.login')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraFile} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-5rem)]">
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 h-full overflow-hidden flex" dir={dir}>
          {/* Conversation List */}
          <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" dir={dir}>{t('chat.title')}</h2>
              <span className="text-xs text-[#A0A0A0]">{conversations.length} {t('chat.contacts')}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-8 h-8 text-[#A0A0A0] mx-auto mb-2" />
                  <p className="text-sm text-[#A0A0A0]">{t('chat.no_contacts')}</p>
                  <p className="text-xs text-[#A0A0A0] mt-1">{t('ui.start_a_chat_9fc5')}</p>
                </div>
              ) : (
                conversations.map((conv, i) => (
                  <motion.button
                    key={conv.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setActiveConv(conv.user_id)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left ${activeConv === conv.user_id ? 'bg-[#FF6B00]/5 border-r-2 border-[#FF6B00]' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <img src={conv.avatar} alt={convName(conv)} className="w-12 h-12 rounded-full object-cover bg-[#1B1F27]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white truncate">{convName(conv)}</p>
                        {conv.timestamp && <span className="text-[10px] text-[#A0A0A0] shrink-0 ml-1">{conv.timestamp}</span>}
                      </div>
                      <p className="text-xs text-[#A0A0A0] truncate">{lastText(conv.last_message)}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="w-5 h-5 bg-[#FF6B00] text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{conv.unread}</span>
                    )}
                  </motion.button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${activeConv ? 'flex' : 'hidden md:flex'}`}>
            {activeConversation ? (
              <>
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                  <button onClick={() => setActiveConv(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/5">
                    <ArrowLeft className="w-5 h-5 text-[#A0A0A0] rtl:rotate-180" />
                  </button>
                  <img src={activeConversation.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-[#1B1F27]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{convName(activeConversation)}</p>
                    <p className="text-xs text-green-400">{t('ui.online_54f6')}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence>
                    {currentMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-12">
                        <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-4">
                          <Send className="w-8 h-8 text-[#FF6B00]" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{t('chat.start_chat')}</h3>
                        <p className="text-sm text-[#A0A0A0] max-w-xs">{t('chat.start_with', { name: convName(activeConversation) })}</p>
                      </div>
                    ) : (
                      currentMessages.map(msg => {
                        const isMe = msg.sender_id === user.id;
                        const isImage = msg.content.startsWith('[Image] ');
                        const imageUrl = isImage ? msg.content.replace('[Image] ', '') : '';
                        return (
                          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-[#FF6B00] text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'}`}>
                                {isImage ? (
                                  <img src={imageUrl} alt="" className="max-w-[200px] rounded-lg cursor-pointer" onClick={() => setViewerImage(imageUrl)} />
                                ) : (decodeText(msg.content, lang) ?? msg.content)}
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                                <span className="text-[10px] text-[#A0A0A0]">
                                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                {isMe && (msg.read ? <CheckCheck className="w-3 h-3 text-[#FF6B00]" /> : <Check className="w-3 h-3 text-[#A0A0A0]" />)}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {previewImage && (
                  <div className="px-4 py-2 border-t border-white/5">
                    <div className="relative inline-block">
                      <img src={previewImage} alt="Preview" className="h-20 rounded-lg" />
                      <button onClick={() => setPreviewImage(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                      <button onClick={() => handleSendImage(previewImage)} className="absolute -bottom-2 right-0 px-2 py-0.5 bg-[#FF6B00] text-white text-xs rounded-md">{t('ui.send_9496')}</button>
                    </div>
                  </div>
                )}

                <div className="p-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => galleryInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 shrink-0 relative">
                      <Image className="w-5 h-5 text-[#A0A0A0]" />
                      {isUploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#FF6B00] animate-spin" /></div>}
                    </button>
                    <button onClick={() => cameraInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 shrink-0">
                      <Camera className="w-5 h-5 text-[#A0A0A0]" />
                    </button>
                    <Input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyPress={handleKeyPress} placeholder={t('chat.type') || 'Type a message...'} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                    <Button onClick={handleSend} disabled={isSending || !messageText.trim()} size="sm" className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl w-10 h-10 p-0 shrink-0 disabled:opacity-50">
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-4"><Send className="w-8 h-8 text-[#FF6B00]" /></div>
                <h3 className="text-lg font-bold text-white mb-2">{t('chat.empty_title')}</h3>
                <p className="text-sm text-[#A0A0A0] max-w-xs">{t('chat.empty_desc')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen image viewer (works on iOS, no popup / data: navigation) */}
      <AnimatePresence>
        {viewerImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-3" onClick={() => setViewerImage(null)}>
            <button onClick={() => setViewerImage(null)} aria-label={t('common.close')}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" style={{ marginTop: 'env(safe-area-inset-top)' }}>
              <X className="w-5 h-5 text-white" />
            </button>
            <img src={viewerImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
