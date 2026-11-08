import React, { useState, useMemo } from 'react';
import {
  Search,
  Mail,
  MessageSquare,
  Globe,
  Send,
  CheckCircle,
  Eye,
  EyeOff,
  Plus,
  Upload,
  Inbox as InboxIcon,
  UserCheck,
  Flame,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
  User,
  Users,
  Building,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import type { Ticket, TicketMessage } from '../types';

interface InboxProps {
  tickets: Ticket[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onOpenCorrection: (ticket: Ticket) => void;
  onSendReply: (ticketId: string, replyText: string) => void;
  onMarkResolved: (ticketId: string) => void;
  onAssignAgent?: (ticketId: string, agentName: string) => void;
  onBulkAction?: (ticketIds: string[], action: string, value?: string) => void;
  onRefreshTickets?: () => void;
  confidenceThreshold: number;
}

const AGENT_LIST = [
  'Nguyễn Văn Quản Trị (Admin)',
  'Trần Thị Hỗ Trợ (L1 Support)',
  'Lê Hoàng Long (L2 Technical)',
  'Phạm Thị Mai (Billing Specialist)'
];

export const Inbox: React.FC<InboxProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onOpenCreateModal,
  onOpenImportModal,
  onOpenCorrection,
  onSendReply,
  onMarkResolved,
  onAssignAgent,
  onBulkAction,
  onRefreshTickets
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'all' | 'urgent' | 'needs_review' | 'auto_routed' | 'unassigned' | 'resolved'>('all');
  const [selectedQueueFilter, setSelectedQueueFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'conversation' | 'ai_insights'>('conversation');
  const [showAttention, setShowAttention] = useState<boolean>(true);
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  // Find currently selected ticket
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  // Fetch conversation messages
  React.useEffect(() => {
    if (selectedTicket?.id) {
      fetch(`/api/tickets/${encodeURIComponent(selectedTicket.id)}/messages`)
        .then((res) => res.json())
        .then((data) => setTicketMessages(data.messages || []))
        .catch(() => setTicketMessages([]));
    } else {
      setTicketMessages([]);
    }
  }, [selectedTicket?.id, selectedTicket?.replied_at]);

  // Sync AI suggested reply
  React.useEffect(() => {
    if (selectedTicket?.prediction?.category.suggested_reply) {
      setReplyDraft(selectedTicket.prediction.category.suggested_reply);
    } else {
      setReplyDraft('');
    }
  }, [selectedTicket?.id, selectedTicket?.prediction]);

  // SLA Calculation
  const getSlaInfo = (createdAt: string, priority: string, status: string) => {
    if (status === 'resolved') {
      return { text: 'Hoàn tất', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    const createdTime = new Date(createdAt).getTime();
    const elapsedMinutes = Math.floor((Date.now() - createdTime) / 60000);

    const limits: Record<string, number> = {
      urgent: 15,
      high: 60,
      medium: 240,
      low: 1440
    };
    const limit = limits[priority] || 240;
    const remaining = limit - elapsedMinutes;

    if (remaining <= 0) {
      return {
        text: `Quá hạn ${Math.abs(remaining)}m`,
        badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold'
      };
    } else if (remaining < 30) {
      return {
        text: `Còn ${remaining}m`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
      };
    } else {
      const hours = Math.round(remaining / 60);
      return {
        text: `Còn ${hours}h`,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
      };
    }
  };

  // Metrics for Top Ribbon
  const metrics = useMemo(() => {
    const totalOpen = tickets.filter((t) => t.status !== 'resolved').length;
    const urgentCount = tickets.filter((t) => t.final_priority === 'urgent' && t.status !== 'resolved').length;
    const needsReviewCount = tickets.filter((t) => t.status === 'needs_review').length;
    const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
    const unassignedCount = tickets.filter((t) => !t.assigned_agent && t.status !== 'resolved').length;

    return { totalOpen, urgentCount, needsReviewCount, resolvedCount, unassignedCount };
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. View Filter
      if (activeView === 'urgent' && (t.final_priority !== 'urgent' || t.status === 'resolved')) return false;
      if (activeView === 'needs_review' && t.status !== 'needs_review') return false;
      if (activeView === 'auto_routed' && t.status !== 'auto_routed') return false;
      if (activeView === 'unassigned' && (t.assigned_agent || t.status === 'resolved')) return false;
      if (activeView === 'resolved' && t.status !== 'resolved') return false;
      if (activeView === 'all' && t.status === 'resolved') return false; // Default Inbox shows open tickets

      // 2. Queue Filter
      if (selectedQueueFilter !== 'all' && !t.final_queue.toLowerCase().includes(selectedQueueFilter.toLowerCase())) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.customer_name.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [tickets, activeView, selectedQueueFilter, searchQuery]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedTicketIds.length === filteredTickets.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(filteredTickets.map((t) => t.id));
    }
  };

  const handleToggleSelectTicket = (id: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkResolve = () => {
    if (onBulkAction && selectedTicketIds.length > 0) {
      onBulkAction(selectedTicketIds, 'resolve');
      setSelectedTicketIds([]);
    }
  };

  // Helper styles
  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">P1 Khẩn cấp</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">P2 Cao</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">P3 Trung bình</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-slate-100 text-slate-700 border border-slate-200">P4 Thấp</span>;
    }
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'email':
        return <span title="Email"><Mail className="w-3.5 h-3.5 text-slate-400" /></span>;
      case 'livechat':
        return <span title="LiveChat"><MessageSquare className="w-3.5 h-3.5 text-blue-500" /></span>;
      default:
        return <span title="Web Portal"><Globe className="w-3.5 h-3.5 text-indigo-500" /></span>;
    }
  };

  // Attention Highlighter
  const renderAttentionHighlightedText = (
    text: string,
    tokens?: { token: string; weight: number }[]
  ) => {
    if (!showAttention || !tokens || tokens.length === 0) {
      return <span>{text}</span>;
    }

    const maxWeight = Math.max(...tokens.map((t) => t.weight), 0.0001);

    return (
      <span>
        {tokens.map((item, idx) => {
          const norm = item.weight / maxWeight;
          const isHigh = norm > 0.18;

          if (isHigh) {
            const alpha = Math.min(Math.max(norm * 0.55, 0.18), 0.75);
            return (
              <mark
                key={idx}
                className="attn-mark"
                style={{
                  backgroundColor: `rgba(245, 158, 11, ${alpha.toFixed(2)})`
                }}
                title={`Attention: ${(item.weight * 100).toFixed(1)}%`}
              >
                {item.token}{' '}
              </mark>
            );
          }

          return <span key={idx}>{item.token} </span>;
        })}
      </span>
    );
  };

  if (tickets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
            <InboxIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Hộp thư đang trống</h3>
            <p className="text-xs text-slate-500 mt-1">Chưa có ticket nào trong cơ sở dữ liệu SQLite.</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo ticket</span>
            </button>
            <button
              onClick={onOpenImportModal}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 rounded-lg flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Nhập từ CSV</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100">
      
      {/* 1. TOP METRICS RIBBON (Zendesk & Intercom workspace style) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-6 overflow-x-auto text-xs py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="text-slate-500 font-medium">Đang mở:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{metrics.totalOpen}</span>
          </div>

          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500 font-medium">Khẩn cấp (P1):</span>
            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">{metrics.urgentCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 font-medium">Chờ duyệt AI:</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{metrics.needsReviewCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Chưa gán:</span>
            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{metrics.unassignedCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 font-medium">Đã xong:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{metrics.resolvedCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshTickets && (
            <button
              onClick={onRefreshTickets}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onOpenImportModal}
            className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Nhập CSV</span>
          </button>
          <button
            onClick={onOpenCreateModal}
            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Ticket</span>
          </button>
        </div>
      </div>

      {/* 2. THREE-PANE WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- PANE 1: VIEWS & QUEUE SIDEBAR (Width: 200px) --- */}
        <aside className="w-52 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 select-none">
          <div className="p-3 border-b border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hàng Đợi Xử Lý</div>
          </div>

          <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto text-xs">
            <button
              onClick={() => setActiveView('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeView === 'all'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold border border-slate-200/70'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <InboxIcon className="w-4 h-4 text-slate-400" />
                <span>Tất cả mở</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{metrics.totalOpen}</span>
            </button>

            <button
              onClick={() => setActiveView('urgent')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeView === 'urgent'
                  ? 'bg-rose-50 text-rose-700 shadow-2xs font-bold border border-rose-200'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>P1 Khẩn cấp</span>
              </span>
              <span className="text-[11px] font-bold text-rose-600">{metrics.urgentCount}</span>
            </button>

            <button
              onClick={() => setActiveView('needs_review')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeView === 'needs_review'
                  ? 'bg-amber-50 text-amber-800 shadow-2xs font-bold border border-amber-200'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Cần duyệt AI</span>
              </span>
              <span className="text-[11px] font-bold text-amber-700">{metrics.needsReviewCount}</span>
            </button>

            <button
              onClick={() => setActiveView('unassigned')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeView === 'unassigned'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold border border-slate-200/70'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Chưa phân công</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{metrics.unassignedCount}</span>
            </button>

            <button
              onClick={() => setActiveView('auto_routed')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeView === 'auto_routed'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold border border-slate-200/70'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Tự động định tuyến</span>
              </span>
            </button>

            <button
              onClick={() => setActiveView('resolved')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeView === 'resolved'
                  ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Đã giải quyết</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">{metrics.resolvedCount}</span>
            </button>

            {/* Department Queues Filter */}
            <div className="pt-4 pb-1 px-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng Ban Tiếp Nhận</div>
            </div>

            {['all', 'Kế toán', 'Vận chuyển', 'Kỹ thuật', 'Tài khoản'].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQueueFilter(q)}
                className={`w-full text-left px-3 py-1.5 rounded text-[11px] transition ${
                  selectedQueueFilter === q
                    ? 'font-bold text-indigo-600 bg-white border border-slate-200'
                    : 'text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                {q === 'all' ? '• Tất cả phòng ban' : `• ${q}`}
              </button>
            ))}
          </nav>
        </aside>

        {/* --- PANE 2: TICKET LIST COLUMN (Width: 340px) --- */}
        <section className="w-84 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Search bar & Bulk action header */}
          <div className="p-2.5 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã ticket, tên, nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs px-1 text-slate-500">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 hover:text-slate-800 transition cursor-pointer"
              >
                {selectedTicketIds.length > 0 && selectedTicketIds.length === filteredTickets.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Chọn tất cả ({filteredTickets.length})</span>
              </button>

              {selectedTicketIds.length > 0 && (
                <button
                  onClick={handleBulkResolve}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 transition"
                >
                  Đóng {selectedTicketIds.length} ticket
                </button>
              )}
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const isChecked = selectedTicketIds.includes(t.id);
              const sla = getSlaInfo(t.created_at, t.final_priority, t.status);

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className={`p-3 text-xs transition cursor-pointer flex gap-2.5 border-l-4 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-l-indigo-600'
                      : t.final_priority === 'urgent' && t.status !== 'resolved'
                      ? 'border-l-rose-500 hover:bg-slate-50'
                      : 'border-l-transparent hover:bg-slate-50'
                  }`}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelectTicket(t.id);
                    }}
                    className="pt-0.5"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-slate-900 truncate">{t.id}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border ${sla.badgeClass}`}>
                        {sla.text}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-800 truncate leading-snug">{t.subject}</div>

                    <div className="text-slate-500 line-clamp-1 text-[11px]">{t.body}</div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(t.channel)}
                        <span className="font-medium text-slate-600 truncate max-w-[90px]">{t.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getPriorityBadge(t.final_priority)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- PANE 3: WORKSPACE DETAIL & CONVERSATION PANE (Flex-1) --- */}
        {selectedTicket ? (
          <main className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Ticket Header Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-slate-900 font-mono">{selectedTicket.id}</span>
                  {getPriorityBadge(selectedTicket.final_priority)}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    selectedTicket.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedTicket.status === 'needs_review'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedTicket.status === 'resolved'
                      ? 'Đã giải quyết'
                      : selectedTicket.status === 'needs_review'
                      ? 'Cần duyệt AI'
                      : 'Tự động phân luồng'}
                  </span>
                </div>
                <h2 className="text-sm md:text-base font-bold text-slate-800">{selectedTicket.subject}</h2>
              </div>

              {/* Assignment & Resolve Action */}
              <div className="flex items-center gap-2 text-xs">
                {/* Assigned Agent Picker */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={selectedTicket.assigned_agent || ''}
                    onChange={(e) => onAssignAgent && onAssignAgent(selectedTicket.id, e.target.value)}
                    className="text-xs bg-transparent focus:outline-none cursor-pointer text-slate-700"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {AGENT_LIST.map((ag) => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </div>

                {/* Edit Label / Active Learning */}
                <button
                  onClick={() => onOpenCorrection(selectedTicket)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition"
                  title="Hiệu chỉnh nhãn cho chu trình Active Learning"
                >
                  ✏️ Sửa nhãn AI
                </button>

                {/* Resolve Ticket Button */}
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={() => onMarkResolved(selectedTicket.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-2xs flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Đóng Ticket</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-header Tab Bar */}
            <div className="px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex gap-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('conversation')}
                  className={`py-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'conversation'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Hội Thoại Khách Hàng ({ticketMessages.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('ai_insights')}
                  className={`py-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'ai_insights'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Thông Tin & Attention Heatmap</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                🏢 Hàng đợi: <strong className="text-slate-600">{selectedTicket.final_queue}</strong>
              </div>
            </div>

            {/* Tab 1: Conversation & Reply */}
            {activeTab === 'conversation' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                  {/* Original Customer Inquiry */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200/60">
                      <span className="font-bold text-slate-800">👤 {selectedTicket.customer_name} ({selectedTicket.email})</span>
                      <span>{new Date(selectedTicket.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {renderAttentionHighlightedText(
                        selectedTicket.body,
                        selectedTicket.prediction?.token_attentions
                      )}
                    </div>
                  </div>

                  {/* Follow-up Messages Thread */}
                  {ticketMessages.filter((_, idx) => idx > 0).map((msg) => {
                    const isCustomer = msg.sender_type === 'customer';
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          isCustomer
                            ? 'bg-blue-50 border border-blue-200 text-blue-900 ml-4'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-900 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span>{isCustomer ? `👤 ${msg.sender_name} (Khách hàng phản hồi)` : `🎧 ${msg.sender_name}`}</span>
                          <span className="text-slate-400 font-normal">{new Date(msg.created_at).toLocaleTimeString('vi-VN')}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Suggested Reply Box (Multilingual) */}
                {selectedTicket.prediction?.category.suggested_reply && (
                  <div className="mb-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-amber-900 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Gợi ý trả lời AI ({selectedTicket.prediction.category.name_vi}):</span>
                      </span>
                      <button
                        onClick={() => setReplyDraft(selectedTicket.prediction!.category.suggested_reply)}
                        className="text-indigo-600 hover:underline font-normal cursor-pointer"
                      >
                        Chèn vào khung soạn
                      </button>
                    </div>
                    <p className="text-slate-700 italic leading-relaxed">
                      "{selectedTicket.prediction.category.suggested_reply}"
                    </p>
                  </div>
                )}

                {/* Reply Composer */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Soạn phản hồi gửi khách hàng ({selectedTicket.channel || 'email'}):</span>
                    <button
                      onClick={() => setShowAttention(!showAttention)}
                      className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-normal"
                    >
                      {showAttention ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showAttention ? 'Ẩn Heatmap' : 'Hiện Heatmap'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="Nhập nội dung phản hồi cho khách hàng..."
                    className="w-full text-xs text-slate-800 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600"
                  />

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => onSendReply(selectedTicket.id, replyDraft)}
                      disabled={!replyDraft.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi Phản Hồi</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: AI Insights & Attention Heatmap */}
            {activeTab === 'ai_insights' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Multi-Task Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">Phân Loại Vấn Đề (Task 1)</div>
                    <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedTicket.prediction?.category.icon}</span>
                      <span>{selectedTicket.prediction?.category.name_vi || selectedTicket.final_category}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Độ tin cậy AI: <strong>{selectedTicket.prediction?.category.confidence_str}</strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">Mức Độ Ưu Tiên (Task 2)</div>
                    <div className="text-base font-bold text-slate-900">
                      {getPriorityBadge(selectedTicket.final_priority)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Cam kết xử lý SLA: <strong>{selectedTicket.prediction?.priority.sla || '4 giờ'}</strong>
                    </div>
                  </div>
                </div>

                {/* Attention Heatmap Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Cơ Chế Bahdanau Attention (Trọng Số Từ Khóa)</span>
                    <span className="text-[11px] text-slate-400">BiLSTM + Attention Mechanism</span>
                  </div>

                  <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-100 text-xs leading-relaxed text-slate-800">
                    {renderAttentionHighlightedText(
                      selectedTicket.body,
                      selectedTicket.prediction?.token_attentions
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-xs text-slate-500">Top từ khóa dồn trọng số:</span>
                    {selectedTicket.prediction?.token_attentions
                      ?.slice()
                      .sort((a, b) => b.weight - a.weight)
                      .slice(0, 5)
                      .map((tok, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-semibold">
                          {tok.token}: {(tok.weight * 100).toFixed(1)}%
                        </span>
                      ))}
                  </div>
                </div>

                {/* Human Review Triage Gate */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="font-bold text-slate-800">Cổng Kiểm Duyệt Thủ Công (Human Triage Gate)</div>
                  <div className={`p-2.5 rounded-lg text-xs font-medium ${
                    selectedTicket.status === 'needs_review'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {selectedTicket.status === 'needs_review'
                      ? '⚠️ Yêu cầu chuyên viên xem xét trước khi giải quyết.'
                      : '✅ Độ tin cậy AI vượt ngưỡng an toàn (>60%). Đã tự động định tuyến.'}
                  </div>
                </div>
              </div>
            )}
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Chọn một ticket bên danh sách để xem chi tiết
          </div>
        )}
      </div>
    </div>
  );
};
