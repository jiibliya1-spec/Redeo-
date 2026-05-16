import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Trip, Booking, SearchFilters } from '@/types';
import { supabase } from '@/lib/supabase';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedTrip: Trip | null;
  searchFilters: SearchFilters;
  language: 'en' | 'fr' | 'ar';
  bookings: Booking[];
  notifications: any[];
  unreadCount: number;

  setUser: (user: User | null) => void;
  setIsLoading: (val: boolean) => void;
  setSelectedTrip: (trip: Trip | null) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setLanguage: (lang: 'en' | 'fr' | 'ar') => void;
  addBooking: (booking: Booking) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;

  // Auth
  initAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, role: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

// ─── localStorage Helpers ───
const PROFILE_KEY = 'wansniauto_profile_data';

function getLocalProfile(userId: string): Partial<User> | null {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.id === userId || !data.id) return data;
    }
  } catch { /* silent */ }
  return null;
}

function setLocalProfile(data: Partial<User>) {
  try {
    const existing = getLocalProfile(data.id || '');
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...existing, ...data }));
  } catch { /* silent */ }
}

function clearLocalProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
    console.log('[clearLocalProfile] Profile cleared from localStorage');
  } catch { /* silent */ }
}

// ─── Fetch profile from Supabase via REST API (bypasses RLS) ───
async function fetchProfileFromSupabase(userId: string): Promise<Partial<User> | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=*&id=eq.${userId}&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${jwt}`,
        },
      }
    );

    if (!res.ok) {
      console.log('[fetchProfile] HTTP error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      console.log('[fetchProfile] No profile row found for user:', userId);
      return null;
    }

    const profile = data[0];
    const role = profile.role || 'passenger';
    console.log('[fetchProfile] Got profile from Supabase. Role:', role, 'is_verified:', profile.is_verified, 'verification_status:', profile.verification_status);

    return {
      ...profile,
      role,
      avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
    } as Partial<User>;
  } catch (err: any) {
    console.log('[fetchProfile] Exception:', err.message);
    return null;
  }
}

// ─── Build user object ───
function buildUser(sessionUser: any, profileData: Partial<User> | null): User {
  const resolvedRole = profileData?.role || sessionUser.user_metadata?.role || 'passenger';
  return {
    id: sessionUser.id,
    name: profileData?.name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
    email: sessionUser.email || '',
    phone: profileData?.phone || sessionUser.user_metadata?.phone || '',
    role: resolvedRole as 'passenger' | 'driver' | 'admin',
    is_verified: profileData?.is_verified ?? false,
    verification_status: profileData?.verification_status || 'unverified',
    rating: profileData?.rating || 5.0,
    trips_count: profileData?.trips_count || 0,
    avatar: profileData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sessionUser.id}`,
    bio: profileData?.bio || '',
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      selectedTrip: null,
      searchFilters: { from: '', to: '', date: '', passengers: 1 },
      language: 'en',
      bookings: [],
      notifications: [],
      unreadCount: 0,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setSelectedTrip: (selectedTrip) => set({ selectedTrip }),
      setSearchFilters: (searchFilters) => set({ searchFilters }),
      setLanguage: (language) => set({ language }),
      addBooking: (booking) => set((s) => ({ bookings: [booking, ...s.bookings] })),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
      clearUnread: () => set({ unreadCount: 0 }),

      // ─── Initialize auth on app load ───
      initAuth: async () => {
        console.log('[initAuth] Starting...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            console.log('[initAuth] No session');
            clearLocalProfile();
            set({ isLoading: false });
            return;
          }

          // ALWAYS fetch fresh profile from Supabase
          const freshProfile = await fetchProfileFromSupabase(session.user.id);

          if (freshProfile) {
            const user = buildUser(session.user, freshProfile);
            console.log('[initAuth] Using Supabase profile. Role:', user.role);
            set({ user, isAuthenticated: true, isLoading: false });
            setLocalProfile(user);
            return;
          }

          // Fallback to localStorage ONLY if Supabase fails
          const localProfile = getLocalProfile(session.user.id);
          const user = buildUser(session.user, localProfile);
          console.log('[initAuth] Using localStorage fallback. Role:', user.role);
          set({ user, isAuthenticated: true, isLoading: false });
          setLocalProfile(user);
        } catch (err: any) {
          console.error('[initAuth] Error:', err.message);
          set({ isLoading: false });
        }
      },

      // ─── Force refresh profile from Supabase ───
      refreshProfile: async () => {
        const { user: currentUser } = get();
        if (!currentUser?.id) return;

        console.log('[refreshProfile] Refreshing for user:', currentUser.id);
        const freshProfile = await fetchProfileFromSupabase(currentUser.id);

        if (freshProfile) {
          const user = buildUser({ id: currentUser.id, email: currentUser.email, user_metadata: {} }, freshProfile);
          console.log('[refreshProfile] Profile refreshed. Role:', user.role);
          set({ user: { ...currentUser, ...user } as User });
          setLocalProfile(user);
        }
      },

      // ─── Sign Up ───
      signUp: async (email, password, name, phone, role) => {
        // SECURITY: Block admin registration
        if (role === 'admin') {
          return { success: false, error: 'Admin registration is not allowed.' };
        }

        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password,
            options: { data: { name, phone, role } },
          });

          if (authError) return { success: false, error: authError.message };
          if (!authData.user) return { success: false, error: 'No user returned' };

          // Try insert profile
          const profileData = {
            id: authData.user.id, name, email, phone, role,
            is_verified: false, rating: 5.0, trips_count: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`, bio: '',
          };

          const { error: profileError } = await supabase.from('profiles').insert(profileData);
          if (profileError) console.warn('Profile insert:', profileError.message);

          setLocalProfile(profileData as any);

          // Auto sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) return { success: true };

          const user = buildUser(signInData.user, profileData as Partial<User>);
          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Registration failed' };
        }
      },

      // ─── Sign In ───
      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { success: false, error: error.message };

          // ALWAYS fetch fresh from Supabase
          const freshProfile = await fetchProfileFromSupabase(data.user.id);

          if (freshProfile) {
            const user = buildUser(data.user, freshProfile);
            console.log('[signIn] Supabase profile. Role:', user.role);
            set({ user, isAuthenticated: true });
            setLocalProfile(user);
            return { success: true };
          }

          // Fallback to localStorage
          const localProfile = getLocalProfile(data.user.id);
          const user = buildUser(data.user, localProfile);
          console.log('[signIn] localStorage fallback. Role:', user.role);
          set({ user, isAuthenticated: true });
          setLocalProfile(user);
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Login failed' };
        }
      },

      // ─── Sign Out ───
      signOut: async () => {
        await supabase.auth.signOut();
        clearLocalProfile();
        // Clear ALL caches
        try {
          localStorage.removeItem('wansniauto-storage');
          localStorage.removeItem('wansniauto_profile_data');
        } catch { /* silent */ }
        set({ user: null, isAuthenticated: false, selectedTrip: null });
      },
    }),
    {
      name: 'wansniauto-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
);
