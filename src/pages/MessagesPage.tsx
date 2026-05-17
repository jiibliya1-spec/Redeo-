import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Phone, Image, Check, CheckCheck, Loader2, Camera, User, X
} from 'lucide-react';

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
}

/* ─── per-user storage helpers ─── */
function storageKey(uid: string, suffix: string) { return `wansni_${uid}_${suffix}`; }

function loadConvs(uid: string): Conversation[] {
  try { const raw = localStorage.getItem(storageKey(uid, 'convs')); if (raw) return JSON.parse(raw); } catch { /* silent */ } return [];
}
function saveConvs(uid: string, c: Conversation[]) { localStorage.setItem(storageKey(uid, 'convs'), JSON.stringify(c)); }

function loadMsgs(uid: string): Record<string, ChatMessage[]> {
  try { const raw = localStorage.getItem(storageKey(uid, 'msgs')); if (raw) return JSON.parse(raw); } catch { /* silent */ } return {};
}
function saveMsgs(uid: string, m: Record<string, ChatMessage[]>) { localStorage.setItem(storageKey(uid, 'msgs'), JSON.stringify(m)); }

function buildConvs(uid: string, msgs: Record<string, ChatMessage[]>, names: Record<string, { name: string; avatar: string }>): Conversation[] {
  const map: Record<string, Conversation> = {};
  Object.entries(msgs).forEach(([key, list]) => {
    const last = [...list].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)).at(-1);
    if (!last) return;
    const c = names[key] || { name: 'User', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${key}` };
    map[key] = {
      user_id: key, name: c.name, avatar: c.avatar,
      last_message: last.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : last.content,
      timestamp: last.created_at ? new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      unread: list.filter(m => m.receiver_id === uid && !m.read).length,
    };
  });
  return Object.values(map).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

export function MessagesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUnreadCount, incrementUnread } = useStore();
  const { t, dir } = useI18n();

  const navState = (location.state || {}) as {
    contactId?: string; contactName?: string; contactAvatar?: string;
  };

  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [contactNames, setContactNames] = useState<Record<string, { name: string; avatar: string }>>({});

  const [conversations, setConversations] = useState<Conversation[]>(() => user?.id ? loadConvs(user.id) : []);
  const [messages, setMessages]     = useState<Record<string, ChatMessage[]>>(() => user?.id ? loadMsgs(user.id) : {});

  /* ════════════════════════════════════════════
     1. HANDLE NAVIGATION FROM OTHER PAGES
     (TripDetails → contact driver, etc.)
     ════════════════════════════════════════════ */
  useEffect(() => {
    if (!user?.id) return;
    const { contactId, contactName, contactAvatar } = navState;
    if (!contactId || contactId === user.id) {
      // Don't chat with yourself!
      if (contactId === user.id) {
        toast.error('Cannot chat with yourself!');
        navigate('/messages', { replace: true, state: {} });
      }
      return;
    }

    // Save contact info
    const name = contactName || 'User';
    const avatar = contactAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactId}`;
    setContactNames(prev => ({ ...prev, [contactId]: { name, avatar } }));

    // Create conversation if it doesn't exist
    setConversations(prev => {
      if (prev.find(c => c.user_id === contactId)) return prev;
      const newConv: Conversation = {
        user_id: contactId, name, avatar,
        last_message: t('chat.start_convo_short') || 'Start a conversation...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
      };
      const updated = [newConv, ...prev];
      saveConvs(user.id, updated);
      return updated;
    });

    // Activate the conversation
    setActiveConv(contactId);

    // Clear nav state (replace so back button doesn't re-trigger)
    navigate('/messages', { replace: true, state: {} });
  }, [navState?.contactId, user?.id]);

  /* ════════════════════════════════════════════
     2. LOAD MESSAGES FROM SUPABASE ON MOUNT
     ════════════════════════════════════════════ */
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const { data: allMsgs } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true });

        if (allMsgs && allMsgs.length > 0) {
          const grouped: Record<string, ChatMessage[]> = {};
          const partnerIds = new Set<string>();

          allMsgs.forEach((msg: any) => {
            const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            // Prevent self-messages from appearing
            if (partnerId === user.id) return;
            partnerIds.add(partnerId);
            if (!grouped[partnerId]) grouped[partnerId] = [];
            grouped[partnerId].push(msg);
          });

          // Fetch contact names
          if (partnerIds.size > 0) {
            try {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, avatar')
                .in('id', Array.from(partnerIds));
              if (profiles) {
                const map: Record<string, { name: string; avatar: string }> = {};
                profiles.forEach((p: any) => {
                  map[p.id] = { name: p.name || 'User', avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}` };
                });
                setContactNames(map);
                const convs = buildConvs(user.id, grouped, map);
                setConversations(convs);
                saveConvs(user.id, convs);
              }
            } catch { /* silent */ }
          }

          saveMsgs(user.id, grouped);
          setMessages(grouped);

          const totalUnread = allMsgs.filter((m: any) => m.receiver_id === user.id && !m.read).length;
          setUnreadCount(totalUnread);
        }
      } catch (err) { console.log('[Messages] Load error:', err); }
    };

    load();
  }, [user?.id, setUnreadCount]);

  /* ════════════════════════════════════════════
     3. SUPABASE REALTIME SUBSCRIPTION
     ════════════════════════════════════════════ */
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const msg = payload.new as ChatMessage;
        // Ignore self-messages from realtime (already handled locally)
        if (msg.sender_id === user.id) return;
        // Only process messages sent TO me
        if (msg.receiver_id !== user.id) return;

        const partnerId = msg.sender_id;

        setMessages(prev => {
          const existing = prev[partnerId] || [];
          if (existing.find(m => m.id === msg.id)) return prev;
          const updated = { ...prev, [partnerId]: [...existing, msg] };
          saveMsgs(user.id, updated);
          return updated;
        });

        incrementUnread();

        // Update or create conversation
        setConversations(prev => {
          const existing = prev.find(c => c.user_id === partnerId);
          if (existing) {
            return prev.map(c =>
              c.user_id === partnerId
                ? { ...c, last_message: msg.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : msg.content, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread: activeConv === partnerId ? 0 : c.unread + 1 }
                : c
            );
          }
          return [{
            user_id: partnerId,
            name: contactNames[partnerId]?.name || 'User',
            avatar: contactNames[partnerId]?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`,
            last_message: msg.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : msg.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: 1,
          }, ...prev];
        });
      })
      .subscribe();

    return () => { void Promise.resolve(supabase.removeChannel(channel)); };
  }, [user?.id, activeConv, contactNames, incrementUnread]);

  /* ════════════════════════════════════════════
     4. MARK MESSAGES AS READ
     ════════════════════════════════════════════ */
  useEffect(() => {
    if (!user?.id || !activeConv) return;

    setMessages(prev => {
      const msgs = prev[activeConv];
      if (!msgs) return prev;
      const updated = msgs.map(m => m.receiver_id === user.id && !m.read ? { ...m, read: true } : m);
      const newState = { ...prev, [activeConv]: updated };
      saveMsgs(user.id, newState);
      return newState;
    });

    setConversations(prev => prev.map(c => c.user_id === activeConv ? { ...c, unread: 0 } : c));

    supabase.from('messages').update({ read: true }).eq('receiver_id', user.id).eq('sender_id', activeConv).eq('read', false).then(() => { /* silent */ });
  }, [activeConv, user?.id]);

  /* ─── Scroll to bottom ─── */
  useEffect(() => {
    if (activeConv) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[activeConv || '']?.length, activeConv]);

  const activeConversation = conversations.find(c => c.user_id === activeConv);
  const currentMessages = activeConv ? (messages[activeConv] || []) : [];

  /* ════════════════════════════════════════════
     5. SEND TEXT MESSAGE
     ════════════════════════════════════════════ */
  const handleSend = async () => {
    if (!messageText.trim() || !activeConv || !user?.id) return;
    // Prevent self-chat
    if (activeConv === user.id) { toast.error('Cannot message yourself!'); return; }

    setIsSending(true);
    const text = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    const localMsg: ChatMessage = {
      id: tempId, sender_id: user.id, receiver_id: activeConv,
      content: text, created_at: now, read: false,
    };

    // 1. Update UI immediately
    setMessages(prev => {
      const updated = { ...prev, [activeConv]: [...(prev[activeConv] || []), localMsg] };
      saveMsgs(user.id, updated);
      return updated;
    });

    setConversations(prev => {
      const existing = prev.find(c => c.user_id === activeConv);
      let updated: Conversation[];
      if (existing) {
        updated = [{ ...existing, last_message: text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread: 0 }, ...prev.filter(c => c.user_id !== activeConv)];
      } else {
        const c = contactNames[activeConv] || { name: activeConversation?.name || 'User', avatar: activeConversation?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv}` };
        updated = [{ user_id: activeConv, name: c.name, avatar: c.avatar, last_message: text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread: 0 }, ...prev];
      }
      saveConvs(user.id, updated);
      return updated;
    });

    setMessageText('');

    // 2. Save to Supabase
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: user.id, receiver_id: activeConv, content: text, read: false,
      }).select('id').single();

      if (error) { console.log('Supabase save failed:', error.message); }
      else if (data) {
        setMessages(prev => {
          const msgs = prev[activeConv] || [];
          const updated = msgs.map(m => m.id === tempId ? { ...m, id: data.id } : m);
          const newState = { ...prev, [activeConv]: updated };
          saveMsgs(user.id, newState);
          return newState;
        });
      }
    } catch { console.log('Network error - saved locally only'); }

    setIsSending(false);
  };

  /* ════════════════════════════════════════════
     6. SEND IMAGE
     ════════════════════════════════════════════ */
  const handleSendImage = async (dataUrl: string) => {
    if (!activeConv || !user?.id) return;
    if (activeConv === user.id) { toast.error('Cannot message yourself!'); return; }

    setIsUploading(true);
    const tempId = `img-${Date.now()}`;
    const now = new Date().toISOString();

    const localMsg: ChatMessage = {
      id: tempId, sender_id: user.id, receiver_id: activeConv,
      content: `[Image] ${dataUrl}`, created_at: now, read: false,
    };

    setMessages(prev => {
      const updated = { ...prev, [activeConv]: [...(prev[activeConv] || []), localMsg] };
      saveMsgs(user.id, updated);
      return updated;
    });

    setConversations(prev => {
      const existing = prev.find(c => c.user_id === activeConv);
      if (!existing) return prev;
      const updated = [{ ...existing, last_message: '\u{1F4F7} Photo', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev.filter(c => c.user_id !== activeConv)];
      saveConvs(user.id, updated);
      return updated;
    });

    try {
      await supabase.from('messages').insert({
        sender_id: user.id, receiver_id: activeConv, content: `[Image] ${dataUrl}`, read: false,
      });
    } catch { /* silent */ }

    setIsUploading(false);
    setPreviewImage(null);
  };

  /* ─── Image handlers ─── */
  const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; if (url) setPreviewImage(url); };
    reader.readAsDataURL(file);
  };

  const handleCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; if (url) handleSendImage(url); };
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
                  <p className="text-xs text-[#A0A0A0] mt-1">Start a chat from a trip detail page</p>
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
                      <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full object-cover bg-[#1B1F27]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white truncate">{conv.name}</p>
                        {conv.timestamp && <span className="text-[10px] text-[#A0A0A0] shrink-0 ml-1">{conv.timestamp}</span>}
                      </div>
                      <p className="text-xs text-[#A0A0A0] truncate">{conv.last_message}</p>
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
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                  <button onClick={() => setActiveConv(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/5">
                    <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
                  </button>
                  <img src={activeConversation.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-[#1B1F27]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activeConversation.name}</p>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-white/5 shrink-0" onClick={() => { toast.info('Call feature coming soon'); }}>
                    <Phone className="w-4 h-4 text-[#A0A0A0]" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence>
                    {currentMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-12">
                        <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-4">
                          <Send className="w-8 h-8 text-[#FF6B00]" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{t('chat.start_chat')}</h3>
                        <p className="text-sm text-[#A0A0A0] max-w-xs">Send a message to start chatting with {activeConversation.name}</p>
                      </div>
                    ) : (
                      currentMessages.map(msg => {
                        const isMe = msg.sender_id === user.id;
                        const isImage = msg.content.startsWith('[Image] ');
                        const imageUrl = isImage ? msg.content.replace('[Image] ', '') : '';
                        return (
                          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-[#FF6B00] text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md border border-white/5'}`}>
                                {isImage ? (
                                  <img src={imageUrl} alt="Shared" className="max-w-[200px] rounded-lg cursor-pointer" onClick={() => window.open(imageUrl, '_blank')} />
                                ) : msg.content}
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

                {/* Image Preview */}
                {previewImage && (
                  <div className="px-4 py-2 border-t border-white/5">
                    <div className="relative inline-block">
                      <img src={previewImage} alt="Preview" className="h-20 rounded-lg" />
                      <button onClick={() => setPreviewImage(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                      <button onClick={() => handleSendImage(previewImage)} className="absolute -bottom-2 right-0 px-2 py-0.5 bg-[#FF6B00] text-white text-xs rounded-md">Send</button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => galleryInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 shrink-0 relative" title="Gallery">
                      <Image className="w-5 h-5 text-[#A0A0A0]" />
                      {isUploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#FF6B00] animate-spin" /></div>}
                    </button>
                    <button onClick={() => cameraInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 shrink-0" title="Camera">
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
    </div>
  );
}
