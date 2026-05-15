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

  // Auth
  initAuth: () => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, role: 'passenger' | 'driver') => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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

      // Initialize auth state from Supabase session
      initAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (profile) {
              set({ user: profile as User, isAuthenticated: true, isLoading: false });
              return;
            }
          }
          set({ isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      // Sign up with Supabase
      signUp: async (email, password, name, phone, role) => {
        try {
          // 1. Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
          });

          if (authError) {
            return { success: false, error: authError.message };
          }

          if (!authData.user) {
            return { success: false, error: 'No user returned' };
          }

          // 2. Create profile
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            name,
            email,
            phone,
            role,
            is_verified: false,
            rating: 5.0,
            trips_count: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          });

          if (profileError) {
            console.error('Profile error:', profileError);
            // Don't fail - user is created, profile may exist from trigger
          }

          // 3. Auto sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            return { success: false, error: 'Account created! Please sign in.' };
          }

          // 4. Get profile and set user
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signInData.user.id)
            .single();

          const user = (profile || {
            id: signInData.user.id,
            name,
            email,
            phone,
            role,
            is_verified: false,
            rating: 5.0,
            trips_count: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          }) as User;

          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Registration failed' };
        }
      },

      // Sign in with Supabase
      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          // Get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const user = (profile || {
            id: data.user.id,
            name: data.user.user_metadata?.name || email,
            email,
            role: 'passenger',
            is_verified: false,
            rating: 5.0,
            trips_count: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          }) as User;

          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Login failed' };
        }
      },

      // Sign out
      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'wansniauto-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
);
