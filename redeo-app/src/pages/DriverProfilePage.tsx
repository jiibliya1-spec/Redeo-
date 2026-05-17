import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import type { Trip, User } from '@/types';
import {
  ArrowLeft, Star, ShieldCheck, MessageCircle, Car, Calendar,
  MapPin, Clock, Users, Loader2, Shield, Award, ThumbsUp,
  Phone, Mail,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

export function DriverProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useStore();
  const { lang, dir } = useI18n();

  const [driver, setDriver] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trips' | 'reviews'>('trips');

  const getHeaders = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${s.session?.access_token || ''}`,
    };
  }, []);

  /* ─── Load driver profile ─── */
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        const headers = await getHeaders();

        // Fetch driver profile
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${id}&limit=1`,
          { headers }
        );
        let driverProfile: User | null = null;
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          if (profiles?.[0]) {
            driverProfile = profiles[0] as User;
            setDriver(driverProfile);
          }
        }

        // Fetch driver trips
        const tripsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/trips?select=*&driver_id=eq.${id}&status=eq.upcoming&order=departure_date.desc&limit=20`,
          { headers }
        );
        if (tripsRes.ok) {
          const t = await tripsRes.json();
          setTrips((t || []).map((trip: any) => ({ ...trip, driver: driverProfile })));
        }

        // Fetch reviews
        const reviewsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/reviews?select=*&reviewee_id=eq.${id}&order=created_at.desc&limit=10`,
          { headers }
        );
        if (reviewsRes.ok) {
          setReviews(await reviewsRes.json() || []);
        }
      } catch (e) { console.error('DriverProfilePage load error:', e); }
      setLoading(false);
    };

    load();
  }, [id, getHeaders]);

  const handleContact = () => {
    if (!id) return;
    navigate('/messages', {
      state: {
        contactId: id,
        contactName: driver?.name || 'Driver',
        contactAvatar: driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      }
    });
  };

  const handleBookTrip = (tripId: string) => {
    navigate(`/booking/${tripId}`);
  };

  const T = {
    en: { verified: 'Verified Driver', trips: 'Trips', reviews: 'Reviews', member: 'Member', contact: 'Message', book: 'Book', noTrips: 'No upcoming trips', noReviews: 'No reviews yet', seats: 'seats', price: 'MAD' },
    fr: { verified: 'Chauffeur Verifie', trips: 'Trajets', reviews: 'Avis', member: 'Membre', contact: 'Message', book: 'Reserver', noTrips: 'Aucun trajet a venir', noReviews: 'Pas encore d\'avis', seats: 'places', price: 'MAD' },
    ar: { verified: 'سائق مفحوص', trips: 'الرحلات', reviews: 'التقييمات', member: 'عضو', contact: 'مراسلة', book: 'احجز', noTrips: 'مافيه حتى رحلة', noReviews: 'مافيه حتى تقييم', seats: 'مقاعد', price: 'درهم' },
  }[lang];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#A0A0A0] mb-4">Driver not found</p>
          <Button onClick={() => navigate(-1)} className="bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8" dir={dir}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <h1 className="text-xl font-bold text-white">{driver.name}</h1>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <img
                src={driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`}
                alt={driver.name}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
              />
              {driver.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">{driver.name}</h2>
              </div>
              {driver.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium mb-2">
                  <Shield className="w-3 h-3" /> {T.verified}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#FF6B00] fill-[#FF6B00]" />
                  <span className="text-sm text-white font-medium">{driver.rating || 5}</span>
                </div>
                <span className="text-xs text-[#A0A0A0]">({driver.trips_count || 0} trips)</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#0F1115] rounded-xl p-3 text-center border border-white/5">
              <Car className="w-5 h-5 text-[#FF6B00] mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{trips.length}</p>
              <p className="text-[10px] text-[#A0A0A0]">{T.trips}</p>
            </div>
            <div className="bg-[#0F1115] rounded-xl p-3 text-center border border-white/5">
              <ThumbsUp className="w-5 h-5 text-[#FF6B00] mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{reviews.length}</p>
              <p className="text-[10px] text-[#A0A0A0]">{T.reviews}</p>
            </div>
            <div className="bg-[#0F1115] rounded-xl p-3 text-center border border-white/5">
              <Award className="w-5 h-5 text-[#FF6B00] mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{driver.is_verified ? '100%' : '—'}</p>
              <p className="text-[10px] text-[#A0A0A0]">Response</p>
            </div>
          </div>

          {/* Bio */}
          {driver.bio && (
            <p className="text-sm text-[#A0A0A0] mb-4 leading-relaxed">{driver.bio}</p>
          )}

          {/* Contact Info */}
          <div className="space-y-2 mb-5">
            {driver.phone && (
              <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                <Phone className="w-4 h-4 text-[#FF6B00]" />
                {driver.phone}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
              <Mail className="w-4 h-4 text-[#FF6B00]" />
              {driver.email}
            </div>
          </div>

          {/* Actions */}
          {me?.id !== driver.id && (
            <div className="flex gap-3">
              <Button onClick={handleContact} className="flex-1 bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                <MessageCircle className="w-4 h-4 mr-2" /> {T.contact}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['trips', 'reviews'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-[#FF6B00] text-white' : 'bg-[#1B1F27] text-[#A0A0A0] hover:text-white'
              }`}
            >
              {tab === 'trips' ? T.trips : T.reviews} ({tab === 'trips' ? trips.length : reviews.length})
            </button>
          ))}
        </div>

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <div className="space-y-3">
            {trips.length === 0 ? (
              <div className="text-center py-10">
                <Car className="w-10 h-10 text-[#A0A0A0]/30 mx-auto mb-2" />
                <p className="text-[#A0A0A0]">{T.noTrips}</p>
              </div>
            ) : (
              trips.map((trip, i) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#FF6B00]" />
                      <span className="text-sm text-white font-medium">{trip.from_location} → {trip.to_location}</span>
                    </div>
                    <span className="text-sm font-bold text-[#FF6B00]">{trip.price} MAD</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#A0A0A0] mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.departure_date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{trip.departure_time}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{trip.available_seats}/{trip.total_seats} {T.seats}</span>
                  </div>
                  <Button
                    onClick={() => handleBookTrip(trip.id)}
                    disabled={(trip.available_seats || 0) <= 0}
                    className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-9 text-sm disabled:opacity-30"
                  >
                    {(trip.available_seats || 0) <= 0 ? 'Fully Booked' : T.book}
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-10">
                <Star className="w-10 h-10 text-[#A0A0A0]/30 mx-auto mb-2" />
                <p className="text-[#A0A0A0]">{T.noReviews}</p>
              </div>
            ) : (
              reviews.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4"
                >
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'text-[#FF6B00] fill-[#FF6B00]' : 'text-[#A0A0A0]/20'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-white">{r.comment || 'No comment'}</p>
                  <p className="text-[10px] text-[#A0A0A0] mt-2">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
