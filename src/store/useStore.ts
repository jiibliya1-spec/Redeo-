import { create } from 'zustand';
import type { User, Trip, Booking, Notification, SearchFilters } from '@/types';
import { getCurrentUser, getSession, onAuthStateChange, signOut } from '@/services/authService';
import { fetchTrips } from '@/services/tripService';
import { fetchNotifications } from '@/services/notificationService';
import { fetchUserBookings } from '@/services/bookingService';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  trips: Trip[];
  bookings: Booking[];
  notifications: Notification[];
  unreadCount: number;
  selectedTrip: Trip | null;
  searchFilters: SearchFilters;
  language: 'en' | 'fr' | 'ar';

  setUser: (user: User | null) => void;
  setIsAuthenticated: (val: boolean) => void;
  setIsLoading: (val: boolean) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  setTrips: (trips: Trip[]) => void;
  loadTrips: (filters?: SearchFilters) => Promise<void>;
  setSelectedTrip: (trip: Trip | null) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setBookings: (bookings: Booking[]) => void;
  loadBookings: (userId: string) => Promise<void>;
  addBooking: (booking: Booking) => void;
  setNotifications: (notifications: Notification[]) => void;
  loadNotifications: (userId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  setLanguage: (lang: 'en' | 'fr' | 'ar') => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  trips: [],
  bookings: [],
  notifications: [],
  unreadCount: 0,
  selectedTrip: null,
  searchFilters: { from: '', to: '', date: '', passengers: 1 },
  language: 'en',

  setUser: (user) => set({ user }),
  setIsAuthenticated: (val) => set({ isAuthenticated: val }),
  setIsLoading: (val) => set({ isLoading: val }),

  login: (user) => set({ user, isAuthenticated: true }),

  logout: async () => {
    await signOut();
    set({ user: null, isAuthenticated: false, bookings: [], notifications: [] });
  },

  initAuth: async () => {
    try {
      const session = await getSession();
      if (session?.user) {
        const user = await getCurrentUser();
        if (user) {
          set({ user, isAuthenticated: true });
          get().loadNotifications(user.id);
          get().loadBookings(user.id);
        }
      }
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      set({ isLoading: false });
    }

    onAuthStateChange((user) => {
      set({ user, isAuthenticated: !!user });
      if (user) {
        get().loadNotifications(user.id);
        get().loadBookings(user.id);
      }
    });
  },

  setTrips: (trips) => set({ trips }),
  loadTrips: async (filters) => {
    try {
      const trips = await fetchTrips(filters);
      set({ trips });
    } catch (e) {
      console.error('Load trips error:', e);
    }
  },

  setSelectedTrip: (trip) => set({ selectedTrip: trip }),
  setSearchFilters: (filters) => set({ searchFilters: filters }),

  setBookings: (bookings) => set({ bookings }),
  loadBookings: async (userId) => {
    try {
      const bookings = await fetchUserBookings(userId);
      set({ bookings });
    } catch (e) {
      console.error('Load bookings error:', e);
    }
  },
  addBooking: (booking) => set((s) => ({ bookings: [booking, ...s.bookings] })),

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount: unread });
  },
  loadNotifications: async (userId) => {
    try {
      const notifications = await fetchNotifications(userId);
      const unread = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount: unread });
    } catch (e) {
      console.error('Load notifications error:', e);
    }
  },
  markNotificationRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
    }),

  setLanguage: (language) => set({ language }),
}));
