import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { uploadChatImage } from '@/services/storageService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Phone, Image, Check, CheckCheck, Loader2, Camera, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  last_message: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

// ─── localStorage Keys ───
const CONVS_KEY = 'wansniauto_conversations';
const MESSAGES_KEY = 'wansniauto_messages';

function loadConversationsFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

function saveConversationsToStorage(convs: Conversation[]) {
  localStorage.setItem(CONVS_KEY, JSON.stringify(convs));
}

function loadMessagesFromStorage(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return {};
}

function saveMessagesToStorage(msgs: Record<string, ChatMessage[]>) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
}

export function MessagesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const { t, dir } = useI18n();

  // Read driver contact info from navigation state
  const navState = location.state as { contactId?: string; contactName?: string; contactAvatar?: string } | null;

  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasProcessedNavState = useRef(false);

  // Separate refs for gallery vs camera
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>(loadConversationsFromStorage);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(loadMessagesFromStorage);

  // ─── Handle navigation from TripDetailsPage ───
  useEffect(() => {
    if (!user?.id) return;
    if (hasProcessedNavState.current) return;

    const contactId = navState?.contactId;
    const contactName = navState?.contactName;

    if (contactId && contactName) {
      hasProcessedNavState.current = true;

      const existingConv = conversations.find(c => c.user_id === contactId);
      if (!existingConv) {
        // Create new conversation for this driver
        const newConv: Conversation = {
          id: contactId,
          user_id: contactId,
          name: contactName,
          avatar: navState?.contactAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactId}`,
          last_message: t('chat.start_convo_short'),
          timestamp: t('chat.now') || 'Now',
          unread: 0,
          online: true,
        };
        const updatedConvs = [newConv, ...conversations];
        setConversations(updatedConvs);
        saveConversationsToStorage(updatedConvs);
      }
      setActiveConv(contactId);

      // Clear navigation state so refresh doesn't re-trigger
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [navState?.contactId, navState?.contactName, user?.id]);

  // ─── Load conversations from Supabase as fallback ───
  useEffect(() => {
    if (!user?.id) return;

    const localConvs = loadConversationsFromStorage();
    if (localConvs.length > 0) {
      setConversations(localConvs);
      return; // Already have local data
    }

    // Only fetch from Supabase if no local conversations exist
    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, avatar')
          .neq('id', user.id)
          .limit(20);

        if (error || !data || data.length === 0) {
          // No profiles found - keep empty, user can create convs by contacting drivers
          return;
        }

        const convs: Conversation[] = data.map((p: any) => ({
          id: p.id,
          user_id: p.id,
          name: p.name || 'User',
          avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name || p.id}`,
          last_message: t('chat.start_convo_short'),
          timestamp: '',
          unread: 0,
          online: Math.random() > 0.5,
        }));

        setConversations(convs);
        saveConversationsToStorage(convs);
      } catch { /* silent - keep empty */ }
    };

    loadFromSupabase();
  }, [user?.id]);

  // ─── Persist conversations whenever they change ───
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversationsToStorage(conversations);
    }
  }, [conversations]);

  // ─── Persist messages whenever they change ───
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);

  // ─── Load messages when conversation changes ───
  useEffect(() => {
    if (!user?.id || !activeConv) return;

    // Load from localStorage first
    const storedMessages = loadMessagesFromStorage();
    if (storedMessages[activeConv]) {
      setMessages(prev => ({ ...prev, [activeConv]: storedMessages[activeConv] }));
    }

    // Also try Supabase for any new messages
    const loadFromSupabase = async () => {
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeConv}),and(sender_id.eq.${activeConv},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (data && data.length > 0) {
          setMessages(prev => ({ ...prev, [activeConv]: data as ChatMessage[] }));
        }
      } catch { /* silent */ }
    };
    loadFromSupabase();

    // Subscribe to new messages via realtime
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          if (
            (msg.sender_id === user.id && msg.receiver_id === activeConv) ||
            (msg.sender_id === activeConv && msg.receiver_id === user.id)
          ) {
            setMessages(prev => {
              const updated = {
                ...prev,
                [activeConv]: [...(prev[activeConv] || []), msg],
              };
              saveMessagesToStorage(updated);
              return updated;
            });

            // Update conversation last_message
            setConversations(prevConvs => {
              const updated = prevConvs.map(c => {
                if (c.user_id === activeConv) {
                  return {
                    ...c,
                    last_message: msg.content.startsWith('[Image]') ? ('\u{1F4F7} ' + t('chat.type')) : msg.content,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  };
                }
                return c;
              });
              saveConversationsToStorage(updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => { void Promise.resolve(supabase.removeChannel(channel)); };
  }, [activeConv, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    if (activeConv) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages[activeConv || '']]);

  const activeConversation = conversations.find(c => c.user_id === activeConv);
  const currentMessages = activeConv ? (messages[activeConv] || []) : [];

  const handleSend = async () => {
    if (!messageText.trim() || !activeConv || !user?.id) return;
    setIsSending(true);

    const trimmedText = messageText.trim();
    const now = new Date().toISOString();
    const localMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      sender_id: user.id,
      receiver_id: activeConv,
      content: trimmedText,
      created_at: now,
      read: false,
    };

    // 1. Save locally immediately (instant feedback)
    setMessages(prev => {
      const updated = {
        ...prev,
        [activeConv]: [...(prev[activeConv] || []), localMsg],
      };
      saveMessagesToStorage(updated);
      return updated;
    });

    // Update conversation preview
    setConversations(prevConvs => {
      const updated = prevConvs.map(c => {
        if (c.user_id === activeConv) {
          return {
            ...c,
            last_message: trimmedText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return c;
      });
      saveConversationsToStorage(updated);
      return updated;
    });

    setMessageText('');

    // 2. Try Supabase
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeConv,
        content: trimmedText,
        read: false,
      });

      if (error) {
        console.log('Supabase message save failed (using localStorage fallback):', error.message);
      }
    } catch {
      console.log('Network error - message saved locally only');
    }

    setIsSending(false);
  };

  // Process image from either gallery or camera
  const processImage = async (file: File) => {
    if (!user?.id || !activeConv) return;

    setIsUploading(true);
    try {
      const url = await uploadChatImage(user.id, file);
      const now = new Date().toISOString();

      const localMsg: ChatMessage = {
        id: `img-${Date.now()}`,
        sender_id: user.id,
        receiver_id: activeConv,
        content: `[Image] ${url}`,
        created_at: now,
        read: false,
      };

      setMessages(prev => {
        const updated = { ...prev, [activeConv]: [...(prev[activeConv] || []), localMsg] };
        saveMessagesToStorage(updated);
        return updated;
      });

      // Update conversation preview
      setConversations(prevConvs => {
        const updated = prevConvs.map(c => {
          if (c.user_id === activeConv) {
            return {
              ...c,
              last_message: '\u{1F4F7} ' + t('chat.type'),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return c;
        });
        saveConversationsToStorage(updated);
        return updated;
      });

      // Try Supabase
      try {
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: activeConv,
          content: `[Image] ${url}`,
          read: false,
        });
      } catch { /* silent - already saved locally */ }
    } catch {
      // Fallback: use data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const localMsg: ChatMessage = {
          id: `img-${Date.now()}`,
          sender_id: user.id,
          receiver_id: activeConv,
          content: `[Image] ${dataUrl}`,
          created_at: new Date().toISOString(),
          read: false,
        };
        setMessages(prev => {
          const updated = { ...prev, [activeConv]: [...(prev[activeConv] || []), localMsg] };
          saveMessagesToStorage(updated);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
    setIsUploading(false);
  };

  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processImage(file);
  };

  const handleCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processImage(file);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      {/* Hidden inputs for image upload */}
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
                      {conv.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1B1F27]" />}
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
                  <div className="relative shrink-0">
                    <img src={activeConversation.avatar} alt={activeConversation.name} className="w-10 h-10 rounded-full object-cover bg-[#1B1F27]" />
                    {activeConversation.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#1B1F27]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activeConversation.name}</p>
                    <p className="text-xs text-[#A0A0A0]">{activeConversation.online ? t('chat.online') : t('chat.offline')}</p>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-white/5 shrink-0"><Phone className="w-4 h-4 text-[#A0A0A0]" /></button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence>
                    {currentMessages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
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
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-[#FF6B00] text-white rounded-br-md' : 'bg-white/5 text-white rounded-bl-md'}`}>
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

                {/* Input */}
                <div className="p-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {/* Gallery button */}
                    <button onClick={() => galleryInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 shrink-0 relative" title="Gallery">
                      <Image className="w-5 h-5 text-[#A0A0A0]" />
                      {isUploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#FF6B00] animate-spin" /></div>}
                    </button>
                    {/* Camera button */}
                    <button onClick={() => cameraInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 shrink-0" title="Camera">
                      <Camera className="w-5 h-5 text-[#A0A0A0]" />
                    </button>
                    <Input
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={t('chat.type')}
                      className="bg-[#0F1115] border-white/10 text-white rounded-xl"
                    />
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
