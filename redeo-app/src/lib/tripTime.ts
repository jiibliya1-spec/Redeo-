/** Trip times are stored as Moroccan local time (UTC+1). Compare them as absolute instants. */
export function tripDeparture(date?: string | null, time?: string | null): Date | null {
  if (!date) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  const hh = m ? m[1].padStart(2, '0') : '00';
  const mm = m ? m[2] : '00';
  const d = new Date(`${date}T${hh}:${mm}:00+01:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function hasDeparted(trip: { departure_date?: string | null; departure_time?: string | null }): boolean {
  const d = tripDeparture(trip.departure_date, trip.departure_time);
  return d ? d.getTime() <= Date.now() : false;
}
