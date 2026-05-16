import { useState, useRef, useEffect, useCallback } from 'react';
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

// Get user-scoped storage key
function getStorageKey(userId: string, suffix: string) {
  return `wansni_${userId}_${suffix}`;
}

function loadConversations(userId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, 'convs'));
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

function saveConversations(userId: string, convs: Conversation[]) {
  localStorage.setItem(getStorageKey(userId, 'convs'), JSON.stringify(convs));
}

function loadMessages(userId: string): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, 'msgs'));
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return {};
}

function saveMessages(userId: string, msgs: Record<string, ChatMessage[]>) {
  localStorage.setItem(getStorageKey(userId, 'msgs'), JSON.stringify(msgs));
}

// Build conversations from messages (only people user actually chatted with)
function buildConversationsFromMessages(
  userId: string,
  msgs: Record<string, ChatMessage[]>,
  contactNames: Record<string, { name: string; avatar: string }>
): Conversation[] {
  const convMap: Record<string, Conversation> = {};

  Object.entries(msgs).forEach(([convKey, msgList]) => {
    const otherId = convKey; // conv key = other user's ID
    const sorted = [...msgList].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const lastMsg = sorted[sorted.length - 1];
    if (!lastMsg) return;

    const unread = sorted.filter(m => m.receiver_id === userId && !m.read).length;
    const contact = contactNames[otherId] || {
      name: 'User',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`
    };

    convMap[otherId] = {
      user_id: otherId,
      name: contact.name,
      avatar: contact.avatar,
      last_message: lastMsg.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : lastMsg.content,
      timestamp: lastMsg.created_at
        ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      unread,
    };
  });

  return Object.values(convMap).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function MessagesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUnreadCount, incrementUnread } = useStore();
  const { t, dir } = useI18n();

  const navState = location.state as {
    contactId?: string; contactName?: string; contactAvatar?: string;
  } | null;

  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasProcessedNavState = useRef(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [contactNames, setContactNames] = useState<Record<string, { name: string; avatar: string }>>({});

  // Per-user storage
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    user?.id ? loadConversations(user.id) : []
  );
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() =>
    user?.id ? loadMessages(user.id) : {}
  );

  // ─── Fetch contact info for all conversation partners ───
  const fetchContactInfo = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar')
        .in('id', ids);
      if (data) {
        const map: Record<string, { name: string; avatar: string }> = {};
        data.forEach((p: any) => {
          map[p.id] = {
            name: p.name || 'User',
            avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`
          };
        });
        setContactNames(prev => ({ ...prev, ...map }));
      }
    } catch { /* silent */ }
  }, []);

  // ─── Handle navigation from TripDetailsPage ───
  useEffect(() => {
    if (!user?.id) return;
    if (hasProcessedNavState.current) return;

    const { contactId, contactName, contactAvatar } = navState || {};
    if (contactId && contactName) {
      hasProcessedNavState.current = true;

      // Save contact info
      setContactNames(prev => ({
        ...prev,
        [contactId]: { name: contactName, avatar: contactAvatar || prev[contactId]?.avatar || '' }
      }));

      // Ensure conversation exists
      setConversations(prev => {
        if (prev.find(c => c.user_id === contactId)) return prev;
        const newConv: Conversation = {
          user_id: contactId,
          name: contactName,
          avatar: contactAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactId}`,
          last_message: t('chat.start_convo_short') || 'Start a conversation...',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
        };
        const updated = [newConv, ...prev];
        saveConversations(user.id, updated);
        return updated;
      });
      setActiveConv(contactId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [navState?.contactId, navState?.contactName, user?.id]);

  // ─── Load from Supabase on mount ───
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        // Fetch all messages where user is sender OR receiver
        const { data: allMsgs } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true });

        if (allMsgs && allMsgs.length > 0) {
          // Group by conversation partner
          const grouped: Record<string, ChatMessage[]> = {};
          const partnerIds = new Set<string>();

          allMsgs.forEach((msg: any) => {
            const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            partnerIds.add(partnerId);
            if (!grouped[partnerId]) grouped[partnerId] = [];
            grouped[partnerId].push(msg);
          });

          // Fetch contact names
          await fetchContactInfo(Array.from(partnerIds));

          // Save and build conversations
          saveMessages(user.id, grouped);
          setMessages(grouped);

          const names: Record<string, { name: string; avatar: string }> = {};
          partnerIds.forEach(id => {
            names[id] = contactNames[id] || {
              name: 'User',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
            };
          });
          const convs = buildConversationsFromMessages(user.id, grouped, names);
          setConversations(convs);
          saveConversations(user.id, convs);

          // Count unread
          const totalUnread = allMsgs.filter(
            (m: any) => m.receiver_id === user.id && !m.read
          ).length;
          setUnreadCount(totalUnread);
        }
      } catch (err) {
        console.log('[Messages] Load error:', err);
      }
    };

    load();
  }, [user?.id]);

  // ─── Supabase Realtime subscription ───
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          // Only process if this message involves the current user
          if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return;

          const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

          setMessages(prev => {
            const existing = prev[partnerId] || [];
            // Avoid duplicates
            if (existing.find(m => m.id === msg.id)) return prev;
            const updated = { ...prev, [partnerId]: [...existing, msg] };
            saveMessages(user.id, updated);
            return updated;
          });

          // If message is from someone else, increment unread
          if (msg.sender_id !== user.id && msg.receiver_id === user.id) {
            incrementUnread();
            toast.success(`New message`);
          }

          // Update conversations
          setConversations(prev => {
            const existing = prev.find(c => c.user_id === partnerId);
            if (existing) {
              return prev.map(c =>
                c.user_id === partnerId
                  ? {
                      ...c,
                      last_message: msg.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : msg.content,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      unread: msg.sender_id !== user.id && msg.receiver_id === user.id && activeConv !== partnerId
                        ? c.unread + 1 : c.unread,
                    }
                  : c
              );
            } else {
              // New conversation
              const contact = contactNames[partnerId] || {
                name: 'User',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`
              };
              return [{
                user_id: partnerId,
                name: contact.name,
                avatar: contact.avatar,
                last_message: msg.content.startsWith('[Image]') ? '\u{1F4F7} Photo' : msg.content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                unread: msg.sender_id !== user.id ? 1 : 0,
              }, ...prev];
            }
          });
        }
      )
      .subscribe();

    return () => { void Promise.resolve(supabase.removeChannel(channel)); };
  }, [user?.id, activeConv, contactNames]);

  // ─── Mark messages as read when opening conversation ───
  useEffect(() => {
    if (!user?.id || !activeConv) return;

    // Mark local messages as read
    setMessages(prev => {
      const msgs = prev[activeConv];
      if (!msgs) return prev;
      const updated = msgs.map(m =>
        m.receiver_id === user.id && !m.read ? { ...m, read: true } : m
      );
      const newState = { ...prev, [activeConv]: updated };
      saveMessages(user.id, newState);
      return newState;
    });

    // Update unread count in conversations
    setConversations(prev =>
      prev.map(c => c.user_id === activeConv ? { ...c, unread: 0 } : c)
    );

    // Mark as read in Supabase
    supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', activeConv)
      .eq('read', false)
      .then(() => { /* silent */ });
  }, [activeConv, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    if (activeConv) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages[activeConv || '']?.length]);

  const activeConversation = conversations.find(c => c.user_id === activeConv);
  const currentMessages = activeConv ? (messages[activeConv] || []) : [];

  const handleSend = async () => {
    if (!messageText.trim() || !activeConv || !user?.id) return;
    setIsSending(true);

    const trimmedText = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    const localMsg: ChatMessage = {
      id: tempId, sender_id: user.id, receiver_id: activeConv,
      content: trimmedText, created_at: now, read: false,
    };

    // 1. Save locally
    setMessages(prev => {
      const updated = { ...prev, [activeConv]: [...(prev[activeConv] || []), localMsg] };
      saveMessages(user.id, updated);
      return updated;
    });

    // Update conversation preview
    setConversations(prev => {
      const existing = prev.find(c => c.user_id === activeConv);
      let updated: Conversation[];
      if (existing) {
        updated = [
          { ...existing, last_message: trimmedText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread: 0 },
          ...prev.filter(c => c.user_id !== activeConv)
        ];
      } else {
        const contact = contactNames[activeConv] || {
          name: activeConversation?.name || 'User',
          avatar: activeConversation?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv}`
        };
        updated = [{
          user_id: activeConv, name: contact.name, avatar: contact.avatar,
          last_message: trimmedText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread: 0
        }, ...prev];
      }
      saveConversations(user.id, updated);
      return updated;
    });

    setMessageText('');

    // 2. Save to Supabase
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: user.id, receiver_id: activeConv,
        content: trimmedText, read: false,
      }).select('id').single();

      if (error) {
        console.log('Supabase save failed:', error.message);
      } else if (data) {
        // Update temp ID with real ID
        setMessages(prev => {
          const msgs = prev[activeConv] || [];
          const updated = msgs.map(m => m.id === tempId ? { ...m, id: data.id } : m);
          const newState = { ...prev, [activeConv]: updated };
          saveMessages(user.id, newState);
          return newState;
        });
      }
    } catch {
      console.log('Network error - saved locally only');
    }

    setIsSending(false);
  };

  const handleSendImage = async (dataUrl: string) => {
    if (!activeConv || !user?.id) return;
    setIsUploading(true);

    const tempId = `img-${Date.now()}`;
    const now = new Date().toISOString();

    const localMsg: ChatMessage = {
      id: tempId, sender_id: user.id, receiver_id: activeConv,
      content: `[Image] ${dataUrl}`, created_at: now, read: false,
    };

    setMessages(prev => {
      const updated = { ...prev, [activeConv]: [...(prev[activeConv] || []), localMsg] };
      saveMessages(user.id, updated);
      return updated;
    });

    setConversations(prev => {
      const existing = prev.find(c => c.user_id === activeConv);
      if (!existing) return prev;
      const updated = [
        { ...existing, last_message: '\u{1F4F7} Photo', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ...prev.filter(c => c.user_id !== activeConv)
      ];
      saveConversations(user.id, updated);
      return updated;
    });

    // Save to Supabase
    try {
      await supabase.from('messages').insert({
        sender_id: user.id, receiver_id: activeConv,
        content: `[Image] ${dataUrl}`, read: false,
      });
    } catch { /* silent */ }

    setIsUploading(false);
    setPreviewImage(null);
  };

  const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) setPreviewImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) handleSendImage(dataUrl);
    };
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
          {/* Conversations List */}
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
                    className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left ${
                      activeConv === conv.user_id ? 'bg-[#FF6B00]/5 border-r-2 border-[#FF6B00]' : ''
                    }`}
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
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                  <button onClick={() => setActiveConv(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/5">
                    <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
                  </button>
                  <img src={activeConversation.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-[#1B1F27]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activeConversation.name}</p>
                    <p className="text-xs text-[#A0A0A0]">{t('chat.tap_call')}</p>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-white/5 shrink-0"><Phone className="w-4 h-4 text-[#A0A0A0]" /></button>
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
                        <p className="text-sm text-[#A0A0A0] max-w-xs">{t('chat.send_msg')}</p>
                      </div>
                    ) : (
                      currentMessages.map(msg => {
                        const isMe = msg.sender_id === user.id;
                        const isImage = msg.content.startsWith('[Image] ');
                        const imageUrl = isImage ? msg.content.replace('[Image] ', '') : '';
                        return (
                          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                                isMe
                                  ? 'bg-[#FF6B00] text-white rounded-br-md'
                                  : 'bg-white/10 text-white rounded-bl-md border border-white/5'
                              }`}>
                                {isImage ? (
                                  <img src={imageUrl} alt="Shared" className="max-w-[200px] rounded-lg cursor-pointer" onClick={() => window.open(imageUrl, '_blank')} />
                                ) : (
                                  msg.content
                                )}
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
                      <button onClick={() => setPreviewImage(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <button onClick={() => handleSendImage(previewImage)} className="absolute -bottom-2 right-0 px-2 py-0.5 bg-[#FF6B00] text-white text-xs rounded-md">
                        Send
                      </button>
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
