import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Inbox, Search, Loader2, ChevronLeft, Clock, CheckCircle,
  XCircle, AlertCircle, Mail, User, FileText, Image, Send,
  ArrowDownUp, RefreshCw, Eye,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

/* ─── Ticket type ─── */
interface SupportTicket {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  screenshot_url?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  admin_reply?: string;
}

const statusConfig: Record<string, { label: string; cls: string; icon: typeof Inbox }> = {
  open:          { label: 'Open',          cls: 'bg-green-500/10 text-green-400',       icon: Inbox },
  in_progress:   { label: 'In Progress',   cls: 'bg-blue-500/10 text-blue-400',         icon: Clock },
  resolved:      { label: 'Resolved',      cls: 'bg-[#FF6B00]/10 text-[#FF6B00]',     icon: CheckCircle },
  closed:        { label: 'Closed',        cls: 'bg-white/5 text-[#A0A0A0]',            icon: XCircle },
};

export function AdminSupportTickets() {
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [filtered, setFiltered]   = useState<SupportTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<SupportTicket | null>(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy]       = useState<'newest' | 'oldest'>('newest');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  /* ─── Headers ─── */
  const getHeaders = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${s.session?.access_token || ''}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }, []);

  /* ─── Load tickets ─── */
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_tickets?select=*&order=created_at.desc&limit=200`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': headers.Authorization } }
      );
      if (res.ok) {
        const data = await res.json();
        setTickets(data || []);
        setFiltered(data || []);
      } else {
        // Fallback: check localStorage for demo tickets
        const local = JSON.parse(localStorage.getItem('wansniauto_support_tickets') || '[]');
        setTickets(local);
        setFiltered(local);
      }
    } catch (e) { console.error('loadTickets:', e); }
    setLoading(false);
  }, [getHeaders]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  /* ─── Realtime ─── */
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets]);

  /* ─── Filter & sort ─── */
  useEffect(() => {
    let result = [...tickets];
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.message.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const ad = new Date(a.created_at).getTime();
      const bd = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? bd - ad : ad - bd;
    });
    setFiltered(result);
  }, [tickets, search, statusFilter, sortBy]);

  /* ─── Update status ─── */
  const updateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
        if (selected?.id === ticketId) {
          setSelected(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
      } else { toast.error('Failed to update status'); }
    } catch { toast.error('Error updating status'); }
  };

  /* ─── Send reply ─── */
  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSendingReply(true);
    try {
      // Save reply to ticket
      const headers = await getHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${selected.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          admin_reply: replyText.trim(),
          status: 'resolved',
          updated_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success('Reply sent!');
        setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, admin_reply: replyText.trim(), status: 'resolved' } : t));
        setSelected(prev => prev ? { ...prev, admin_reply: replyText.trim(), status: 'resolved' } : null);
        setReplyText('');
      } else { toast.error('Failed to send reply'); }
    } catch { toast.error('Error sending reply'); }
    setSendingReply(false);
  };

  /* ─── Delete ticket ─── */
  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Delete this ticket permanently?')) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        toast.success('Ticket deleted');
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (selected?.id === ticketId) setSelected(null);
      } else { toast.error('Failed to delete'); }
    } catch { toast.error('Error deleting ticket'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /* ════════════════════════════════════════════
     DETAIL VIEW (selected ticket)
     ════════════════════════════════════════════ */
  if (selected) {
    const st = statusConfig[selected.status] || statusConfig.open;
    const StIcon = st.icon;
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#A0A0A0]" />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">Ticket Details</h2>
              <p className="text-xs text-[#A0A0A0]">#{selected.id.slice(0, 8)} &middot; {formatDate(selected.created_at)}</p>
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${st.cls}`}>
              <StIcon className="w-3.5 h-3.5" /> {st.label}
            </span>
          </div>

          {/* User Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111318] rounded-2xl border border-white/5 p-5 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FF6B00]/10 flex items-center justify-center">
                <User className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{selected.name}</p>
                <p className="text-xs text-[#A0A0A0] flex items-center gap-1"><Mail className="w-3 h-3" /> {selected.email}</p>
              </div>
              {selected.user_id && (
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Registered User</span>
              )}
            </div>
          </motion.div>

          {/* Subject */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-[#111318] rounded-2xl border border-white/5 p-5 mb-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-[#FF6B00] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[#A0A0A0] mb-1">Subject</p>
                <p className="text-white font-medium">{selected.subject}</p>
              </div>
            </div>
          </motion.div>

          {/* Message */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#111318] rounded-2xl border border-white/5 p-5 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FF6B00] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[#A0A0A0] mb-1">Message</p>
                <p className="text-white whitespace-pre-wrap leading-relaxed">{selected.message}</p>
              </div>
            </div>
          </motion.div>

          {/* Screenshot */}
          {selected.screenshot_url && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#111318] rounded-2xl border border-white/5 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-5 h-5 text-[#FF6B00]" />
                <p className="text-xs text-[#A0A0A0]">Attached Screenshot</p>
              </div>
              <img src={selected.screenshot_url} alt="Screenshot" className="rounded-xl border border-white/5 max-h-64 object-contain" />
            </motion.div>
          )}

          {/* Admin Reply (if exists) */}
          {selected.admin_reply && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-green-500/5 rounded-2xl border border-green-500/20 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-sm font-medium text-green-400">Your Reply</p>
              </div>
              <p className="text-white whitespace-pre-wrap">{selected.admin_reply}</p>
            </motion.div>
          )}

          {/* Reply Form */}
          {!selected.admin_reply && selected.status !== 'closed' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-[#111318] rounded-2xl border border-white/5 p-5 mb-4">
              <p className="text-sm text-white font-medium mb-3">Send Reply</p>
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply to the user..."
                className="bg-[#0A0C10] border-white/10 text-white rounded-xl min-h-[120px] mb-3"
              />
              <div className="flex gap-3">
                <Button
                  onClick={sendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl"
                >
                  {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Reply & Resolve</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-3">
            {selected.status === 'open' && (
              <Button onClick={() => updateStatus(selected.id, 'in_progress')} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-xl">
                <Clock className="w-4 h-4 mr-2" /> Mark In Progress
              </Button>
            )}
            {selected.status !== 'resolved' && selected.status !== 'closed' && (
              <Button onClick={() => updateStatus(selected.id, 'resolved')} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl">
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
              </Button>
            )}
            {selected.status !== 'closed' && (
              <Button onClick={() => updateStatus(selected.id, 'closed')} variant="outline" className="border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl">
                <XCircle className="w-4 h-4 mr-2" /> Close Ticket
              </Button>
            )}
            {selected.status === 'closed' && (
              <Button onClick={() => updateStatus(selected.id, 'open')} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 rounded-xl">
                <Inbox className="w-4 h-4 mr-2" /> Reopen
              </Button>
            )}
            <Button onClick={() => deleteTicket(selected.id)} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl ml-auto">
              <XCircle className="w-4 h-4 mr-2" /> Delete
            </Button>
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  /* ════════════════════════════════════════════
     LIST VIEW
     ════════════════════════════════════════════ */
  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Support Tickets</h2>
            <p className="text-sm text-[#A0A0A0]">{filtered.length} of {tickets.length} tickets</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadTickets} className="p-2.5 rounded-xl border border-white/10 text-[#A0A0A0] hover:bg-white/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#111318] rounded-2xl border border-white/5 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, subject..."
                className="pl-10 bg-[#0A0C10] border-white/10 text-white rounded-xl h-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#0A0C10] border border-white/10 text-white rounded-xl h-10 px-3 text-sm outline-none appearance-none"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={() => setSortBy(s => s === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-1 px-3 h-10 rounded-xl border border-white/10 text-[#A0A0A0] hover:bg-white/5 text-sm transition-colors"
              >
                <ArrowDownUp className="w-3.5 h-3.5" /> {sortBy === 'newest' ? 'Newest' : 'Oldest'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => {
            const count = tickets.filter(t => t.status === s).length;
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`bg-[#111318] rounded-xl border p-3 text-left transition-all ${statusFilter === s ? 'border-[#FF6B00]/30' : 'border-white/5 hover:border-white/10'}`}
              >
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-[10px] text-[#A0A0A0] mt-0.5">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Inbox className="w-12 h-12 text-[#A0A0A0]/30 mb-3" />
            <p className="text-[#A0A0A0]">No tickets found</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((ticket, i) => {
                const st = statusConfig[ticket.status] || statusConfig.open;
                const StIcon = st.icon;
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(ticket)}
                    className="bg-[#111318] rounded-xl border border-white/5 p-4 hover:border-[#FF6B00]/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-[#FF6B00]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white truncate">{ticket.name}</p>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.cls}`}>
                            <StIcon className="w-3 h-3" /> {st.label}
                          </span>
                        </div>
                        <p className="text-sm text-white font-medium truncate mb-1">{ticket.subject}</p>
                        <p className="text-xs text-[#A0A0A0] truncate">{ticket.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-[#A0A0A0]"><Mail className="w-3 h-3 inline mr-1" />{ticket.email}</span>
                          <span className="text-[10px] text-[#A0A0A0]"><Clock className="w-3 h-3 inline mr-1" />{formatDate(ticket.created_at)}</span>
                          {ticket.admin_reply && <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Replied</span>}
                          {ticket.screenshot_url && <span className="text-[10px] text-blue-400 flex items-center gap-1"><Image className="w-3 h-3" /> Screenshot</span>}
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
