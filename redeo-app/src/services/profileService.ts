import { supabase } from '@/lib/supabase';
import type { User, VerificationDoc } from '@/types';

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as User;
}

export async function updateProfile(userId: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  await updateProfile(userId, { avatar: data.publicUrl });
  return data.publicUrl;
}

export async function uploadDocument(userId: string, docType: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${docType}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('documents').getPublicUrl(filePath);

  const { error: docError } = await supabase
    .from('verifications')
    .upsert({
      user_id: userId,
      doc_type: docType,
      status: 'pending',
      url: data.publicUrl,
    });

  if (docError) throw docError;
  return data.publicUrl;
}

export async function fetchVerificationDocs(userId: string) {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data as VerificationDoc[];
}

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as User[];
}
