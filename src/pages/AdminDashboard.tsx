import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { MOCK_USERS, MOCK_TRIPS } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Users, Car, Shield, DollarSign, Search } from 'lucide-react';

export function AdminDashboard() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'trips'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const allUsers = MOCK_USERS;
  const allTrips = MOCK_TRIPS;
  const unverified = allUsers.filter(u => !u.is_verified);

  const stats = [
    { label: 'Users', value: 1247, icon: Users, change: '+12%' },
    { label: 'Active Trips', value: allTrips.length, icon: Car, change: '+8%' },
    { label: 'Revenue', value: '45.2K', icon: DollarSign, prefix: 'MAD' },
    { label: 'Pending Verif.', value: unverified.length, icon: Shield },
  ];

  const recentActivity = [
    { action: 'New user registered', time: '2 min ago' },
    { action: 'Trip: Casablanca \u2192 Marrakech', time: '5 min ago' },
    { action: 'Verification from Youssef A.', time: '10 min ago' },
    { action: 'Payment: 240 MAD received', time: '15 min ago' },
  ];

  

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-bold text-white">Admin Panel</h1><p className="text-sm text-[#A0A0A0] mt-1">Welcome, {user?.name}</p></div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20"><Shield className="w-4 h-4 text-[#FF6B00]" /><span className="text-xs text-[#FF6B00] font-medium">Admin</span></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-2"><s.icon className="w-5 h-5 text-[#FF6B00]" />{s.change && <span className="text-xs text-green-400">{s.change}</span>}</div>
              <p className="text-2xl font-bold text-white">{s.prefix}{s.value}</p>
              <p className="text-xs text-[#A0A0A0]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-1 p-1 bg-[#1B1F27] rounded-xl mb-6 border border-white/5">
          {(['overview', 'users', 'trips'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-[#A0A0A0] hover:text-white'}`}>{tab}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#1B1F27] rounded-2xl border border-white/5 p-6">
              <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4">Revenue</h3>
              <div className="h-40 flex items-end gap-1.5">
                {[65,45,80,55,70,90,60,75,85,50,95,70].map((h,i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-[#FF6B00]/20 rounded-t-lg hover:bg-[#FF6B00]/40 transition-colors" style={{ height: `${h*1.5}px` }} />
                    <span className="text-[10px] text-[#A0A0A0]">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6">
              <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 shrink-0" />
                    <div><p className="text-sm text-white">{a.action}</p><p className="text-xs text-[#A0A0A0]">{a.time}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-10 bg-[#0F1115] border-white/10 text-white rounded-xl" /></div>
            </div>
            <div className="divide-y divide-white/5">
              {allUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="p-4 flex items-center gap-4">
                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF6B00]/20" />
                  <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">{u.name}</p><p className="text-xs text-[#A0A0A0]">{u.email}</p></div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : u.role === 'driver' ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'bg-white/5 text-[#A0A0A0]'}`}>{u.role}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${u.is_verified ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{u.is_verified ? 'Verified' : 'Pending'}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">All Trips</h3></div>
            <div className="divide-y divide-white/5">
              {allTrips.map((trip, i) => (
                <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center"><Car className="w-5 h-5 text-[#FF6B00]" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">{trip.from_location} &rarr; {trip.to_location}</p><p className="text-xs text-[#A0A0A0]">{trip.driver?.name} &middot; {trip.departure_date}</p></div>
                  <span className="text-sm text-[#FF6B00] font-bold">{trip.price} MAD</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${trip.status === 'upcoming' ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : trip.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{trip.status}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
