import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import {
  Users, ShieldCheck, Car, MessageSquare, UserCheck, UserX, Clock, ChevronRight,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface Stats {
  totalUsers: number;
  totalDrivers: number;
  totalPassengers: number;
  pendingVerifications: number;
  approvedDrivers: number;
  rejectedVerifications: number;
  totalTrips: number;
  totalMessages: number;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_verified: boolean;
  verification_status: string;
  created_at: string;
  avatar: string;
}

interface PendingVerification {
  id: string;
  user_id: string;
  doc_type: string;
  status: string;
  created_at: string;
  user_name: string;
  user_email: string;
  user_avatar: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalDrivers: 0, totalPassengers: 0,
    pendingVerifications: 0, approvedDrivers: 0, rejectedVerifications: 0,
    totalTrips: 0, totalMessages: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();

      const [usersRes, verifRes, tripsRes, msgsRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc&limit=500`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/verifications?select=*&order=created_at.desc&limit=200`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/trips?select=id,status&limit=500`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/messages?select=id&limit=500`, { headers }),
      ]);

      const users = usersRes.ok ? await usersRes.json() : [];
      const verifications = verifRes.ok ? await verifRes.json() : [];
      const trips = tripsRes.ok ? await tripsRes.json() : [];
      const msgs = msgsRes.ok ? await msgsRes.json() : [];

      const drivers = (users || []).filter((u: any) => u.role === 'driver');
      const passengers = (users || []).filter((u: any) => u.role === 'passenger');
      const verified = (users || []).filter((u: any) => u.is_verified);
      const pending = (verifications || []).filter((v: any) => v.status === 'uploaded' || v.status === 'pending');
      const rejected = (verifications || []).filter((v: any) => v.status === 'rejected');

      setStats({
        totalUsers: (users || []).length,
        totalDrivers: drivers.length,
        totalPassengers: passengers.length,
        approvedDrivers: verified.length,
        pendingVerifications: pending.length,
        rejectedVerifications: rejected.length,
        totalTrips: (trips || []).length,
        totalMessages: (msgs || []).length,
      });

      setRecentUsers((users || []).slice(0, 5).map((u: any) => ({
        id: u.id,
        name: u.name || 'Unknown',
        email: u.email || '',
        role: u.role || 'passenger',
        is_verified: u.is_verified || false,
        verification_status: u.verification_status || 'unverified',
        created_at: u.created_at,
        avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`,
      })));

      // O(1) user lookup with Map
      const usersMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));

      const pendingWithUsers = pending.slice(0, 5).map((v: any) => {
        const user = usersMap.get(v.user_id);
        return {
          id: v.id,
          user_id: v.user_id,
          doc_type: v.doc_type,
          status: v.status,
          created_at: v.created_at,
          user_name: user?.name || 'Unknown',
          user_email: user?.email || '',
          user_avatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.user_id}`,
        };
      });
      setPendingVerifications(pendingWithUsers);

    } catch (err: any) {
      console.error('[AdminDashboard] Error:', err);
    }
    setLoading(false);
  }, [getHeaders]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  // Realtime subscriptions for live stats
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verifications' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadDashboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadDashboardData]);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500/10 text-blue-400', link: '/admin/users' },
    { label: 'Drivers', value: stats.totalDrivers, icon: Car, color: 'bg-[#FF6B00]/10 text-[#FF6B00]', link: '/admin/users' },
    { label: 'Passengers', value: stats.totalPassengers, icon: Users, color: 'bg-green-500/10 text-green-400', link: '/admin/users' },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: ShieldCheck, color: 'bg-yellow-500/10 text-yellow-400', link: '/admin/verifications' },
    { label: 'Verified Users', value: stats.approvedDrivers, icon: UserCheck, color: 'bg-purple-500/10 text-purple-400', link: '/admin/verifications' },
    { label: 'Total Trips', value: stats.totalTrips, icon: Car, color: 'bg-cyan-500/10 text-cyan-400', link: '/admin/trips' },
    { label: 'Messages', value: stats.totalMessages, icon: MessageSquare, color: 'bg-pink-500/10 text-pink-400', link: '/admin/messages' },
    { label: 'Rejected', value: stats.rejectedVerifications, icon: UserX, color: 'bg-red-500/10 text-red-400', link: '/admin/verifications' },
  ];

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const docTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cin: 'National ID', selfie: 'Selfie', license: 'Driver License',
      registration: 'Vehicle Registration', insurance: 'Insurance',
    };
    return labels[type] || type;
  };

  const verificationStatusLabel = (u: RecentUser) => {
    if (u.is_verified) return { label: 'Verified', cls: 'bg-green-500/10 text-green-400' };
    if (u.verification_status === 'submitted' || u.verification_status === 'pending') return { label: 'Pending Review', cls: 'bg-blue-500/10 text-blue-400' };
    if (u.verification_status === 'rejected') return { label: 'Rejected', cls: 'bg-red-500/10 text-red-400' };
    return { label: 'Unverified', cls: 'bg-yellow-500/10 text-yellow-400' };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#A0A0A0]">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={card.link} className="block bg-[#111318] rounded-2xl border border-white/5 p-5 hover:border-[#FF6B00]/20 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-[#A0A0A0] mt-0.5">{card.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#111318] rounded-2xl border border-white/5">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Users</h3>
            <Link to="/admin/users" className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-[#A0A0A0] mx-auto mb-2" />
                <p className="text-sm text-[#A0A0A0]">No users yet</p>
              </div>
            ) : (
              recentUsers.map((user) => {
                const vs = verificationStatusLabel(user);
                return (
                  <div key={user.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                    <img src={user.avatar} alt="" className="w-10 h-10 rounded-full bg-[#1B1F27]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-[#A0A0A0] truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                        user.role === 'driver' ? 'bg-[#FF6B00]/10 text-[#FF6B00]' :
                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>{user.role}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${vs.cls}`}>{vs.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[#111318] rounded-2xl border border-white/5">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Pending Verifications</h3>
            <Link to="/admin/verifications" className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1">
              Review all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {pendingVerifications.length === 0 ? (
              <div className="p-8 text-center">
                <ShieldCheck className="w-8 h-8 text-[#A0A0A0] mx-auto mb-2" />
                <p className="text-sm text-[#A0A0A0]">No pending verifications</p>
              </div>
            ) : (
              pendingVerifications.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                  <img src={v.user_avatar} alt="" className="w-10 h-10 rounded-full bg-[#1B1F27]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{v.user_name}</p>
                    <p className="text-xs text-[#A0A0A0]">{docTypeLabel(v.doc_type)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                    <span className="text-[10px] text-[#A0A0A0]">{formatDate(v.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 bg-[#111318] rounded-2xl border border-white/5 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/admin/verifications" className="flex items-center gap-3 px-4 py-4 bg-[#FF6B00]/10 text-[#FF6B00] rounded-2xl text-sm font-medium hover:bg-[#FF6B00]/20 active:bg-[#FF6B00]/30 transition-colors min-h-[56px]">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Review Verifications</span>
          </Link>
          <Link to="/admin/users" className="flex items-center gap-3 px-4 py-4 bg-blue-500/10 text-blue-400 rounded-2xl text-sm font-medium hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors min-h-[56px]">
            <Users className="w-5 h-5 shrink-0" />
            <span>Manage Users</span>
          </Link>
          <Link to="/admin/trips" className="flex items-center gap-3 px-4 py-4 bg-green-500/10 text-green-400 rounded-2xl text-sm font-medium hover:bg-green-500/20 active:bg-green-500/30 transition-colors min-h-[56px]">
            <Car className="w-5 h-5 shrink-0" />
            <span>View Trips</span>
          </Link>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
