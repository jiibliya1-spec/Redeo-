import { supabase } from '@/lib/supabase';
import type { Trip, SearchFilters } from '@/types';

export async function fetchTrips(filters?: SearchFilters) {
  let query = supabase
    .from('trips')
    .select('*, driver:profiles(*), vehicle:vehicles(*)')
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

  const { data, error } = await query;
  if (error) throw error;
  return data as Trip[];
}

export async function fetchTripById(id: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*, driver:profiles(*), vehicle:vehicles(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Trip;
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

export async function updateTripSeats(tripId: string, seats: number) {
  const { error } = await supabase
    .from('trips')
    .update({ available_seats: seats })
    .eq('id', tripId);
  if (error) throw error;
}
