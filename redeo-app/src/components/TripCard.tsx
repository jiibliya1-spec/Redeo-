import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '@/types';
import {
  Star, ShieldCheck, Users, Zap,
} from 'lucide-react';

interface TripCardProps {
  trip: Trip;
  index?: number;
  onBook?: (tripId: string) => void;
}

export function TripCard({ trip, index = 0 }: TripCardProps) {
  const navigate = useNavigate();
  const driver = trip.driver;
  const isFullyBooked = (trip.available_seats || 0) <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      onClick={() => navigate(`/trip/${trip.id}`)}
      className={`bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden cursor-pointer group transition-all hover:border-[#FF6B00]/30 hover:shadow-lg hover:shadow-[#FF6B00]/5 ${isFullyBooked ? 'opacity-60' : ''}`}
    >
      {/* Top: Route & Price */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          {/* Time */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-white leading-none">{trip.departure_time}</p>
              <p className="text-xs text-[#A0A0A0] mt-1">{trip.from_location}</p>
            </div>
            <div className="flex flex-col items-center px-2">
              <p className="text-[10px] text-[#A0A0A0]">{trip.duration || '—'}</p>
              <div className="w-16 h-[2px] bg-white/10 my-1 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FF6B00]" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[#FF6B00]" />
              </div>
              <Zap className="w-3 h-3 text-[#FF6B00]" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white leading-none">{trip.arrival_time || '??'}</p>
              <p className="text-xs text-[#A0A0A0] mt-1">{trip.to_location}</p>
            </div>
          </div>
          {/* Price */}
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-[#FF6B00]">{trip.price}</p>
            <p className="text-xs text-[#A0A0A0]">MAD</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          {driver?.is_verified && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          )}
          {!isFullyBooked && (trip.available_seats || 0) <= 2 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
              <Zap className="w-3 h-3" /> Only {trip.available_seats} left
            </span>
          )}
          {isFullyBooked && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#A0A0A0] font-medium">
              Fully booked
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* Bottom: Driver Info */}
      <div className="p-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?.name || 'driver'}`}
                alt={driver?.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF6B00]/20"
              />
              {driver?.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{driver?.name || 'Driver'}</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-[#FF6B00] fill-[#FF6B00]" />
                  <span className="text-xs text-[#A0A0A0]">{driver?.rating || 5}</span>
                </div>
                <span className="text-[10px] text-[#A0A0A0]">({driver?.trips_count || 0} trips)</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#A0A0A0]">
            <Users className="w-3.5 h-3.5" />
            <span>{trip.available_seats || 0}/{trip.total_seats || 0} seats</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
