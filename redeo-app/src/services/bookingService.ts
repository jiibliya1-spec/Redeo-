import { supabase } from '@/lib/supabase';
import type { Booking } from '@/types';
import { encodeText } from '@/lib/notifText';

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
    .eq('driver_id', driverId)
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

/** Passenger cancels their own booking (pending or confirmed). The DB trigger frees the seats; the driver is notified. */
export async function cancelBooking(
  b: { id: string; driver_id?: string | null; trip?: { from_location?: string; to_location?: string; departure_date?: string; driver_id?: string } | null },
  passengerId: string,
  passengerName: string,
) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', b.id)
    .eq('passenger_id', passengerId);
  if (error) throw error;

  const driverId = b.driver_id || b.trip?.driver_id;
  if (driverId) {
    // best effort — never block the cancellation
    void supabase.from('notifications').insert({
      user_id: driverId,
      type: 'info',
      title: encodeText('notif.booking_cancelled_title'),
      message: encodeText('notif.booking_cancelled_msg', {
        name: passengerName || '—', from: b.trip?.from_location || '', to: b.trip?.to_location || '', date: b.trip?.departure_date || '',
      }),
      read: false,
    });
  }
  try {
    const all: any[] = JSON.parse(localStorage.getItem('wansniauto_bookings') || '[]');
    localStorage.setItem('wansniauto_bookings', JSON.stringify(all.map(x => x.id === b.id ? { ...x, status: 'cancelled' } : x)));
  } catch { /* ignore */ }
}
