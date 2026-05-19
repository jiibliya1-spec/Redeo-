import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ShieldCheck, Check, X, Search, CreditCard, Camera, FileText,
  Shield, Clock, UserCheck, UserX, AlertCircle, Eye, Loader2, Car,
  ChevronRight, ZoomIn,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface VerificationRecord {
  id: string;
  user_id: string;
  doc_type: string;
  status: string;
  url?: string;
  public_url?: string;
  storage_path?: string;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_avatar: string;
  user_role: string;
}

/** One entry per unique user in the verifications table */
interface UserBundle {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string;
  user_role: string;
  docs: VerificationRecord[];
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  latestDate: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const docIcons: Record<string, any> = {
  cin: CreditCard, selfie: Camera, license: FileText,
  registration: FileText, insurance: Shield,
  cin_front: CreditCard, cin_back: CreditCard,
  driver_license: FileText, car_photo_front: Car, car_photo_back: Car,
};

const docLabels: Record<string, string> = {
  cin: 'National ID (CIN)', selfie: 'Selfie', license: 'Driver License',
  registration: 'Vehicle Registration', insurance: 'Insurance',
  cin_front: 'CIN – Front', cin_back: 'CIN – Back',
  driver_license: 'Driver License',
  car_photo_front: 'Car – Front', car_photo_back: 'Car – Back',
};

function getDocLabel(t: string) { return docLabels[t] || t; }
function getDocIcon(t: string) { return docIcons[t] || FileText; }
function getDocUrl(v: VerificationRecord): string | null { return v.public_url || v.url || null; }

const CACHE_KEY = 'admin_verifications_cache';
function saveCache(data: VerificationRecord[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function loadCache(): VerificationRecord[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (Date.now() - p.ts < 5 * 60 * 1000) return p.data as VerificationRecord[];
  } catch {}
  return [];
}

function buildBundles(verifications: VerificationRecord[]): UserBundle[] {
  const map = new Map<string, UserBundle>();
  for (const v of verifications) {
    if (!map.has(v.user_id)) {
      map.set(v.user_id, {
        user_id: v.user_id, user_name: v.user_name, user_email: v.user_email,
        user_avatar: v.user_avatar, user_role: v.user_role,
        docs: [], pendingCount: 0, approvedCount: 0, rejectedCount: 0,
        latestDate: v.created_at,
      });
    }
    const b = map.get(v.user_id)!;
    b.docs.push(v);
    if (v.status === 'pending' || v.status === 'uploaded') b.pendingCount++;
    else if (v.status === 'approved' || v.status === 'verified') b.approvedCount++;
    else if (v.status === 'rejected') b.rejectedCount++;
    if (v.created_at > b.latestDate) b.latestDate = v.created_at;
  }
  return [...map.values()].sort((a, b) =>
    b.latestDate.localeCompare(a.latestDate)
  );
}

export function AdminVerifications() {
  const cached = loadCache();
  const [verifications, setVerifications] = useState<VerificationRecord[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const usersMapRef = useRef<Map<string, any>>(new Map());

  const getHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const buildRecord = useCallback((v: any): VerificationRecord => {
    const u = usersMapRef.current.get(v.user_id);
    return {
      ...v,
      user_name: u?.name || v.user_name || 'Unknown',
      user_email: u?.email || v.user_email || '',
      user_avatar: u?.avatar || v.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.user_id}`,
      user_role: u?.role || v.user_role || 'passenger',
    };
  }, []);

  const loadVerifications = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const headers = await getHeaders();
      const verifRes = await fetch(
        `${SUPABASE_URL}/rest/v1/verifications?select=*&order=created_at.desc&limit=300`,
        { headers }
      );
      if (!verifRes.ok) throw new Error('Status ' + verifRes.status);
      const verifData: any[] = await verifRes.json();

      const userIds = [...new Set<string>(verifData.map((v) => v.user_id).filter(Boolean))];
      let usersData: any[] = [];
      if (userIds.length > 0) {
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,avatar,role&id=in.(${userIds.join(',')})`,
          { headers }
        );
        if (profileRes.ok) usersData = await profileRes.json();
      }

      usersMapRef.current = new Map<string, any>(usersData.map((u: any) => [u.id, u]));
      const combined: VerificationRecord[] = verifData.map((v) => {
        const u = usersMapRef.current.get(v.user_id);
        return {
          ...v,
          user_name: u?.name || 'Unknown', user_email: u?.email || '',
          user_avatar: u?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.user_id}`,
          user_role: u?.role || 'passenger',
        };
      });

      setVerifications(combined);
      saveCache(combined);
    } catch (err: any) {
      toast.error('Failed to load: ' + err.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, [getHeaders]);

  useEffect(() => { loadVerifications(cached.length > 0); }, []);

  /* Realtime */
  useEffect(() => {
    const channel = supabase
      .channel('admin-verif-rt-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'verifications' }, (p) => {
        const r = buildRecord(p.new as any);
        setVerifications((prev) => { const n = [r, ...prev.filter((v) => v.id !== r.id)]; saveCache(n); return n; });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'verifications' }, (p) => {
        const r = buildRecord(p.new as any);
        setVerifications((prev) => { const n = prev.map((v) => v.id === r.id ? { ...v, ...r } : v); saveCache(n); return n; });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'verifications' }, (p) => {
        setVerifications((prev) => { const n = prev.filter((v) => v.id !== (p.old as any)?.id); saveCache(n); return n; });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [buildRecord]);

  /* ─── Approve ALL docs for user ─── */
  const handleApproveUser = async (bundle: UserBundle) => {
    setProcessing(true);
    try {
      const headers = await getHeaders();
      const pendingDocs = bundle.docs.filter((d) => d.status === 'pending' || d.status === 'uploaded');

      // Approve each pending doc
      await Promise.all(pendingDocs.map((doc) =>
        fetch(`${SUPABASE_URL}/rest/v1/verifications?id=eq.${doc.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'approved', admin_notes: 'Approved by admin', updated_at: new Date().toISOString() }),
        })
      ));

