import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Trip, Booking, SearchFilters } from '@/types';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

// ─── Types ───
export type AppMode = 'passenger' | 'driver';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mode: AppMode; // Profile mode switcher: passenger | driver
  selectedTrip: Trip | null;
  searchFilters: SearchFilters;
  language: 'en' | 'fr' | 'ar';
  bookings: Booking[];
  notifications: any[];
  unreadCount: number;

  // Actions
  setUser: (user: User | null) => void;
  setIsLoading: (val: boolean) => void;
  setMode: (mode: AppMode) => void;
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

// ─── Helpers ───
const ADMIN_EMAILS = ['admin@wansniauto.com', 'admin@wansniauto.ma'];
function isAdminEmail(email: string): boolean {
  const e = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(e) || e.includes('admin') && e.includes('wansniauto');
}

async function fetchProfile(userId: string): Promise<Partial<User> | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=*,passenger_verified,passenger_verification_status&id=eq.${userId}&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${jwt}`,
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;

    const profile = data[0];
    const email = profile.email || '';

    return {
      ...profile,
      role: isAdminEmail(email) ? 'admin' : (profile.role || 'passenger'),
      avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
    } as Partial<User>;
  } catch {
    return null;
  }
}

function buildUser(sessionUser: any, profileData: Partial<User> | null): User {
  const email = sessionUser.email || '';
  return {
    id: sessionUser.id,
    name: profileData?.name || sessionUser.user_metadata?.name || email.split('@')[0] || 'User',
    email,
    phone: profileData?.phone || sessionUser.user_metadata?.phone || '',
    role: isAdminEmail(email) ? 'admin' : (profileData?.role || sessionUser.user_metadata?.role || 'passenger'),
    is_verified: profileData?.is_verified === true,
    verification_status: profileData?.verification_status || 'unverified',
    passenger_verified: profileData?.passenger_verified === true,
    passenger_verification_status: (profileData as any)?.passenger_verification_status || 'unverified',
    rating: profileData?.rating || 5.0,
    trips_count: profileData?.trips_count || 0,
    avatar: profileData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sessionUser.id}`,
    bio: profileData?.bio || '',
  };
}

// ─── Store ───
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      mode: 'passenger',
      selectedTrip: null,
      searchFilters: { from: '', to: '', date: '', passengers: 1 },
      language: 'en',
      bookings: [],
      notifications: [],
      unreadCount: 0,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setMode: (mode) => set({ mode }),
      setSelectedTrip: (selectedTrip) => set({ selectedTrip }),
      setSearchFilters: (searchFilters) => set({ searchFilters }),
      setLanguage: (language) => set({ language }),
      addBooking: (booking) => set((s) => ({ bookings: [booking, ...s.bookings] })),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
      clearUnread: () => set({ unreadCount: 0 }),

      initAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            set({ isLoading: false });
            return;
          }

          const freshProfile = await fetchProfile(session.user.id);
          const user = buildUser(session.user, freshProfile);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      refreshProfile: async () => {
        const { user: currentUser } = get();
        if (!currentUser?.id) return;

        const freshProfile = await fetchProfile(currentUser.id);
        if (freshProfile) {
          const updated: User = {
            ...currentUser,
            is_verified: freshProfile.is_verified === true,
            verification_status: freshProfile.verification_status || 'unverified',
            passenger_verified: (freshProfile as any)?.passenger_verified === true,
            passenger_verification_status: (freshProfile as any)?.passenger_verification_status || 'unverified',
            role: (freshProfile.role as any) || currentUser.role,
            name: freshProfile.name || currentUser.name,
            avatar: freshProfile.avatar || currentUser.avatar,
            phone: freshProfile.phone || currentUser.phone,
            bio: freshProfile.bio || currentUser.bio,
            rating: freshProfile.rating || currentUser.rating,
            trips_count: freshProfile.trips_count || currentUser.trips_count,
          };
          set({ user: updated });
        }
      },

      signUp: async (email, password, name, phone, role) => {
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

          // Profile auto-created by trigger, just update it
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              name,
              phone,
              role,
              is_verified: false,
              verification_status: 'unverified',
              passenger_verified: false,
              passenger_verification_status: 'unverified',
            })
            .eq('id', authData.user.id);

          if (updateError) console.warn('[signUp] Profile update:', updateError.message);

          // Auto-sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) return { success: true };

          const user = buildUser(signInData.user, {
            name, email, phone, role: role as 'passenger' | 'driver' | 'admin',
            is_verified: false, verification_status: 'unverified',
            passenger_verified: false, passenger_verification_status: 'unverified',
          });

          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Registration failed' };
        }
      },

      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { success: false, error: error.message };

          const freshProfile = await fetchProfile(data.user.id);
          const user = buildUser(data.user, freshProfile);
          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Login failed' };
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('wansniauto-storage');
        set({ user: null, isAuthenticated: false, selectedTrip: null, mode: 'passenger' });
      },
    }),
    {
      name: 'wansniauto-storage',
      partialize: (state) => ({ language: state.language, mode: state.mode }),
    }
  )
);
