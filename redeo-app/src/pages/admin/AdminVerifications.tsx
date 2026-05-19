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
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface VerificationRecord {
  id: string;
  user_id: string;
  doc_type: string;
  status: string;
  /* Support both old 'url' column and new 'public_url' column */
  url?: string;
  public_url?: string;
  storage_path?: string;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  /* joined fields */
  user_name: string;
  user_email: string;
  user_avatar: string;
  user_role: string;
}

type StatusFilter = 'all' | 'uploaded' | 'pending' | 'approved' | 'rejected';

/* Map all doc_type values → icon */
const docIcons: Record<string, any> = {
  /* old style */
  cin: CreditCard,
  selfie: Camera,
  license: FileText,
  registration: FileText,
  insurance: Shield,
  /* new style */
  cin_front: CreditCard,
  cin_back: CreditCard,
  driver_license: FileText,
  car_photo_front: Car,
  car_photo_back: Car,
};

/* Map all doc_type values → human label */
const docLabels: Record<string, string> = {
  cin: 'National ID (CIN)',
  selfie: 'Selfie',
  license: 'Driver License',
  registration: 'Vehicle Registration',
  insurance: 'Insurance',
  cin_front: 'National ID – Front',
  cin_back: 'National ID – Back',
  driver_license: 'Driver License',
  car_photo_front: 'Car Photo – Front',
  car_photo_back: 'Car Photo – Back',
};

function getDocLabel(docType: string) {
  return docLabels[docType] || docType;
}
function getDocIcon(docType: string) {
  return docIcons[docType] || FileText;
}
/** Returns the viewable URL for a verification record (handles both column names) */
function getDocUrl(v: VerificationRecord): string | null {
  return v.public_url || v.url || null;
}

const CACHE_KEY = 'admin_verifications_cache';

function saveCache(data: VerificationRecord[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* silent */ }
}
function loadCache(): VerificationRecord[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Use cache if less than 5 minutes old
    if (Date.now() - parsed.ts < 5 * 60 * 1000) return parsed.data as VerificationRecord[];
  } catch { /* silent */ }
  return [];
}

