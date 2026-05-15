import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { MOCK_TRIPS } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Wallet, Banknote, Check, Minus, Plus, Lock, Loader2 } from 'lucide-react';

type PaymentMethod = 'card' | 'wallet' | 'cash';

export function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addBooking } = useStore();
  const trip = MOCK_TRIPS.find(t => t.id === id);
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">Trip not found</h2>
          <Button onClick={() => navigate('/search')} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] rounded-xl">Back to search</Button>
        </div>
      </div>
    );
  }

  const totalPrice = trip.price * seats;
  const serviceFee = Math.round(totalPrice * 0.05);
  const finalTotal = totalPrice + serviceFee;

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const booking = { id: `B${Date.now()}`, trip_id: trip.id, passenger_id: 'current-user', seats, status: 'confirmed' as const, total_price: finalTotal, created_at: new Date().toISOString() };
      addBooking(booking);
      setIsProcessing(false);
      setStep(3);
      toast.success('Booking confirmed!');
    }, 2000);
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="w-20 h-20 bg-[#FF6B00]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#FF6B00]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
          <p className="text-[#A0A0A0] mb-8">{trip.from_location} &rarr; {trip.to_location}</p>
          <div className="bg-[#1B1F27] rounded-2xl border border-[#FF6B00]/20 p-6 mb-8 text-left space-y-3">
            <div className="flex justify-between"><span className="text-sm text-[#A0A0A0]">Date</span><span className="text-sm text-white">{trip.departure_date} at {trip.departure_time}</span></div>
            <div className="flex justify-between"><span className="text-sm text-[#A0A0A0]">Seats</span><span className="text-sm text-white">{seats}</span></div>
            <div className="flex justify-between pt-3 border-t border-white/5"><span className="font-semibold text-white">Total</span><span className="font-bold text-[#FF6B00]">{finalTotal} MAD</span></div>
          </div>
          <Button onClick={() => navigate('/dashboard')} className="w-full bg-[#FF6B00] text-white rounded-xl py-6 font-semibold mb-3">View My Trips</Button>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-white/10 text-[#A0A0A0] rounded-xl py-6">Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => step === 1 ? navigate(`/trip/${trip.id}`) : setStep(1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></button>
          <h1 className="text-xl font-bold text-white">{step === 1 ? 'Select Seats' : 'Payment'}</h1>
        </div>

        {/* Trip Summary */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A0A0A0]">{trip.departure_date} &middot; {trip.departure_time}</p>
              <p className="text-white font-medium">{trip.from_location} &rarr; {trip.to_location}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#FF6B00]">{trip.price} MAD</p>
              <p className="text-xs text-[#A0A0A0]">per seat</p>
            </div>
          </div>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
              <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4">Number of seats</h3>
              <div className="flex items-center justify-between">
                <button onClick={() => setSeats(Math.max(1, seats - 1))} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#FF6B00]/20 transition-colors"><Minus className="w-5 h-5 text-white" /></button>
                <span className="text-4xl font-bold text-white">{seats}</span>
                <button onClick={() => setSeats(Math.min(trip.available_seats, seats + 1))} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#FF6B00]/20 transition-colors"><Plus className="w-5 h-5 text-white" /></button>
              </div>
              <p className="text-xs text-[#A0A0A0] mt-4 text-center">{trip.available_seats} seats available</p>
            </div>
            <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6 space-y-3">
              <div className="flex justify-between"><span className="text-sm text-[#A0A0A0]">{trip.price} MAD &times; {seats}</span><span className="text-sm text-white">{totalPrice} MAD</span></div>
              <div className="flex justify-between"><span className="text-sm text-[#A0A0A0]">Service fee (5%)</span><span className="text-sm text-white">{serviceFee} MAD</span></div>
              <div className="flex justify-between pt-3 border-t border-white/5"><span className="font-semibold text-white">Total</span><span className="font-bold text-[#FF6B00]">{finalTotal} MAD</span></div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl py-6 text-base font-semibold">Continue to Payment</Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
              <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4">Payment Method</h3>
              <div className="space-y-3">
                {[
                  { id: 'card' as PaymentMethod, icon: CreditCard, title: 'Credit/Debit Card', desc: 'Visa, Mastercard' },
                  { id: 'wallet' as PaymentMethod, icon: Wallet, title: 'Wansni Wallet', desc: 'Balance: 450 MAD' },
                  { id: 'cash' as PaymentMethod, icon: Banknote, title: 'Cash', desc: 'Pay directly to driver' },
                ].map(m => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${paymentMethod === m.id ? 'border-[#FF6B00]/50 bg-[#FF6B00]/5' : 'border-white/5 hover:border-white/10'}`}>
                    <m.icon className="w-5 h-5 text-[#FF6B00]" />
                    <div className="flex-1 text-left">
                      <p className="text-sm text-white font-medium">{m.title}</p>
                      <p className="text-xs text-[#A0A0A0]">{m.desc}</p>
                    </div>
                    {paymentMethod === m.id && <Check className="w-5 h-5 text-[#FF6B00]" />}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'card' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6 space-y-4">
                <div><Label className="text-sm text-[#A0A0A0] mb-2 block">Card Number</Label><Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-sm text-[#A0A0A0] mb-2 block">Expiry</Label><Input placeholder="MM/YY" value={expiry} onChange={e => setExpiry(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" /></div>
                  <div><Label className="text-sm text-[#A0A0A0] mb-2 block">CVV</Label><Input placeholder="123" value={cvv} onChange={e => setCvv(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" /></div>
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-2 mb-6 text-sm text-[#A0A0A0]"><Lock className="w-4 h-4 text-[#FF6B00]" /><span>Secured with SSL encryption</span></div>
            <Button onClick={handleConfirm} disabled={isProcessing} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl py-6 text-base font-semibold disabled:opacity-50">
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ${finalTotal} MAD`}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
