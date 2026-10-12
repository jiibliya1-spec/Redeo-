import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { resolveAvatar } from '@/lib/utils';
// motion
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  receiver_id: string;
  receiver_name: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function AdminMessages() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filtered, setFiltered] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    let result = messages;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.sender_name.toLowerCase().includes(q) ||
          m.receiver_name.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [messages, search]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(200);
      const { data: users } = await supabase.from('profiles').select('id, name, avatar');

      const combined = (msgs || []).map((m: any) => {
        const sender = users?.find((u: any) => u.id === m.sender_id);
        const receiver = users?.find((u: any) => u.id === m.receiver_id);
        return {
          ...m,
          sender_name: sender?.name || t('adm.unknown'),
          sender_avatar: resolveAvatar(sender?.avatar, m.sender_id),
          receiver_name: receiver?.name || t('adm.unknown'),
        };
      });

      setMessages(combined);
    } catch (err) {
      console.error('Load messages error:', err);
    }
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{t('adm.messages_41de')}</h2>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{t('adm.all_chat_messages_between_users_c648')}</p>
        </div>
        <p className="text-sm text-[#A0A0A0]">{t('adm.messages_total',{n:messages.length})}</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adm.search_messages_1c10')}
          className="pl-11 bg-[#111318] border-white/5 text-white rounded-xl h-11"
        />
      </div>

      <div className="bg-[#111318] rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MessageSquare className="w-10 h-10 text-[#A0A0A0] mb-3" />
            <p className="text-sm text-[#A0A0A0]">{t('adm.no_messages_found_14c1')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((msg) => (
              <div key={msg.id} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                <img src={msg.sender_avatar} alt="" className="w-9 h-9 rounded-full bg-[#1B1F27] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{msg.sender_name}</span>
                    <span className="text-[#A0A0A0]">→</span>
                    <span className="text-sm text-[#A0A0A0]">{msg.receiver_name}</span>
                    <span className="text-[10px] text-[#A0A0A0] ml-auto">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#A0A0A0] line-clamp-2">{msg.content}</p>
                </div>
                {!msg.read && <div className="w-2 h-2 bg-[#FF6B00] rounded-full shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
