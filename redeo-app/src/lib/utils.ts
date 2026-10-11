import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** The one and only default avatar for a user. Always seeded by the user id so the
 *  same person looks identical in their profile, on trips, in chat and in admin. */
export function defaultAvatar(id?: string | null): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(id || 'guest')}`
}

/** Returns the user's own avatar when set (uploaded photo), otherwise the default one. */
export function resolveAvatar(avatar: string | null | undefined, id?: string | null): string {
  return avatar && avatar.trim() ? avatar : defaultAvatar(id)
}
