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

function getFileExt(file: File) {
  return file.name.split('.').pop()?.toLowerCase() || 'jpg';
}

function generateFileName(userId: string, prefix: string, ext: string) {
  return `${userId}/${prefix}-${Date.now()}.${ext}`;
}

// ─── Avatars ───
export async function uploadAvatar(userId: string, file: File) {
  validateFile(file, ALLOWED_IMAGE_TYPES);
  const ext = getFileExt(file);
  const path = generateFileName(userId, 'avatar', ext);

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Chat Images ───
export async function uploadChatImage(userId: string, file: File) {
  validateFile(file, ALLOWED_IMAGE_TYPES);
  const ext = getFileExt(file);
  const path = generateFileName(userId, 'chat', ext);

  const { error } = await supabase.storage
    .from('chat-images')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
  return data.publicUrl;
}

// ─── CIN Documents ───
export async function uploadCINDocument(userId: string, file: File) {
  validateFile(file, ALLOWED_DOC_TYPES);
  const ext = getFileExt(file);
  const path = generateFileName(userId, 'cin', ext);

  const { error } = await supabase.storage
    .from('cin-documents')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('cin-documents').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Selfie ───
export async function uploadSelfie(userId: string, file: File) {
  validateFile(file, ALLOWED_IMAGE_TYPES);
  const ext = getFileExt(file);
  const path = generateFileName(userId, 'selfie', ext);

  const { error } = await supabase.storage
    .from('selfies')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('selfies').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Driver License ───
export async function uploadDriverLicense(userId: string, file: File) {
  validateFile(file, ALLOWED_DOC_TYPES);
  const ext = getFileExt(file);
  const path = generateFileName(userId, 'license', ext);

  const { error } = await supabase.storage
    .from('driver-licenses')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('driver-licenses').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Vehicle Registration ───
export async function uploadVehicleRegistration(userId: string, file: File) {
  validateFile(file, ALLOWED_DOC_TYPES);
  const ext = getFileExt(file);
  const path = generateFileName(userId, 'registration', ext);

  const { error } = await supabase.storage
    .from('vehicle-documents')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('vehicle-documents').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Insurance ───
export async function uploadInsurance(userId: string, file: File) {
  validateFile(file, ALLOWED_DOC_TYPES);
  const ext = getFileExt(file);
  const path = generateFileName(userId, 'insurance', ext);

  const { error } = await supabase.storage
    .from('insurance-documents')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('insurance-documents').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Generic: upload any verification doc with proper bucket ───
export async function uploadVerificationDoc(userId: string, docType: string, file: File) {
  // Route to the correct bucket based on doc type
  switch (docType) {
    case 'cin':
      return uploadCINDocument(userId, file);
    case 'selfie':
      return uploadSelfie(userId, file);
    case 'license':
      return uploadDriverLicense(userId, file);
    case 'registration':
      return uploadVehicleRegistration(userId, file);
    case 'insurance':
      return uploadInsurance(userId, file);
    default:
      throw new Error(`Unknown document type: ${docType}`);
  }
}

// ─── Delete a file ───
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

// ─── Get public URL ───
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
