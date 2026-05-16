import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ShieldCheck, Check, X, Search, CreditCard, Camera, FileText,
  Shield, Clock, UserCheck, UserX, AlertCircle, Eye, Loader2,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface VerificationRecord {
  id: string;
  user_id: string;
  doc_type: string;
  status: string;
  url: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_avatar: string;
  user_role: string;
}

type StatusFilter = 'all' | 'uploaded' | 'pending' | 'verified' | 'rejected';

const docIcons: Record<string, typeof Shield> = {
  cin: CreditCard, selfie: Camera, license: FileText,
  registration: FileText, insurance: Shield,
};

const docLabels: Record<string, string> = {
  cin: 'National ID (CIN)', selfie: 'Selfie Verification',
  license: 'Driver License', registration: 'Vehicle Registration',
  insurance: 'Insurance',
};

export function AdminVerifications() {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [filtered, setFiltered] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDoc, setSelectedDoc] = useState<VerificationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const loadVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();

      // Fetch ALL verifications
      const verifRes = await fetch(
        `${SUPABASE_URL}/rest/v1/verifications?select=*&order=created_at.desc`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': headers['Authorization'] } }
      );
      
      if (!verifRes.ok) {
        const errorText = await verifRes.text();
        console.error('[AdminVerifications] Error response:', errorText.substring(0, 500));
        throw new Error('Server returned: ' + verifRes.status + ' ' + verifRes.statusText);
      }
      
      const verifData = await verifRes.json();

      // Get all users
      const usersRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,avatar,role`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': headers['Authorization'] } }
      );
      
      let usersData: any[] = [];
      if (usersRes.ok) {
        usersData = await usersRes.json();
      } else {
        console.warn('[AdminVerifications] Users fetch failed:', usersRes.status);
      }

      const combined = (verifData || []).map((v: any) => {
        const u = usersData?.find((u: any) => u.id === v.user_id);
        return {
          ...v,
          user_name: u?.name || 'Unknown',
          user_email: u?.email || '',
          user_avatar: u?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.user_id}`,
          user_role: u?.role || 'passenger',
        };
      });

      setVerifications(combined);
    } catch (err: any) {
      toast.error('Failed to load verifications. Please login as admin.');
      console.error('[AdminVerifications] Error:', err);
    }
    setLoading(false);
  }, [getHeaders]);

  useEffect(() => { loadVerifications(); }, [loadVerifications]);

  useEffect(() => {
    let result = verifications;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter((v) => v.status === 'pending' || v.status === 'uploaded');
      } else {
        result = result.filter((v) => v.status === statusFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) => v.user_name.toLowerCase().includes(q) || v.user_email.toLowerCase().includes(q) || docLabels[v.doc_type]?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [verifications, statusFilter, search]);

  const handleApprove = async (id: string, userId: string) => {
    setProcessingId(id);
    try {
      const headers = await getHeaders();

      // Update verification to 'verified'
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/verifications?id=eq.${id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'verified',
            admin_notes: 'Approved by admin',
            updated_at: new Date().toISOString(),
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());

      // Check if all docs verified for this user
      const verifRes = await fetch(
        `${SUPABASE_URL}/rest/v1/verifications?select=status&user_id=eq.${userId}`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': headers['Authorization'] } }
      );
      const userVerifs = verifRes.ok ? await verifRes.json() : [];
      const allVerified = userVerifs.length > 0 && userVerifs.every((v: any) => v.status === 'verified');

      if (allVerified) {
        // Mark user as verified - try is_verified column only (verification_status may not exist)
        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              is_verified: true,
            }),
          }
        );
        toast.success('All documents approved! Driver is now verified.');
      } else {
        toast.success('Document approved!');
      }

      await loadVerifications();
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
    setProcessingId(null);
    setSelectedDoc(null);
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setProcessingId(id);
    try {
      const headers = await getHeaders();

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/verifications?id=eq.${id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'rejected',
            admin_notes: rejectReason,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());

      toast.success('Document rejected');
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
    verified: verifications.filter((v) => v.status === 'verified').length,
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
        <Button onClick={loadVerifications} variant="outline" className="border-white/10 text-[#A0A0A0] rounded-xl">
          <Clock className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { key: 'all' as StatusFilter, label: 'All', count: statusCounts.all, color: 'bg-white/5 text-[#A0A0A0]' },
          { key: 'uploaded' as StatusFilter, label: 'Uploaded', count: statusCounts.uploaded, color: 'bg-yellow-500/10 text-yellow-400' },
          { key: 'pending' as StatusFilter, label: 'Pending', count: statusCounts.pending, color: 'bg-blue-500/10 text-blue-400' },
          { key: 'verified' as StatusFilter, label: 'Approved', count: statusCounts.verified, color: 'bg-green-500/10 text-green-400' },
          { key: 'rejected' as StatusFilter, label: 'Rejected', count: statusCounts.rejected, color: 'bg-red-500/10 text-red-400' },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === tab.key ? `${tab.color} ring-1 ring-current` : 'text-[#A0A0A0] hover:bg-white/5'
            }`}>
            {tab.label} <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.color}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or document type..."
          className="pl-11 bg-[#111318] border-white/5 text-white rounded-xl h-11" />
      </div>

      <div className="bg-[#111318] rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" /></div>
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
                  const DocIcon = docIcons[v.doc_type] || FileText;
                  return (
                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={v.user_avatar} alt="" className="w-9 h-9 rounded-full bg-[#1B1F27]" />
                          <div>
                            <p className="text-sm font-medium text-white truncate">{v.user_name}</p>
                            <p className="text-xs text-[#A0A0A0]">{v.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <DocIcon className="w-4 h-4 text-[#FF6B00]" />
                          <span className="text-sm text-white">{docLabels[v.doc_type] || v.doc_type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full capitalize flex items-center gap-1 w-fit ${
                          v.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                          v.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          v.status === 'uploaded' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {v.status === 'verified' ? <UserCheck className="w-3 h-3" /> :
                           v.status === 'rejected' ? <UserX className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          {v.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#A0A0A0]">{formatDate(v.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {v.url && (
                            <button onClick={() => setPreviewImage(v.url)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white transition-colors" title="View document">
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {(v.status === 'uploaded' || v.status === 'pending') && (
                            <>
                              <button onClick={() => handleApprove(v.id, v.user_id)} disabled={processingId === v.id}
                                className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-50" title="Approve">
                                {processingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setSelectedDoc(v)} disabled={processingId === v.id}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50" title="Reject">
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

      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()} className="relative max-w-3xl max-h-[85vh]">
              <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
              <img src={previewImage} alt="Document" className="max-w-full max-h-[80vh] rounded-2xl border border-white/10" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedDoc(null)}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()} className="bg-[#1B1F27] rounded-2xl border border-white/10 p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-400" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reject Document</h3>
                  <p className="text-xs text-[#A0A0A0]">{docLabels[selectedDoc.doc_type]} for {selectedDoc.user_name}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-sm text-[#A0A0A0] mb-2 block">Rejection Reason</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full bg-[#0A0C10] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-[#A0A0A0] resize-none h-24 focus:outline-none focus:border-[#FF6B00]/30" />
              </div>
              {selectedDoc.url && (
                <div className="mb-4"><img src={selectedDoc.url} alt="Document" className="w-full max-h-40 object-cover rounded-xl border border-white/5" /></div>
              )}
              <div className="flex gap-3">
                <Button onClick={() => setSelectedDoc(null)} variant="outline" className="flex-1 border-white/10 text-white rounded-xl">Cancel</Button>
                <Button onClick={() => handleReject(selectedDoc.id)} disabled={processingId === selectedDoc.id || !rejectReason.trim()}
                  className="flex-1 bg-red-500 text-white hover:bg-red-600 rounded-xl disabled:opacity-50">
                  {processingId === selectedDoc.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Reject
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
