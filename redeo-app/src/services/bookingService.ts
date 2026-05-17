import { supabase } from '@/lib/supabase';
import type { Booking } from '@/types';

export async function createBooking(booking: Partial<Booking>) {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function fetchUserBookings(userId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, trip:trips(*, driver:profiles(*)), passenger:profiles!bookings_passenger_id_fkey(*)')
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function fetchDriverBookings(driverId: string) {
  // Correctly filter by driver_id column directly on bookings table
  const { data, error } = await supabase
    .from('bookings')
    .select('*, trip:trips(*), passenger:profiles!bookings_passenger_id_fkey(*)')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function fetchTripBookings(tripId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, passenger:profiles!bookings_passenger_id_fkey(*)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function cancelBooking(bookingId: string) {
  return updateBookingStatus(bookingId, 'cancelled');
}

export function subscribeToBookings(userId: string, callback: (booking: Booking) => void) {
  return supabase
    .channel('bookings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `passenger_id=eq.${userId}`,
      },
      (payload) => callback(payload.new as Booking)
    )
    .subscribe();
}

export function subscribeToDriverBookings(driverId: string, callback: (booking: Booking) => void) {
  return supabase
    .channel('driver-bookings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => callback(payload.new as Booking)
    )
    .subscribe();
}