      // Update profile
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${bundle.user_id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_verified: true, verification_status: 'verified', updated_at: new Date().toISOString() }),
      });

      // Notify user
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: bundle.user_id, type: 'verification_approved',
          title: 'Documents Approved ✅',
          message: 'Your verification documents have been approved! You can now publish trips and use all features.',
          data: JSON.stringify({ status: 'approved' }), read: false, created_at: new Date().toISOString(),
        }),
      });

      toast.success(`✅ ${bundle.user_name} verified — all ${pendingDocs.length} document(s) approved`);
      setSelectedUserId(null);
      await loadVerifications(true);
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
    setProcessing(false);
  };

  /* ─── Reject ALL docs for user ─── */
  const handleRejectUser = async (bundle: UserBundle) => {
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    setProcessing(true);
    try {
      const headers = await getHeaders();
      const pendingDocs = bundle.docs.filter((d) => d.status === 'pending' || d.status === 'uploaded');

      await Promise.all(pendingDocs.map((doc) =>
        fetch(`${SUPABASE_URL}/rest/v1/verifications?id=eq.${doc.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            status: 'rejected', admin_notes: rejectReason,
            rejection_reason: rejectReason, updated_at: new Date().toISOString(),
          }),
        })
      ));

      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${bundle.user_id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ verification_status: 'rejected', is_verified: false, updated_at: new Date().toISOString() }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: bundle.user_id, type: 'verification_rejected',
          title: 'Documents Rejected ❌',
          message: `Your verification was rejected. Reason: ${rejectReason}. Please re-upload your documents.`,
          data: JSON.stringify({ status: 'rejected', reason: rejectReason }), read: false, created_at: new Date().toISOString(),
        }),
      });

      toast.success(`❌ ${bundle.user_name}'s verification rejected`);
      setSelectedUserId(null);
      setRejectReason('');
      setShowRejectPanel(false);
      await loadVerifications(true);
    } catch (err: any) {
      toast.error('Rejection failed: ' + err.message);
    }
    setProcessing(false);
  };

  /* Build bundles + filter */
  const allBundles = buildBundles(verifications);

  const filteredBundles = allBundles.filter((b) => {
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'pending' ? b.pendingCount > 0 :
      statusFilter === 'approved' ? b.approvedCount > 0 && b.pendingCount === 0 :
      b.rejectedCount > 0 && b.pendingCount === 0;

    const q = search.toLowerCase().trim();
    const matchSearch = !q || b.user_name.toLowerCase().includes(q) || b.user_email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const selectedBundle = selectedUserId ? allBundles.find((b) => b.user_id === selectedUserId) ?? null : null;

  const counts = {
    all: allBundles.length,
    pending: allBundles.filter((b) => b.pendingCount > 0).length,
    approved: allBundles.filter((b) => b.approvedCount > 0 && b.pendingCount === 0).length,
    rejected: allBundles.filter((b) => b.rejectedCount > 0 && b.pendingCount === 0).length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getBundleStatus = (b: UserBundle) => {
    if (b.pendingCount > 0) return { label: 'Needs Review', cls: 'bg-yellow-500/10 text-yellow-400', icon: Clock };
    if (b.approvedCount > 0 && b.rejectedCount === 0) return { label: 'Verified', cls: 'bg-green-500/10 text-green-400', icon: UserCheck };
    if (b.rejectedCount > 0) return { label: 'Rejected', cls: 'bg-red-500/10 text-red-400', icon: UserX };
    return { label: 'No Pending', cls: 'bg-white/5 text-[#A0A0A0]', icon: ShieldCheck };
  };

  const getDocStatus = (status: string) => {
    if (status === 'approved' || status === 'verified') return { dot: 'bg-green-400', label: 'Approved', text: 'text-green-400' };
    if (status === 'rejected') return { dot: 'bg-red-400', label: 'Rejected', text: 'text-red-400' };
    if (status === 'uploaded') return { dot: 'bg-yellow-400', label: 'Uploaded', text: 'text-yellow-400' };
    return { dot: 'bg-blue-400', label: 'Pending', text: 'text-blue-400' };
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Verification Review</h2>
          <p className="text-sm text-[#A0A0A0] mt-0.5">
            Click a user to review all their documents at once — one decision per user
          </p>
        </div>
        <Button
          onClick={() => loadVerifications(false)}
          variant="outline"
          className="border-white/10 text-[#A0A0A0] rounded-xl"
          disabled={loading || refreshing}
        >
          {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([
          { key: 'all' as StatusFilter, label: 'All Users', count: counts.all, cls: 'bg-white/5 text-[#A0A0A0]' },
          { key: 'pending' as StatusFilter, label: 'Needs Review', count: counts.pending, cls: 'bg-yellow-500/10 text-yellow-400' },
          { key: 'approved' as StatusFilter, label: 'Approved', count: counts.approved, cls: 'bg-green-500/10 text-green-400' },
          { key: 'rejected' as StatusFilter, label: 'Rejected', count: counts.rejected, cls: 'bg-red-500/10 text-red-400' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === tab.key ? `${tab.cls} ring-1 ring-current` : 'text-[#A0A0A0] hover:bg-white/5'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.cls}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-11 bg-[#111318] border-white/5 text-white rounded-xl h-11"
        />
      </div>

      {/* Split layout: user list (left) + review panel (right) */}
      <div className="flex gap-5 min-h-[500px]">

        {/* ── Left: User list ── */}
        <div className={`flex flex-col gap-2 ${selectedBundle ? 'w-full lg:w-[320px] shrink-0' : 'w-full'}`}>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" />
            </div>
          ) : filteredBundles.length === 0 ? (
            <div className="bg-[#111318] rounded-2xl border border-white/5 flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="w-10 h-10 text-[#A0A0A0] mb-3" />
              <p className="text-sm text-[#A0A0A0]">No users found</p>
            </div>
          ) : (
            filteredBundles.map((bundle) => {
              const st = getBundleStatus(bundle);
              const isSelected = selectedUserId === bundle.user_id;
              return (
                <motion.button
                  key={bundle.user_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedUserId(isSelected ? null : bundle.user_id);
                    setShowRejectPanel(false);
                    setRejectReason('');
                  }}
                  className={`w-full text-left bg-[#111318] rounded-2xl border transition-all p-4 ${
                    isSelected
                      ? 'border-[#FF6B00]/50 ring-1 ring-[#FF6B00]/30'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={bundle.user_avatar}
                        alt=""
                        className="w-11 h-11 rounded-full bg-[#1B1F27] object-cover"
                      />
                      {bundle.pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                          {bundle.pendingCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{bundle.user_name}</p>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-[#FF6B00]' : 'text-[#A0A0A0]'}`} />
                      </div>
                      <p className="text-xs text-[#A0A0A0] truncate">{bundle.user_email}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                          <st.icon className="w-2.5 h-2.5" />
                          {st.label}
                        </span>
                        <span className="text-[10px] text-[#A0A0A0]">
                          {bundle.docs.length} doc{bundle.docs.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-[#A0A0A0]">· {formatDate(bundle.latestDate)}</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* ── Right: Document review panel ── */}
        <AnimatePresence mode="wait">
          {selectedBundle && (
            <motion.div
              key={selectedBundle.user_id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.25 }}
              className="hidden lg:flex flex-col flex-1 bg-[#111318] rounded-2xl border border-white/5 overflow-hidden"
            >
              {/* Panel header */}
              <div className="p-5 border-b border-white/5 flex items-center gap-4">
                <img src={selectedBundle.user_avatar} alt="" className="w-12 h-12 rounded-full bg-[#1B1F27] object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">{selectedBundle.user_name}</p>
                  <p className="text-xs text-[#A0A0A0]">{selectedBundle.user_email}</p>
                </div>
                <button
                  onClick={() => { setSelectedUserId(null); setShowRejectPanel(false); setRejectReason(''); }}
                  className="p-2 rounded-xl hover:bg-white/5 text-[#A0A0A0]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document grid */}
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">
                  Documents ({selectedBundle.docs.length})
                </p>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {selectedBundle.docs.map((doc) => {
                    const DocIcon = getDocIcon(doc.doc_type);
                    const docUrl = getDocUrl(doc);
                    const ds = getDocStatus(doc.status);
                    return (
                      <div
                        key={doc.id}
                        className="bg-[#0F1115] rounded-xl border border-white/5 overflow-hidden group"
                      >
                        {/* Thumbnail / click to preview */}
                        <div
                          className="relative aspect-[4/3] bg-[#1B1F27] flex items-center justify-center cursor-pointer overflow-hidden"
                          onClick={() => docUrl && setPreviewUrl(docUrl)}
                        >
                          {docUrl ? (
                            <>
                              <img
                                src={docUrl}
                                alt={getDocLabel(doc.doc_type)}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-[#A0A0A0]">
                              <DocIcon className="w-8 h-8" />
                              <span className="text-xs">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Doc info */}
                        <div className="p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <DocIcon className="w-3 h-3 text-[#FF6B00] shrink-0" />
                            <p className="text-xs font-medium text-white truncate">{getDocLabel(doc.doc_type)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ds.dot}`} />
                            <span className={`text-[10px] font-medium ${ds.text}`}>{ds.label}</span>
                          </div>
                          {doc.rejection_reason && (
                            <p className="text-[10px] text-red-400 mt-1 line-clamp-2">{doc.rejection_reason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action footer */}
              <div className="p-5 border-t border-white/5 bg-[#0F1115]">
                {selectedBundle.pendingCount === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                    <ShieldCheck className="w-4 h-4" />
                    No pending documents — already processed
                  </div>
                ) : showRejectPanel ? (
                  <div className="space-y-3">
                    <label className="text-sm text-[#A0A0A0]">Rejection reason *</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Documents are blurry, please re-upload…"
                      rows={3}
                      className="w-full bg-[#1B1F27] border border-white/10 text-white text-sm rounded-xl p-3 outline-none focus:border-red-400/50 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRejectUser(selectedBundle)}
                        disabled={processing || !rejectReason.trim()}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-11"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-2" />Confirm Rejection</>}
                      </Button>
                      <Button
                        onClick={() => { setShowRejectPanel(false); setRejectReason(''); }}
                        variant="outline"
                        className="border-white/10 text-[#A0A0A0] rounded-xl h-11"
                        disabled={processing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApproveUser(selectedBundle)}
                      disabled={processing}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 text-sm font-semibold"
                    >
                      {processing
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><Check className="w-4 h-4 mr-2" />Approve All ({selectedBundle.pendingCount} docs)</>
                      }
                    </Button>
                    <Button
                      onClick={() => setShowRejectPanel(true)}
                      disabled={processing}
                      variant="outline"
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl h-12 text-sm font-semibold"
                    >
                      <X className="w-4 h-4 mr-2" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: review panel as bottom sheet */}
      <AnimatePresence>
        {selectedBundle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedUserId(null); setShowRejectPanel(false); }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-[#111318] rounded-t-3xl border-t border-white/10 max-h-[90vh] flex flex-col"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />

              {/* Header */}
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 shrink-0">
                <img src={selectedBundle.user_avatar} alt="" className="w-10 h-10 rounded-full bg-[#1B1F27] object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{selectedBundle.user_name}</p>
                  <p className="text-xs text-[#A0A0A0]">{selectedBundle.docs.length} documents</p>
                </div>
                <button onClick={() => { setSelectedUserId(null); setShowRejectPanel(false); }} className="p-2 rounded-xl hover:bg-white/5 text-[#A0A0A0]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable docs */}
              <div className="overflow-y-auto flex-1 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {selectedBundle.docs.map((doc) => {
                    const DocIcon = getDocIcon(doc.doc_type);
                    const docUrl = getDocUrl(doc);
                    const ds = getDocStatus(doc.status);
                    return (
                      <div key={doc.id} className="bg-[#0F1115] rounded-xl border border-white/5 overflow-hidden">
                        <div
                          className="relative aspect-[4/3] bg-[#1B1F27] flex items-center justify-center cursor-pointer"
                          onClick={() => docUrl && setPreviewUrl(docUrl)}
                        >
                          {docUrl ? (
                            <>
                              <img src={docUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <div className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50">
                                <Eye className="w-3 h-3 text-white" />
                              </div>
                            </>
                          ) : (
                            <DocIcon className="w-7 h-7 text-[#A0A0A0]" />
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-white truncate mb-1">{getDocLabel(doc.doc_type)}</p>
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${ds.dot}`} />
                            <span className={`text-[10px] ${ds.text}`}>{ds.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-white/5 bg-[#0D0F14] shrink-0">
                {selectedBundle.pendingCount === 0 ? (
                  <p className="text-sm text-[#A0A0A0] text-center py-2">No pending documents</p>
                ) : showRejectPanel ? (
                  <div className="space-y-3">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason…"
                      rows={2}
                      className="w-full bg-[#1B1F27] border border-white/10 text-white text-sm rounded-xl p-3 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleRejectUser(selectedBundle)} disabled={processing || !rejectReason.trim()} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-11">
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                      </Button>
                      <Button onClick={() => { setShowRejectPanel(false); setRejectReason(''); }} variant="outline" className="border-white/10 text-[#A0A0A0] rounded-xl h-11">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button onClick={() => handleApproveUser(selectedBundle)} disabled={processing} className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 font-semibold">
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Approve All</>}
                    </Button>
                    <Button onClick={() => setShowRejectPanel(true)} disabled={processing} variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl h-12 font-semibold">
                      <X className="w-4 h-4 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen image preview */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewUrl(null)}
            className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh]"
            >
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute -top-10 right-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewUrl}
                alt="Document"
                className="max-w-full max-h-[85vh] rounded-2xl border border-white/10 object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
