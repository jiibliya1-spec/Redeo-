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
    .select('*, trip:trips(*), passenger:profiles(*)')
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function fetchDriverBookings(driverId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, trip:trips(*), passenger:profiles(*)')
    .eq('trip.driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);
  if (error) throw error;
}
