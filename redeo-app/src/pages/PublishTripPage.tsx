import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiPost, apiGet, supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Trip } from '@/types';
import {
  ArrowLeft, Plus, Loader2, MapPin, Calendar, Clock,
  DollarSign, Users, CarFront, ChevronRight,
  Shield, ShieldCheck, ShieldAlert,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';


  // ─── Moroccan city distances (km, approximate) ───
  const CITY_DISTANCES: Record<string, Record<string, number>> = {
    'Casablanca': { 'Rabat': 90, 'Marrakech': 240, 'Tanger': 340, 'Agadir': 460, 'Fes': 290, 'Oujda': 540, 'Meknes': 240, 'El Jadida': 100, 'Safi': 185, 'Kenitra': 80, 'Tetouan': 380, 'Nador': 590 },
    'Rabat':      { 'Casablanca': 90, 'Marrakech': 320, 'Tanger': 250, 'Agadir': 550, 'Fes': 200, 'Oujda': 490, 'Meknes': 145, 'El Jadida': 185, 'Safi': 280, 'Kenitra': 40, 'Tetouan': 290, 'Nador': 540 },
    'Marrakech':  { 'Casablanca': 240, 'Rabat': 320, 'Tanger': 570, 'Agadir': 230, 'Fes': 530, 'Oujda': 760, 'Meknes': 465, 'El Jadida': 175, 'Safi': 155, 'Kenitra': 360, 'Tetouan': 610, 'Nador': 810 },
    'Tanger':     { 'Casablanca': 340, 'Rabat': 250, 'Marrakech': 570, 'Agadir': 790, 'Fes': 310, 'Oujda': 620, 'Meknes': 295, 'El Jadida': 430, 'Safi': 520, 'Kenitra': 210, 'Tetouan': 60, 'Nador': 415 },
    'Agadir':     { 'Casablanca': 460, 'Rabat': 550, 'Marrakech': 230, 'Tanger': 790, 'Fes': 730, 'Oujda': 970, 'Meknes': 670, 'El Jadida': 370, 'Safi': 270, 'Kenitra': 580, 'Tetouan': 840, 'Nador': 1020 },
    'Fes':        { 'Casablanca': 290, 'Rabat': 200, 'Marrakech': 530, 'Tanger': 310, 'Agadir': 730, 'Oujda': 360, 'Meknes': 65, 'El Jadida': 370, 'Safi': 450, 'Kenitra': 160, 'Tetouan': 365, 'Nador': 375 },
    'Oujda':      { 'Casablanca': 540, 'Rabat': 490, 'Marrakech': 760, 'Tanger': 620, 'Agadir': 970, 'Fes': 360, 'Meknes': 380, 'El Jadida': 625, 'Safi': 710, 'Kenitra': 455, 'Tetouan': 640, 'Nador': 155 },
    'Meknes':     { 'Casablanca': 240, 'Rabat': 145, 'Marrakech': 465, 'Tanger': 295, 'Agadir': 670, 'Fes': 65, 'Oujda': 380, 'El Jadida': 320, 'Safi': 395, 'Kenitra': 130, 'Tetouan': 350, 'Nador': 440 },
    'El Jadida':  { 'Casablanca': 100, 'Rabat': 185, 'Marrakech': 175, 'Tanger': 430, 'Agadir': 370, 'Fes': 370, 'Oujda': 625, 'Meknes': 320, 'Safi': 90, 'Kenitra': 175, 'Tetouan': 475, 'Nador': 680 },
    'Safi':       { 'Casablanca': 185, 'Rabat': 280, 'Marrakech': 155, 'Tanger': 520, 'Agadir': 270, 'Fes': 450, 'Oujda': 710, 'Meknes': 395, 'El Jadida': 90, 'Kenitra': 265, 'Tetouan': 565, 'Nador': 760 },
    'Kenitra':    { 'Casablanca': 80, 'Rabat': 40, 'Marrakech': 360, 'Tanger': 210, 'Agadir': 580, 'Fes': 160, 'Oujda': 455, 'Meknes': 130, 'El Jadida': 175, 'Safi': 265, 'Tetouan': 255, 'Nador': 500 },
    'Tetouan':    { 'Casablanca': 380, 'Rabat': 290, 'Marrakech': 610, 'Tanger': 60, 'Agadir': 840, 'Fes': 365, 'Oujda': 640, 'Meknes': 350, 'El Jadida': 475, 'Safi': 565, 'Kenitra': 255, 'Nador': 470 },
    'Nador':      { 'Casablanca': 590, 'Rabat': 540, 'Marrakech': 810, 'Tanger': 415, 'Agadir': 1020, 'Fes': 375, 'Oujda': 155, 'Meknes': 440, 'El Jadida': 680, 'Safi': 760, 'Kenitra': 500, 'Tetouan': 470 },
  };

  // ─── Suggest price per seat based on distance (MAD) ───
  function getSuggestedPrice(from: string, to: string): { km: number; min: number; suggested: number; max: number } | null {
    const km = CITY_DISTANCES[from]?.[to] ?? CITY_DISTANCES[to]?.[from];
    if (!km) return null;
    // Fuel: ~8L/100km at 11 MAD/L = 0.88 MAD/km total fuel cost
    // Shared between avg 3 passengers → 0.29 MAD/km per seat
    // Add amortization ~0.10 MAD/km per seat
    // Min = pure fuel/amort cost, Suggested = fair price, Max = still ~40% below CTM bus
    const min       = Math.max(20, Math.round((km * 0.39) / 5) * 5);
    const suggested = Math.max(30, Math.round((km * 0.50) / 5) * 5);
    const max       = Math.max(40, Math.round((km * 0.65) / 5) * 5);
    return { km, min, suggested, max };
  }
  
// All trips are stored in Supabase only - no localStorage

export function PublishTripPage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { t, dir } = useI18n();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('3');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [priceSuggestion, setPriceSuggestion] = useState<{ km: number; min: number; suggested: number; max: number } | null>(null);

  // ─── Price suggestion when route is selected ───
    useEffect(() => {
      if (from && to && from !== to) {
        setPriceSuggestion(getSuggestedPrice(from, to));
      } else {
        setPriceSuggestion(null);
      }
    }, [from, to]);

    // ─── Verification check (fresh from Supabase) ───
  const [isChecking, setIsChecking] = useState(true);
  const [canPublish, setCanPublish] = useState(false);
  const [verifStatus, setVerifStatus] = useState<string>('unverified');
  const [verifMessage, setVerifMessage] = useState('');

  // ─── Recalculate price suggestion when route changes ───
    useEffect(() => {
      if (from && to && from !== to) {
        setPriceSuggestion(getSuggestedPrice(from, to));
      } else {
        setPriceSuggestion(null);
      }
    }, [from, to]);

    // ─── Fetch verification status DIRECTLY from Supabase ───
  const checkVerification = useCallback(async () => {
    if (!user?.id) {
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=is_verified,verification_status,role&id=eq.${user.id}&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${jwt}`,
          },
        }
      );

      if (!res.ok) {
        console.error('[PublishTripPage] Check failed:', res.status);
        // Fallback: use cached user state
        const cachedOk = user.is_verified === true ||
          user.verification_status === 'verified' ||
          user.verification_status === 'approved';
        setCanPublish(cachedOk);
        setVerifStatus(user.verification_status || 'unverified');
        setIsChecking(false);
        return;
      }

      const data = await res.json();
      if (!data || data.length === 0) {
        setCanPublish(false);
        setVerifStatus('unverified');
        setVerifMessage('Profile not found. Please complete your profile.');
        setIsChecking(false);
        return;
      }

      const profile = data[0];
      const status = profile.verification_status || 'unverified';
      const isVerified = profile.is_verified === true;

      console.log('[PublishTripPage] Fresh check:', { status, isVerified, role: profile.role });

      setVerifStatus(status);

      // ─── AUTHORIZATION LOGIC ───
      if (status === 'verified' || status === 'approved' || isVerified) {
        setCanPublish(true);
        setVerifMessage('');
      } else if (status === 'pending' || status === 'submitted') {
        setCanPublish(false);
        setVerifMessage('Your documents are under review. Please wait for admin approval before publishing rides.');
      } else if (status === 'rejected') {
        setCanPublish(false);
        setVerifMessage('Your verification was rejected. Please update your documents and try again.');
      } else {
        setCanPublish(false);
        setVerifMessage('Verification required. Please upload your documents to start publishing rides.');
      }
    } catch (err: any) {
      console.error('[PublishTripPage] Error:', err.message);
      // Fallback to cached state
      const cachedOk = user.is_verified === true ||
        user.verification_status === 'verified' ||
        user.verification_status === 'approved';
      setCanPublish(cachedOk);
      setVerifStatus(user.verification_status || 'unverified');
    }
    setIsChecking(false);
  }, [user?.id, user?.is_verified, user?.verification_status]);

  // Check on mount
  useEffect(() => {
    checkVerification();
  }, [checkVerification]);

  // Load recent trips from Supabase
  useEffect(() => {
    if (!user?.id) return;
    const loadTrips = async () => {
      try {
        const data = await apiGet('trips', { eq: { driver_id: user.id }, order: 'created_at', ascending: false });
        setRecentTrips((data || []).slice(0, 5));
      } catch (e) { console.error('Failed to load trips:', e); }
    };
    loadTrips();
  }, [user?.id]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    // Double-check before publishing
    if (!canPublish) {
      toast.error('Please complete verification before publishing rides.');
      navigate('/verification');
      return;
    }

    if (from === to) {
      toast.error('Departure and arrival must be different');
      return;
    }

    setIsPublishing(true);

    try {
      const tripData: any = {
        driver_id: user.id,
        from_location: from,
        to_location: to,
        departure_date: date,
        departure_time: time,
        arrival_time: '',
        price: parseFloat(price),
        available_seats: parseInt(seats),
        total_seats: parseInt(seats),
        status: 'upcoming',
      };

      // Save to Supabase via REST API with JWT
      const result = await apiPost('trips', tripData);
      if (!result || !result[0]?.id) {
        throw new Error('Failed to save trip to database');
      }

      toast.success('Trip published!');
      setFrom(''); setTo(''); setDate(''); setTime(''); setPrice(''); setSeats('3'); setDistance(''); setDuration('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish');
    }
    setIsPublishing(false);
  };

  // ─── LOADING STATE ───
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 pb-24 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin mx-auto mb-4" />
          <p className="text-[#A0A0A0]">Checking verification status...</p>
        </div>
      </div>
    );
  }

  // ─── NOT VERIFIED → SHOW BLOCKING MESSAGE ───
  if (!canPublish) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5">
              <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white" dir={dir}>Offer a ride</h1>
              <p className="text-sm text-[#A0A0A0]">Share your journey and save money</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1B1F27] rounded-2xl border border-white/5 p-8 text-center"
          >
            {/* Status Icon */}
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center mx-auto mb-4">
              {verifStatus === 'pending' || verifStatus === 'submitted' ? (
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              ) : verifStatus === 'rejected' ? (
                <ShieldAlert className="w-8 h-8 text-red-400" />
              ) : (
                <Shield className="w-8 h-8 text-[#FF6B00]" />
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white mb-2">
              {verifStatus === 'pending' || verifStatus === 'submitted'
                ? 'Under Review'
                : verifStatus === 'rejected'
                ? 'Verification Rejected'
                : 'Verification Required'}
            </h2>

            {/* Message */}
            <p className="text-sm text-[#A0A0A0] mb-6 leading-relaxed">
              {verifMessage}
            </p>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 mb-6">
              <span className="text-xs text-[#A0A0A0]">Current status:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                verifStatus === 'verified' || verifStatus === 'approved'
                  ? 'bg-green-500/10 text-green-400'
                  : verifStatus === 'pending' || verifStatus === 'submitted'
                  ? 'bg-blue-500/10 text-blue-400'
                  : verifStatus === 'rejected'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-white/5 text-[#A0A0A0]'
              }`}>
                {verifStatus}
              </span>
            </div>

            {/* Action Button */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/verification')}
                className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 font-semibold"
              >
                {verifStatus === 'rejected'
                  ? 'Update Documents'
                  : verifStatus === 'pending' || verifStatus === 'submitted'
                  ? 'View Status'
                  : 'Start Verification'}
              </Button>

              <Button
                onClick={checkVerification}
                variant="outline"
                className="w-full border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl"
              >
                Refresh Status
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── VERIFIED → SHOW PUBLISH FORM ───
  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white" dir={dir}>Offer a ride</h1>
            <p className="text-sm text-[#A0A0A0]">Share your journey and save money</p>
          </div>
          {/* Verified Badge */}
          <div className="ml-auto">
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 font-medium">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          </div>
        </div>

        {/* Publish Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6">
          <form onSubmit={handlePublish} className="space-y-4">
            {/* Route */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.from')}
                </Label>
                <select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                  <option value="">{t('common.select_city')}</option>
                  {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.to')}
                </Label>
                <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                  <option value="">{t('common.select_city')}</option>
                  {MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.date')}
                </Label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
              </div>
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.time')}
                </Label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
              </div>
            </div>

            {/* Price & Seats */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.price')}
                </Label>
                <Input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="100" className="bg-[#0F1115] border-white/10 text-white rounded-xl" required />
              </div>
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.seats')}
                </Label>
                <select value={seats} onChange={e => setSeats(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none">
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* ─── Price Suggestions ─── */}
              {priceSuggestion && (
                <div className="bg-[#0F1115] border border-[#FF6B00]/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#FF6B00]">💡 Prix suggérés</span>
                    <span className="text-xs text-[#A0A0A0]">— {priceSuggestion.km} km · moins cher que le bus</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Économique', value: priceSuggestion.min, color: 'text-blue-400' },
                      { label: 'Recommandé', value: priceSuggestion.suggested, color: 'text-[#FF6B00]' },
                      { label: 'Confortable', value: priceSuggestion.max, color: 'text-green-400' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setPrice(String(opt.value))}
                        className={`rounded-xl border p-2 text-center transition-all ${
                          price === String(opt.value)
                            ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <p className={`text-sm font-bold ${opt.color}`}>{opt.value} <span className="text-[10px] font-normal text-[#A0A0A0]">MAD</span></p>
                        <p className="text-[10px] text-white mt-0.5 font-medium">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Distance & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.distance')}</Label>
                <Input type="text" value={distance} onChange={e => setDistance(e.target.value)} placeholder="240 km" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.duration')}</Label>
                <Input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="2h 30min" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              </div>
            </div>

            {/* Publish Button */}
            <Button type="submit" disabled={isPublishing} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-13 text-base font-semibold disabled:opacity-50 mt-2 shadow-lg shadow-[#FF6B00]/20">
              {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Publish Ride</>}
            </Button>

            <p className="text-center text-xs text-[#A0A0A0] mt-2">
              By publishing, you agree to our <span className="text-[#FF6B00]">Terms of Service</span>
            </p>
          </form>
        </motion.div>

        {/* Recent Published */}
        {recentTrips.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
            <h2 className="text-lg font-bold text-white mb-4">Recently Published</h2>
            <div className="space-y-3">
              {recentTrips.map((trip, idx) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4 flex items-center gap-4 cursor-pointer hover:border-[#FF6B00]/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center">
                    <CarFront className="w-5 h-5 text-[#FF6B00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{trip.from_location} &rarr; {trip.to_location}</p>
                    <p className="text-xs text-[#A0A0A0]">{trip.departure_date} &middot; {trip.departure_time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#FF6B00]">{trip.price} MAD</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <Button onClick={() => navigate('/driver')} variant="outline" className="w-full mt-4 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl">
              View All My Rides <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
