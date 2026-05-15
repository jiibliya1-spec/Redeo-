import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { uploadChatImage } from '@/services/storageService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Send, Phone, Image, Check, CheckCheck, Loader2 } from 'lucide-react';

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

export function MessagesPage() {
  const { user } = useStore();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversations from profiles (other users)
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  // Load conversations (other profiles)
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .then(({ data }) => {
        if (!data) return;
        const convs: Conversation[] = data.map((p: any, i: number) => ({
          id: p.id,
          user_id: p.id,
          name: p.name,
          avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
          last_message: i === 0 ? 'See you at the pickup point tomorrow.' : i === 1 ? 'The trip was great, thanks!' : 'Is there WiFi in your car?',
          timestamp: i === 0 ? '08:15 AM' : i === 1 ? 'Yesterday' : '2 days ago',
          unread: i === 0 ? 1 : 0,
          online: i % 2 === 0,
        }));
        setConversations(convs);
      });
  }, [user?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!user?.id || !activeConv) return;

    const otherId = activeConv;

    supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(prev => ({ ...prev, [activeConv]: data as ChatMessage[] }));
        }
      });

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          if (
            (msg.sender_id === user.id && msg.receiver_id === otherId) ||
            (msg.sender_id === otherId && msg.receiver_id === user.id)
          ) {
            setMessages(prev => ({
              ...prev,
              [activeConv]: [...(prev[activeConv] || []), msg],
            }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeConv,
      content: messageText.trim(),
      read: false,
    });

    if (error) {
      toast?.error?.('Failed to send message');
    } else {
      setMessageText('');
    }
    setIsSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !activeConv) return;

    setIsUploading(true);
    try {
      const url = await uploadChatImage(user.id, file);
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeConv,
        content: `[Image] ${url}`,
        read: false,
      });
    } catch {
      // silent fail
    }
    setIsUploading(false);
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
        <p className="text-[#A0A0A0]">Please sign in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-5rem)]">
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 h-full overflow-hidden flex">
          {/* Conversations List */}
          <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-white/5"><h2 className="text-lg font-bold text-white">Messages</h2></div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv, i) => (
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
                  <div className="relative">
                    <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full object-cover bg-[#1B1F27]" />
                    {conv.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1B1F27]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">{conv.name}</p>
                      <span className="text-xs text-[#A0A0A0] shrink-0">{conv.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#A0A0A0] truncate">{conv.last_message}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 bg-[#FF6B00] text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{conv.unread}</span>
                  )}
                </motion.button>
              ))}
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
                  <div className="relative">
                    <img src={activeConversation.avatar} alt={activeConversation.name} className="w-10 h-10 rounded-full object-cover bg-[#1B1F27]" />
                    {activeConversation.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#1B1F27]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{activeConversation.name}</p>
                    <p className="text-xs text-[#A0A0A0]">{activeConversation.online ? 'Online' : 'Offline'}</p>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-white/5"><Phone className="w-4 h-4 text-[#A0A0A0]" /></button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence>
                    {currentMessages.map(msg => {
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
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (msg.read ? <CheckCheck className="w-3 h-3 text-[#FF6B00]" /> : <Check className="w-3 h-3 text-[#A0A0A0]" />)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-white/5 shrink-0 relative">
                      <Image className="w-5 h-5 text-[#A0A0A0]" />
                      {isUploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#FF6B00] animate-spin" /></div>}
                    </button>
                    <Input
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
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
                <h3 className="text-lg font-bold text-white mb-2">Your Messages</h3>
                <p className="text-sm text-[#A0A0A0] max-w-xs">Select a conversation to start chatting.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
