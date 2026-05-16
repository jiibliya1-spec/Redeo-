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
  signUp: (email: string, password: string, name: string, phone: string, role: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

// Helper: get profile from localStorage fallback
function getLocalProfile(userId: string): Partial<User> | null {
  try {
    const stored = localStorage.getItem('wansniauto_profile_data');
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
    localStorage.setItem('wansniauto_profile_data', JSON.stringify({ ...existing, ...data }));
  } catch { /* silent */ }
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
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
      clearUnread: () => set({ unreadCount: 0 }),

      // Initialize auth state from Supabase session
      initAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Try to get profile from Supabase
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error || !profile) {
              // Table doesn't exist or row not found - use localStorage fallback
              const localProfile = getLocalProfile(session.user.id);
              const resolvedRole = (localProfile?.role as any) || (session.user.user_metadata?.role as any) || 'passenger';
              console.log('[initAuth] Profile not found, using localStorage. Role:', resolvedRole);
              const userData: User = {
                id: session.user.id,
                name: localProfile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || '',
                phone: localProfile?.phone || session.user.user_metadata?.phone || '',
                role: resolvedRole,
                is_verified: localProfile?.is_verified || false,
                rating: localProfile?.rating || 5.0,
                trips_count: 0,
                avatar: localProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
                bio: localProfile?.bio || '',
              };
              set({ user: userData, isAuthenticated: true, isLoading: false });
              setLocalProfile(userData);
              return;
            }

            // ALWAYS preserve the role from Supabase profile
            const resolvedRole = (profile as any).role || 'passenger';
            console.log('[initAuth] Profile loaded from Supabase. Role:', resolvedRole);
            const userWithRole = { ...profile, role: resolvedRole } as User;
            set({ user: userWithRole, isAuthenticated: true, isLoading: false });
            setLocalProfile(userWithRole);
            return;
          }
          set({ isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      // Sign up with Supabase
      signUp: async (email, password, name, phone, role) => {
        // SECURITY: Prevent anyone from registering as admin
        if (role === 'admin') {
          console.warn('[signUp] Blocked: admin registration not allowed');
          return { success: false, error: 'Admin registration is not allowed. Contact the platform owner.' };
        }

        try {
          // 1. Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, phone, role } },
          });

          if (authError) {
            return { success: false, error: authError.message };
          }

          if (!authData.user) {
            return { success: false, error: 'No user returned' };
          }

          // 2. Try to create profile in Supabase (may fail if table doesn't exist)
          const profileData = {
            id: authData.user.id,
            name,
            email,
            phone,
            role,
            is_verified: false,
            rating: 5.0,
            trips_count: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            bio: '',
          };

          const { error: profileError } = await supabase.from('profiles').insert(profileData);

          if (profileError) {
            console.warn('Profile table not ready, using localStorage:', profileError.message);
          }

          // 3. Always save to localStorage as fallback/primary
          setLocalProfile({ ...profileData, role: profileData.role as any });

          // 4. Auto sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            return { success: false, error: 'Account created! Please sign in.' };
          }

          // 5. Set user in state
          const user: User = {
            id: signInData.user.id,
            name,
            email,
            phone,
            role: role as 'passenger' | 'driver' | 'admin',
            is_verified: false,
            rating: 5.0,
            trips_count: 0,
            avatar: profileData.avatar,
            bio: '',
          };

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

          // Try to get profile from Supabase
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            // Use localStorage fallback or create from auth data
            const localProfile = getLocalProfile(data.user.id);
            const resolvedRole = (localProfile?.role as any) || (data.user.user_metadata?.role as any) || 'passenger';
            console.log('[signIn] Profile not found, using fallback. Role:', resolvedRole);
            const user: User = {
              id: data.user.id,
              name: localProfile?.name || data.user.user_metadata?.name || email.split('@')[0],
              email,
              phone: localProfile?.phone || data.user.user_metadata?.phone || '',
              role: resolvedRole,
              is_verified: localProfile?.is_verified || false,
              rating: localProfile?.rating || 5.0,
              trips_count: 0,
              avatar: localProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
              bio: localProfile?.bio || '',
            };
            set({ user, isAuthenticated: true });
            setLocalProfile(user);
            return { success: true };
          }

          // ALWAYS preserve the role from Supabase profile
          const resolvedRole = (profile as any).role || 'passenger';
          console.log('[signIn] Profile loaded. Role:', resolvedRole);
          const userWithRole = { ...profile, role: resolvedRole } as User;
          set({ user: userWithRole, isAuthenticated: true });
          setLocalProfile(userWithRole);
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
