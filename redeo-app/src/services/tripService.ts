import { supabase } from '@/lib/supabase';
import type { Trip, SearchFilters } from '@/types';

export async function fetchTrips(filters?: SearchFilters) {
  let query = supabase
    .from('trips')
    .select('*, driver:profiles(*), vehicle:vehicle_profiles(*)')
    .eq('status', 'upcoming')
    .order('departure_date', { ascending: true });

  if (filters?.from) {
    query = query.ilike('from_location', `%${filters.from}%`);
  }
  if (filters?.to) {
    query = query.ilike('to_location', `%${filters.to}%`);
  }
  if (filters?.date) {
    query = query.eq('departure_date', filters.date);
  }
  if (filters?.passengers) {
    query = query.gte('available_seats', filters.passengers);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function fetchTripById(id: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*, driver:profiles(*), vehicle:vehicle_profiles(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function fetchDriverTrips(driverId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*, vehicle:vehicle_profiles(*)')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function createTrip(trip: Partial<Trip>) {
  const { data, error } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>) {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function updateTripSeats(tripId: string, seats: number) {
  const { error } = await supabase
    .from('trips')
    .update({ available_seats: seats })
    .eq('id', tripId);
  if (error) throw error;
}

export async function cancelTrip(tripId: string) {
  const { error } = await supabase
    .from('trips')
    .update({ status: 'cancelled' })
    .eq('id', tripId);
  if (error) throw error;
}

export function subscribeToTrips(callback: (trip: Trip) => void) {
  return supabase
    .channel('trips-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trips' },
      (payload) => callback(payload.new as Trip)
    )
    .subscribe();
}
