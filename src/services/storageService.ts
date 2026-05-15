import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

function validateFile(file: File, allowedTypes: string[], maxSize = MAX_FILE_SIZE) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`);
  }
  if (file.size > maxSize) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  }
}

/**
 * Upload an avatar image to Supabase Storage
 */
export async function uploadAvatar(userId: string, file: File) {
  validateFile(file, ALLOWED_IMAGE_TYPES);
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from('public').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload a chat image to Supabase Storage
 */
export async function uploadChatImage(senderId: string, file: File) {
  validateFile(file, ALLOWED_IMAGE_TYPES);
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `chat/${senderId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from('public').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload a verification document
 */
export async function uploadVerificationDoc(userId: string, docType: string, file: File) {
  validateFile(file, ALLOWED_DOC_TYPES);
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `verifications/${userId}/${docType}-${Date.now()}.${fileExt}`;

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from('public').getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  // Upsert verification record
  const { error: dbError } = await supabase
    .from('verifications')
    .upsert(
      { user_id: userId, doc_type: docType, status: 'pending', url: publicUrl },
      { onConflict: 'user_id,doc_type' }
    );

  if (dbError) throw new Error(`Database error: ${dbError.message}`);

  return publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