export function AdminVerifications() {
  const cached = loadCache();
  const [verifications, setVerifications] = useState<VerificationRecord[]>(cached);
  const [filtered, setFiltered] = useState<VerificationRecord[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDoc, setSelectedDoc] = useState<VerificationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await getHeaders();

      /* Step 1: fetch verifications */
      const verifRes = await fetch(
        `${SUPABASE_URL}/rest/v1/verifications?select=*&order=created_at.desc&limit=300`,
        { headers }
      );
      if (!verifRes.ok) throw new Error('Status ' + verifRes.status + ': ' + await verifRes.text());
      const verifData: any[] = await verifRes.json();

      /* Step 2: fetch ONLY the profiles referenced in these verifications (avoids full-table scan) */
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
          user_name: u?.name || 'Unknown',
          user_email: u?.email || '',
          user_avatar: u?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.user_id}`,
          user_role: u?.role || 'passenger',
        };
      });

      setVerifications(combined);
      saveCache(combined);
    } catch (err: any) {
      toast.error('Failed to load verifications: ' + err.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, [getHeaders]);

  useEffect(() => {
    // If we have cache, load silently in background; otherwise show spinner
    loadVerifications(cached.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Realtime — update only the changed record instead of re-fetching everything */
  useEffect(() => {
    const channel = supabase
      .channel('admin-verif-rt-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'verifications' }, (payload) => {
        const newRecord = buildRecord(payload.new as any);
        setVerifications((prev) => {
          const next = [newRecord, ...prev.filter((v) => v.id !== newRecord.id)];
          saveCache(next);
          return next;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'verifications' }, (payload) => {
        const updated = buildRecord(payload.new as any);
        setVerifications((prev) => {
          const next = prev.map((v) => v.id === updated.id ? { ...v, ...updated } : v);
          saveCache(next);
          return next;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'verifications' }, (payload) => {
        setVerifications((prev) => {
          const next = prev.filter((v) => v.id !== (payload.old as any)?.id);
          saveCache(next);
          return next;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new as any;
        if (p?.id) {
          usersMapRef.current.set(p.id, { ...usersMapRef.current.get(p.id), ...p });
          setVerifications((prev) => {
            const next = prev.map((v) => v.user_id === p.id ? buildRecord(v) : v);
            saveCache(next);
            return next;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [buildRecord]);

  /* Filter */
  useEffect(() => {
    let result = verifications;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter((v) => v.status === 'pending' || v.status === 'uploaded');
      } else if (statusFilter === 'approved') {
        result = result.filter((v) => v.status === 'approved' || v.status === 'verified');
      } else {
        result = result.filter((v) => v.status === statusFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.user_name.toLowerCase().includes(q) ||
          v.user_email.toLowerCase().includes(q) ||
          getDocLabel(v.doc_type).toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [verifications, statusFilter, search]);

  /* ─── Approve ─── */
  const handleApprove = async (id: string, userId: string) => {
    setProcessingId(id);
    try {
      const headers = await getHeaders();

      /* 1. Mark this verification as 'approved' */
      const verifRes = await fetch(`${SUPABASE_URL}/rest/v1/verifications?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          status: 'approved',
          admin_notes: 'Approved by admin',
          updated_at: new Date().toISOString(),
        }),
      });
      if (!verifRes.ok) throw new Error('Verif update failed: ' + await verifRes.text());

      /* 2. Update profile: is_verified = true, verification_status = 'verified' */
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          is_verified: true,
          verification_status: 'verified',
          updated_at: new Date().toISOString(),
        }),
      });
      if (!profileRes.ok) {
        console.warn('[Admin] Profile update failed:', await profileRes.text());
      }

      /* 3. Send notification to user */
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          type: 'verification_approved',
          title: 'Documents Approved ✅',
          message: 'Your verification documents have been approved! You can now publish trips and use all features.',
          data: JSON.stringify({ doc_id: id, status: 'approved' }),
          read: false,
          created_at: new Date().toISOString(),
        }),
      });

      toast.success('Document approved! User is now verified.');
      await loadVerifications();
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
    setProcessingId(null);
    setSelectedDoc(null);
  };

  /* ─── Reject ─── */
  const handleReject = async (id: string, userId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setProcessingId(id);
    try {
      const headers = await getHeaders();

      /* 1. Mark verification as 'rejected' */
      const verifRes = await fetch(`${SUPABASE_URL}/rest/v1/verifications?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          status: 'rejected',
          admin_notes: rejectReason,
          rejection_reason: rejectReason,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!verifRes.ok) throw new Error('Verif update failed: ' + await verifRes.text());

      /* 2. Update profile status */
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          verification_status: 'rejected',
          is_verified: false,
          updated_at: new Date().toISOString(),
        }),
      });

      /* 3. Send notification to user */
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          type: 'verification_rejected',
          title: 'Documents Rejected ❌',
          message: `Your verification was rejected. Reason: ${rejectReason}. Please re-upload your documents.`,
          data: JSON.stringify({ doc_id: id, status: 'rejected', reason: rejectReason }),
          read: false,
          created_at: new Date().toISOString(),
        }),
      });

      toast.success('Document rejected. User has been notified.');
      await loadVerifications();
    } catch (err: any) {
      toast.error('Rejection failed: ' + err.message);
    }
    setProcessingId(null);
    setSelectedDoc(null);
    setRejectReason('');
  };

  const statusCounts = {
    all: verifications.length,
    uploaded: verifications.filter((v) => v.status === 'uploaded').length,
    pending: verifications.filter((v) => v.status === 'pending' || v.status === 'uploaded').length,
    approved: verifications.filter((v) => v.status === 'approved' || v.status === 'verified').length,
    rejected: verifications.filter((v) => v.status === 'rejected').length,
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Verification Management</h2>
          <p className="text-sm text-[#A0A0A0] mt-0.5">Review and approve driver verification documents</p>
        </div>
        <Button onClick={() => loadVerifications(false)} variant="outline" className="border-white/10 text-[#A0A0A0] rounded-xl" disabled={loading || refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { key: 'all' as StatusFilter, label: 'All', count: statusCounts.all, color: 'bg-white/5 text-[#A0A0A0]' },
          { key: 'uploaded' as StatusFilter, label: 'Uploaded', count: statusCounts.uploaded, color: 'bg-yellow-500/10 text-yellow-400' },
          { key: 'pending' as StatusFilter, label: 'Pending Review', count: statusCounts.pending, color: 'bg-blue-500/10 text-blue-400' },
          { key: 'approved' as StatusFilter, label: 'Approved', count: statusCounts.approved, color: 'bg-green-500/10 text-green-400' },
          { key: 'rejected' as StatusFilter, label: 'Rejected', count: statusCounts.rejected, color: 'bg-red-500/10 text-red-400' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === tab.key ? `${tab.color} ring-1 ring-current` : 'text-[#A0A0A0] hover:bg-white/5'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.color}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or document type..."
          className="pl-11 bg-[#111318] border-white/5 text-white rounded-xl h-11"
        />
      </div>

      {/* Table */}
      <div className="bg-[#111318] rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <ShieldCheck className="w-10 h-10 text-[#A0A0A0] mb-3" />
            <p className="text-sm text-[#A0A0A0]">No verifications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">User</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Document</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Date</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((v) => {
                  const DocIcon = getDocIcon(v.doc_type);
                  const docUrl = getDocUrl(v);
                  const canAct = v.status === 'uploaded' || v.status === 'pending';
                  return (
                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={v.user_avatar} alt="" className="w-9 h-9 rounded-full bg-[#1B1F27] object-cover" />
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-[120px]">{v.user_name}</p>
                            <p className="text-xs text-[#A0A0A0] truncate max-w-[120px]">{v.user_email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Document */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <DocIcon className="w-4 h-4 text-[#FF6B00] shrink-0" />
                          <span className="text-sm text-white">{getDocLabel(v.doc_type)}</span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full capitalize flex items-center gap-1 w-fit ${
                          v.status === 'approved' || v.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                          v.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          v.status === 'uploaded' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {v.status === 'approved' || v.status === 'verified' ? <UserCheck className="w-3 h-3" /> :
                           v.status === 'rejected' ? <UserX className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          {v.status === 'pending' ? 'Pending Review' :
                           v.status === 'uploaded' ? 'Uploaded' :
                           v.status === 'approved' || v.status === 'verified' ? 'Approved' :
                           v.status}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-5 py-4 text-sm text-[#A0A0A0] whitespace-nowrap">
                        {formatDate(v.created_at)}
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {docUrl && (
                            <button
                              onClick={() => setPreviewImage(docUrl)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white transition-colors"
                              title="View document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {canAct && (
                            <>
                              <button
                                onClick={() => handleApprove(v.id, v.user_id)}
                                disabled={processingId === v.id}
                                className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                {processingId === v.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setSelectedDoc(v)}
                                disabled={processingId === v.id}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl max-h-[85vh]"
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="Document"
                className="max-w-full max-h-[80vh] rounded-2xl border border-white/10"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedDoc(null)}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1B1F27] rounded-2xl border border-white/10 p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reject Document</h3>
                  <p className="text-xs text-[#A0A0A0]">
                    {getDocLabel(selectedDoc.doc_type)} — {selectedDoc.user_name}
                  </p>
                </div>
              </div>

              {/* Document preview in modal */}
              {getDocUrl(selectedDoc) && (
                <div className="mb-4">
                  <img
                    src={getDocUrl(selectedDoc)!}
                    alt="Document"
                    className="w-full max-h-40 object-cover rounded-xl border border-white/5"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="text-sm text-[#A0A0A0] mb-2 block">Rejection Reason *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection (e.g. blurry image, expired document...)"
                  className="w-full bg-[#0A0C10] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-[#A0A0A0] resize-none h-24 focus:outline-none focus:border-[#FF6B00]/30"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => { setSelectedDoc(null); setRejectReason(''); }}
                  variant="outline"
                  className="flex-1 border-white/10 text-white rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReject(selectedDoc.id, selectedDoc.user_id)}
                  disabled={processingId === selectedDoc.id || !rejectReason.trim()}
                  className="flex-1 bg-red-500 text-white hover:bg-red-600 rounded-xl disabled:opacity-50"
                >
                  {processingId === selectedDoc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Reject
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
