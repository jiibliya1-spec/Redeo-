import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Trip, Booking, SearchFilters } from '@/types';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

export type AppMode = 'passenger' | 'driver';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mode: AppMode;
  selectedTrip: Trip | null;
  searchFilters: SearchFilters;
  language: 'en' | 'fr' | 'ar';
  bookings: Booking[];
  unreadCount: number;

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

  initAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, role: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const ADMIN_EMAILS = ['admin@wansniauto.com', 'admin@wansniauto.ma'];
function isAdminEmail(email: string): boolean {
  const e = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(e);
}

async function fetchProfile(userId: string): Promise<Partial<User> | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${userId}&limit=1`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch { return null; }
}

function buildUser(sessionUser: any, profileData: Partial<User> | null): User {
  const email = sessionUser.email || '';
  const isAdmin = isAdminEmail(email);
  return {
    id: sessionUser.id,
    name: profileData?.name || sessionUser.user_metadata?.name || email.split('@')[0] || 'User',
    email,
    phone: profileData?.phone || sessionUser.user_metadata?.phone || '',
    role: isAdmin ? 'admin' : (profileData?.role || sessionUser.user_metadata?.role || 'passenger'),
    is_verified: profileData?.is_verified === true,
    verification_status: (profileData?.verification_status as any) || 'unverified',
    passenger_verified: (profileData as any)?.passenger_verified === true,
    passenger_verification_status: (profileData as any)?.passenger_verification_status || 'unverified',
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
      mode: 'passenger',
      selectedTrip: null,
      searchFilters: { from: '', to: '', date: '', passengers: 1 },
      language: 'en',
      bookings: [],
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
          const email = currentUser.email;
          const isAdmin = isAdminEmail(email);
          set({
            user: {
              ...currentUser,
              is_verified: freshProfile.is_verified === true,
              verification_status: (freshProfile.verification_status as any) || 'unverified',
              role: isAdmin ? 'admin' : ((freshProfile.role as any) || currentUser.role),
              name: freshProfile.name || currentUser.name,
              avatar: freshProfile.avatar || currentUser.avatar,
              phone: freshProfile.phone || currentUser.phone,
              bio: freshProfile.bio || currentUser.bio,
              rating: freshProfile.rating || currentUser.rating,
              trips_count: freshProfile.trips_count || currentUser.trips_count,
            },
          });
        }
      },

      signUp: async (email, password, name, phone, role) => {
        if (role === 'admin') {
          return { success: false, error: 'Admin registration is not allowed' };
        }
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password,
            options: {
              data: { name, phone, role },
              // Supabase will redirect here after email confirmation
              emailRedirectTo: window.location.origin + '/dashboard',
            },
          });
          if (authError) return { success: false, error: authError.message };
          if (!authData.user) return { success: false, error: 'Registration failed' };

          // Profile auto-created by trigger — update extra fields
          await supabase
            .from('profiles')
            .update({ name, phone, role, is_verified: false, verification_status: 'unverified' })
            .eq('id', authData.user.id);

          // If Supabase returned a session immediately → email confirmation is disabled
          if (authData.session) {
            const user = buildUser(authData.user, { name, email, phone, role: role as any, is_verified: false, verification_status: 'unverified' as any });
            const initialMode = role === 'driver' ? 'driver' : 'passenger';
            set({ user, isAuthenticated: true, mode: initialMode });
            return { success: true, needsConfirmation: false };
          }

          // No session → confirmation email was sent, user must verify first
          return { success: true, needsConfirmation: true };
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
            // Set mode based on actual role (driver → driver mode, others → passenger)
            const initialMode = (freshProfile?.role === 'driver' || data.user.user_metadata?.role === 'driver') ? 'driver' : 'passenger';
          set({ user, isAuthenticated: true, mode: initialMode });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Login failed' };
        }
      },

      signOut: async () => {
        const { user } = get();
        await supabase.auth.signOut();
        // Clear all user-specific caches to prevent data leakage between accounts
        localStorage.removeItem('wansniauto-storage');
        localStorage.removeItem('wansniauto_bookings');
        localStorage.removeItem('wansniauto_notifications');
        // Also clear user-scoped notification cache if we have user id
        if (user?.id) {
          localStorage.removeItem(`wansniauto_notifications_${user.id}`);
        }
        set({ user: null, isAuthenticated: false, selectedTrip: null, mode: 'passenger', unreadCount: 0, bookings: [] });
      },
    }),
    {
      name: 'wansniauto-storage',
      partialize: (state) => ({ language: state.language, mode: state.mode }),
    }
  )
);
