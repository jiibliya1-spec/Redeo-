import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { encodeText } from '@/lib/notifText';
import { resolveAvatar } from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, Search, UserCheck, UserX, Shield, Loader2, ChevronLeft, ChevronRight, Mail, Phone } from 'lucide-react';
import { Car } from '@/components/icons/CarIcon';


import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_verified: boolean;
  verification_status: string;
  rating: number;
  trips_count: number;
  avatar: string;
  bio: string;
  created_at: string;
  doc_count: number;
}

type RoleFilter = 'all' | 'passenger' | 'driver' | 'admin';
type VerifyFilter = 'all' | 'verified' | 'unverified';

export function AdminUsers() {
  const { t, lang } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const getHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
    };
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();

      // Fetch ALL profiles
      const usersRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc&limit=500`,
        { headers }
      );
      
      if (!usersRes.ok) {
        const errorText = await usersRes.text();
        console.error('[AdminUsers] Error response:', errorText.substring(0, 500));
        throw new Error('Server returned: ' + usersRes.status + ' ' + usersRes.statusText);
      }
      
      const profiles = await usersRes.json();

      // Get verification counts
      const verifsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/verifications?select=user_id`,
        { headers }
      );
      let verifs: any[] = [];
      if (verifsRes.ok) {
        verifs = await verifsRes.json();
      } else {
        console.warn('[AdminUsers] Verifications fetch failed:', verifsRes.status);
      }

      const combined = (profiles || []).map((p: any) => {
        const userVerifs = verifs?.filter((v: any) => v.user_id === p.id) || [];
        return {
          ...p,
          doc_count: userVerifs.length,
          is_verified: p.is_verified || false,
          verification_status: p.verification_status || 'unverified',
          avatar: resolveAvatar(p.avatar, p.id),
        };
      });

      setUsers(combined);
    } catch (err: any) {
      toast.error(t('adm.err_load') + ': ' + err.message);
      console.error('[AdminUsers]', err);
    }
    setLoading(false);
  }, [getHeaders]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let result = users;
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (verifyFilter !== 'all') {
      result = result.filter((u) => (verifyFilter === 'verified' ? u.is_verified : !u.is_verified));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
    setPage(1);
  }, [users, roleFilter, verifyFilter, search]);

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    setProcessingId(userId);
    try {
      const headers = { ...(await getHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            is_verified: !currentStatus,
            verification_status: !currentStatus ? 'verified' : 'unverified',
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());

      if (!currentStatus) {
        // same notification the document-review flow sends (language-neutral)
        fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId, type: 'verification_approved',
            title: encodeText('notif.verif_approved_title'), message: encodeText('notif.verif_approved_msg'),
            data: JSON.stringify({ status: 'approved' }), read: false, created_at: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_verified: !currentStatus } : u)));
      toast.success(t(!currentStatus ? 'adm.user_verified' : 'adm.user_unverified'));
    } catch (err: any) {
      toast.error(t('adm.err_update') + ': ' + err.message);
    }
    setProcessingId(null);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setProcessingId(userId);
    try {
      const headers = { ...(await getHeaders()), 'Content-Type': 'application/json' };
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!res.ok) throw new Error(await res.text());

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success(t('adm.role_updated', { r: t(newRole === 'admin' ? 'adm.admin_e3af' : newRole === 'driver' ? 'adm.driver_48cf' : 'adm.passenger_bf25') }));
    } catch (err: any) {
      toast.error(t('adm.err_update') + ': ' + err.message);
    }
    setProcessingId(null);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-MA-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const roleCounts = {
    all: users.length,
    passenger: users.filter((u) => u.role === 'passenger').length,
    driver: users.filter((u) => u.role === 'driver').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{t('adm.user_management_9272')}</h2>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{t('adm.manage_all_registered_users_5d80')}</p>
        </div>
        <Button onClick={loadUsers} variant="outline" className="border-white/10 text-[#A0A0A0] rounded-xl">
          <Loader2 className="w-4 h-4 mr-2" /> {t('adm.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {([
          { key: 'all' as RoleFilter, label: t('adm.all_users_9d37'), count: roleCounts.all, icon: Users, color: 'text-white' },
          { key: 'passenger' as RoleFilter, label: t('adm.passengers_5865'), count: roleCounts.passenger, icon: Users, color: 'text-green-400' },
          { key: 'driver' as RoleFilter, label: t('adm.drivers_8e64'), count: roleCounts.driver, icon: Car, color: 'text-[#FF6B00]' },
          { key: 'admin' as RoleFilter, label: t('adm.admins_3124'), count: roleCounts.admin, icon: Shield, color: 'text-purple-400' },
        ]).map((s) => (
          <button
            key={s.key}
            onClick={() => setRoleFilter(s.key)}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
              roleFilter === s.key ? 'bg-[#FF6B00]/5 border-[#FF6B00]/20' : 'bg-[#111318] border-white/5 hover:border-white/10'
            }`}
          >
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-lg font-bold text-white">{s.count}</p>
              <p className="text-[10px] text-[#A0A0A0] uppercase">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('adm.search_users_f5e8')}
            className="pl-11 bg-[#111318] border-white/5 text-white rounded-xl h-11"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: 'all' as VerifyFilter, label: t('adm.all_b1c9') },
            { key: 'verified' as VerifyFilter, label: t('adm.verified_3f68') },
            { key: 'unverified' as VerifyFilter, label: t('adm.unverified_d5ca') },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setVerifyFilter(f.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                verifyFilter === f.key ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'bg-[#111318] text-[#A0A0A0] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111318] rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Users className="w-10 h-10 text-[#A0A0A0] mb-3" />
            <p className="text-sm text-[#A0A0A0]">{t('adm.no_users_found_3bf7')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.user_8f9b')}</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.contact_bbaf')}</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.role_bbba')}</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.status_ec53')}</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.docs_a390')}</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.joined_7d50')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginated.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} alt="" className="w-10 h-10 rounded-full bg-[#1B1F27]" />
                          <div>
                            <p className="text-sm font-medium text-white">{user.name || t('adm.unknown')}</p>
                            {user.bio && <p className="text-xs text-[#A0A0A0] line-clamp-1 max-w-[150px]">{user.bio}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
                            <Mail className="w-3 h-3" /> {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
                              <Phone className="w-3 h-3" /> {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          disabled={processingId === user.id}
                          className="bg-[#0A0C10] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6B00]/30"
                        >
                          <option value="passenger">{t('adm.passenger_bf25')}</option>
                          <option value="driver">{t('adm.driver_48cf')}</option>
                          <option value="admin">{t('adm.admin_e3af')}</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleVerify(user.id, user.is_verified)}
                          disabled={processingId === user.id}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-all ${
                            user.is_verified
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                          } disabled:opacity-50`}
                        >
                          {processingId === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : user.is_verified ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <UserX className="w-3 h-3" />
                          )}
                          {t(user.is_verified ? 'adm.verified_3f68' : 'adm.unverified_d5ca')}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#A0A0A0]">{user.doc_count}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#A0A0A0]">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
                <p className="text-xs text-[#A0A0A0]">
                  Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-[#A0A0A0] px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
