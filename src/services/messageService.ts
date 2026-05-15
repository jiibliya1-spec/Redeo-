import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

export async function fetchMessages(userId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(message: Partial<Message>) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markAsRead(messageId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('id', messageId);
  if (error) throw error;
}

export function subscribeToMessages(userId: string, callback: (msg: Message) => void) {
  return supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => callback(payload.new as Message)
    )
    .subscribe();
}
