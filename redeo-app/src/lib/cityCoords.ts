import { CITY_COORDS } from '@/lib/cities';

export { CITY_COORDS };

/** Approximate city-centre coordinates [lat, lng], used to draw the destination on the live-tracking map. */
export function cityCoords(name: string | null | undefined): [number, number] | null {
  return (name && CITY_COORDS[name.trim()]) || null;
}
