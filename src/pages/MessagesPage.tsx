import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_USERS } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Phone, MoreVertical, Image, Smile, Check, CheckCheck } from 'lucide-react';

interface ChatMessage { id: string; sender_id: string; content: string; timestamp: string; read: boolean; }
interface Conversation { id: string; user_id: string; name: string; avatar: string; last_message: string; timestamp: string; unread: number; online: boolean; }

export function MessagesPage() {
  // user data available if needed
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [conversations] = useState<Conversation[]>([
    { id: 'c1', user_id: 'u1', name: MOCK_USERS[0].name, avatar: MOCK_USERS[0].avatar ?? '/images/avatar-driver-1.jpg', last_message: 'See you at the pickup point tomorrow.', timestamp: '08:15 AM', unread: 1, online: true },
    { id: 'c2', user_id: 'u2', name: MOCK_USERS[1].name, avatar: MOCK_USERS[1].avatar ?? '/images/avatar-driver-2.jpg', last_message: 'The trip was great, thanks!', timestamp: 'Yesterday', unread: 0, online: false },
    { id: 'c3', user_id: 'u3', name: MOCK_USERS[2].name, avatar: MOCK_USERS[2].avatar ?? '/images/avatar-driver-3.jpg', last_message: 'Is there WiFi in your car?', timestamp: '2 days ago', unread: 0, online: true },
  ]);

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    c1: [
      { id: 'm1', sender_id: 'u4', content: 'Hi! Is there space for a small bag?', timestamp: '08:05', read: true },
      { id: 'm2', sender_id: 'u1', content: 'Yes, of course! Plenty of luggage space.', timestamp: '08:10', read: true },
      { id: 'm3', sender_id: 'u4', content: 'See you at the pickup point tomorrow.', timestamp: '08:15', read: false },
    ],
    c2: [
      { id: '1', sender_id: 'u2', content: 'Thanks for riding with me!', timestamp: '10:00', read: true },
      { id: '2', sender_id: 'current-user', content: 'Thank you for the smooth ride!', timestamp: '10:05', read: true },
      { id: '3', sender_id: 'u2', content: 'The trip was great, thanks!', timestamp: '10:10', read: true },
    ],
    c3: [
      { id: '1', sender_id: 'u3', content: 'Hello! I saw your trip to Fes.', timestamp: '09:00', read: true },
      { id: '2', sender_id: 'current-user', content: 'Hi! Yes, I\'m going this Friday.', timestamp: '09:05', read: true },
      { id: '3', sender_id: 'u3', content: 'Is there WiFi in your car?', timestamp: '09:10', read: false },
    ],
  });

  const activeConversation = conversations.find(c => c.id === activeConv);
  const currentMessages = activeConv ? messages[activeConv] || [] : [];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentMessages]);

  const handleSend = () => {
    if (!messageText.trim() || !activeConv) return;
    const newMsg: ChatMessage = { id: `m${Date.now()}`, sender_id: 'current-user', content: messageText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false };
    setMessages(prev => ({ ...prev, [activeConv]: [...(prev[activeConv] || []), newMsg] }));
    setMessageText('');
  };

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-5rem)]">
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 h-full overflow-hidden flex">
          {/* Conversations */}
          <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-white/5"><h2 className="text-lg font-bold text-white">Messages</h2></div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv, i) => (
                <motion.button key={conv.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setActiveConv(conv.id)} className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left ${activeConv === conv.id ? 'bg-[#FF6B00]/5 border-r-2 border-[#FF6B00]' : ''}`}>
                  <div className="relative">
                    <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full object-cover" />
                    {conv.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1B1F27]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium text-white truncate">{conv.name}</p><span className="text-xs text-[#A0A0A0] shrink-0">{conv.timestamp}</span></div>
                    <p className="text-xs text-[#A0A0A0] truncate">{conv.last_message}</p>
                  </div>
                  {conv.unread > 0 && <span className="w-5 h-5 bg-[#FF6B00] text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{conv.unread}</span>}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className={`flex-1 flex flex-col ${activeConv ? 'flex' : 'hidden md:flex'}`}>
            {activeConversation ? (
              <>
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                  <button onClick={() => setActiveConv(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/5"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></button>
                  <div className="relative">
                    <img src={activeConversation.avatar} alt={activeConversation.name} className="w-10 h-10 rounded-full object-cover" />
                    {activeConversation.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#1B1F27]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{activeConversation.name}</p>
                    <p className="text-xs text-[#A0A0A0]">{activeConversation.online ? 'Online' : 'Offline'}</p>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-white/5"><Phone className="w-4 h-4 text-[#A0A0A0]" /></button>
                  <button className="p-2 rounded-xl hover:bg-white/5"><MoreVertical className="w-4 h-4 text-[#A0A0A0]" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence>
                    {currentMessages.map(msg => {
                      const isMe = msg.sender_id === 'current-user';
                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-[#FF6B00] text-white rounded-br-md' : 'bg-white/5 text-white rounded-bl-md'}`}>{msg.content}</div>
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                              <span className="text-[10px] text-[#A0A0A0]">{msg.timestamp}</span>
                              {isMe && (msg.read ? <CheckCheck className="w-3 h-3 text-[#FF6B00]" /> : <Check className="w-3 h-3 text-[#A0A0A0]" />)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-xl hover:bg-white/5 shrink-0"><Image className="w-5 h-5 text-[#A0A0A0]" /></button>
                    <button className="p-2.5 rounded-xl hover:bg-white/5 shrink-0"><Smile className="w-5 h-5 text-[#A0A0A0]" /></button>
                    <Input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder="Type a message..." className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                    <Button onClick={handleSend} size="sm" className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl w-10 h-10 p-0 shrink-0"><Send className="w-4 h-4" /></Button>
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
