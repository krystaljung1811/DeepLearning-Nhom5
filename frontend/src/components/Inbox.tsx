import React, { useState } from 'react';
import {
  Search,
  Mail,
  MessageSquare,
  Globe,
  SlidersHorizontal,
  Send,
  CheckCircle,
  Eye,
  EyeOff,
  Plus,
  Upload,
  Inbox as InboxIcon,
  UserCheck
} from 'lucide-react';
import type { Ticket } from '../types';

interface InboxProps {
  tickets: Ticket[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onOpenCorrection: (ticket: Ticket) => void;
  onSendReply: (ticketId: string, replyText: string) => void;
  onMarkResolved: (ticketId: string) => void;
  confidenceThreshold: number;
}

export const Inbox: React.FC<InboxProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onOpenCreateModal,
  onOpenImportModal,
  onOpenCorrection,
  onSendReply,
  onMarkResolved
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'auto_routed'>('all');
  const [showAttention, setShowAttention] = useState<boolean>(true);
  const [replyDraft, setReplyDraft] = useState<string>('');

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  React.useEffect(() => {
    if (selectedTicket?.prediction?.category.suggested_reply) {
      setReplyDraft(selectedTicket.prediction.category.suggested_reply);
    } else {
      setReplyDraft('');
    }
  }, [selectedTicket?.id, selectedTicket?.prediction]);

  // Empty state if no tickets exist yet
  if (tickets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
            <InboxIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">
              Hộp thư đang trống
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              Chưa có yêu cầu nào được ghi nhận. Hãy tạo ticket đầu tiên hoặc nạp từ tệp CSV để quan sát toàn bộ pipeline định tuyến của mô hình BiLSTM + Attention.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onOpenCreateModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo ticket đầu tiên</span>
            </button>
            <button
              onClick={onOpenImportModal}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-normal border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Nhập từ CSV</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body.toLowerCase().includes(searchQuery.toLowerCase());

    const isReview = t.status === 'needs_review';
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'needs_review'
        ? isReview
        : !isReview;

    return matchesSearch && matchesStatus;
  });

  const getPriorityDot = (prioId?: string) => {
    switch (prioId) {
      case 'urgent':
        return 'bg-rose-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-slate-400" />;
      case 'livechat':
        return <MessageSquare className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

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

  const topTokens = selectedTicket?.prediction?.token_attentions
    ? [...selectedTicket.prediction.token_attentions]
        .filter((t) => t.weight > 0.05)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
    : [];

  const isNeedsReview = selectedTicket?.status === 'needs_review';

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      
      {/* 1. LEFT PANE: TICKET LIST (Row height ~56px) */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Header & Action Button */}
        <div className="p-3 border-b border-slate-200 space-y-2">
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-normal">
              Hàng đợi ({filteredTickets.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenImportModal}
                title="Nhập CSV"
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onOpenCreateModal}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo ticket</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ticket..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-normal text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-normal text-slate-600 text-center">
            <button
              onClick={() => setStatusFilter('all')}
              className={`py-1 rounded cursor-pointer transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('needs_review')}
              className={`py-1 rounded cursor-pointer transition-colors ${
                statusFilter === 'needs_review'
                  ? 'bg-white text-rose-700 font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Cần duyệt
            </button>
            <button
              onClick={() => setStatusFilter('auto_routed')}
              className={`py-1 rounded cursor-pointer transition-colors ${
                statusFilter === 'auto_routed'
                  ? 'bg-white text-slate-900 font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Đã chuyển
            </button>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredTickets.map((ticket) => {
            const isSelected = ticket.id === selectedTicket?.id;
            const ticketNeedsReview = ticket.status === 'needs_review';

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className={`h-14 px-3 flex flex-col justify-center cursor-pointer transition-colors border-l-2 ${
                  isSelected
                    ? 'bg-indigo-50/50 border-indigo-600'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${getPriorityDot(
                        ticket.final_priority
                      )}`}
                    />
                    <span className="font-normal text-slate-400 text-xs shrink-0">
                      {ticket.id}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs truncate">
                      {ticket.subject}
                    </span>
                  </div>

                  {ticketNeedsReview && (
                    <span className="shrink-0 text-xs px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold whitespace-nowrap">
                      Cần duyệt
                    </span>
                  )}
                  {ticket.reviewed_by_human === 1 && !ticketNeedsReview && (
                    <span className="shrink-0 text-xs px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-normal whitespace-nowrap" title="Đã chỉnh bởi nhân viên">
                      Đã sửa
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5 gap-2 min-w-0">
                  <p className="truncate text-xs font-normal text-slate-500 min-w-0 flex-1">
                    {ticket.body}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
                    {getChannelIcon(ticket.channel)}
                    <span>{new Date(ticket.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </aside>

      {/* 2. CENTER PANE: CONVERSATION VIEW */}
      {selectedTicket ? (
        <main className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
          
          {/* Header */}
          <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-normal">
                  {selectedTicket.id}
                </span>
                <h1 className="text-base font-semibold text-slate-900 truncate">
                  {selectedTicket.subject}
                </h1>
                {selectedTicket.reviewed_by_human === 1 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 font-normal border border-indigo-200">
                    <UserCheck className="w-3 h-3" />
                    <span>Đã chỉnh bởi nhân viên</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-normal">
                <span>{selectedTicket.customer_name}</span>
                <span>•</span>
                <span className="text-slate-400">{selectedTicket.email}</span>
                <span>•</span>
                <span className="capitalize">{selectedTicket.channel}</span>
                <span>•</span>
                <span>{new Date(selectedTicket.created_at).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onOpenCorrection(selectedTicket)}
                className="px-2.5 py-1 text-xs font-normal text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Hiệu chỉnh nhãn</span>
              </button>

              <button
                onClick={() => onMarkResolved(selectedTicket.id)}
                className="px-2.5 py-1 text-xs font-normal text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Đã xử lý</span>
              </button>
            </div>
          </div>

          {/* Conversation Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Customer Message */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{selectedTicket.customer_name}</span>
                  <span className="text-slate-400">&lt;{selectedTicket.email}&gt;</span>
                </div>

                <button
                  onClick={() => setShowAttention(!showAttention)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-normal"
                >
                  {showAttention ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showAttention ? 'Bật highlight Attention' : 'Tắt highlight'}</span>
                </button>
              </div>

              <div className="text-sm font-normal text-slate-800 leading-relaxed">
                {renderAttentionHighlightedText(
                  selectedTicket.body,
                  selectedTicket.prediction?.token_attentions
                )}
              </div>

              {showAttention && topTokens.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-slate-500 text-xs font-normal">Từ khóa mấu chốt (&gt;5%):</span>
                  {topTokens.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-normal"
                    >
                      {t.token}{' '}
                      <span className="text-amber-700 font-semibold">{(t.weight * 100).toFixed(1)}%</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* AI Suggested Response */}
            {selectedTicket.prediction?.category.suggested_reply && (
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Gợi ý phản hồi AI</span>
                  <button
                    onClick={() => setReplyDraft(selectedTicket.prediction!.category.suggested_reply)}
                    className="text-xs font-normal text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Áp dụng vào khung soạn
                  </button>
                </div>
                <p className="text-xs font-normal text-slate-600 leading-relaxed italic">
                  "{selectedTicket.prediction.category.suggested_reply}"
                </p>
              </div>
            )}

            {/* Reply Composer */}
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-3 bg-white">
              <span className="text-xs font-semibold text-slate-800 block">
                Soạn phản hồi gửi khách hàng
              </span>
              <textarea
                rows={3}
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Nhập nội dung phản hồi..."
                className="w-full text-sm font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
              <div className="flex items-center justify-end">
                <button
                  onClick={() => onSendReply(selectedTicket.id, replyDraft)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi phản hồi</span>
                </button>
              </div>
            </div>

          </div>

        </main>
      ) : null}

      {/* 3. RIGHT PANE: ROUTING DECISION & PLAIN KEY-VALUE LIST */}
      {selectedTicket && (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          
          <div className="border-b border-slate-200 pb-2">
            <span className="text-xs text-slate-500 font-normal">Thông tin định tuyến</span>
          </div>

          {/* 1. ROUTING DECISION AT THE TOP */}
          <div
            className={`rounded-lg border p-3 text-xs leading-relaxed ${
              isNeedsReview
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="font-semibold text-xs flex items-center justify-between mb-1">
              <span>{isNeedsReview ? 'Cần duyệt thủ công' : 'Tự động định tuyến'}</span>
              <span className="font-normal opacity-75">
                {isNeedsReview ? 'Độ tin cậy thấp hoặc rủi ro' : 'Đạt chuẩn an toàn'}
              </span>
            </div>
            {isNeedsReview && selectedTicket.prediction?.triage.reasons && (
              <ul className="text-xs space-y-0.5 mt-1 list-disc pl-4 font-normal">
                {selectedTicket.prediction.triage.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>

          {/* 2. PLAIN KEY-VALUE LIST */}
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-normal">Loại vấn đề</span>
              <span className="font-semibold text-slate-900 text-right">
                {selectedTicket.prediction?.category.name_vi || selectedTicket.final_category}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-normal">Mức ưu tiên & SLA</span>
              <span className="font-semibold text-slate-900 text-right">
                {selectedTicket.prediction?.priority.name_vi || selectedTicket.final_priority}{' '}
                {selectedTicket.prediction?.priority.sla && (
                  <span className="text-slate-400 font-normal">
                    ({selectedTicket.prediction.priority.sla})
                  </span>
                )}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-normal">Hàng đợi tiếp nhận</span>
              <span className="font-semibold text-slate-900 text-right">
                {selectedTicket.final_queue}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-normal">Độ tin cậy AI</span>
              <span className="font-semibold text-slate-900">
                {selectedTicket.prediction?.category.confidence_str || '100.0%'}
              </span>
            </div>
          </div>

          {/* 3. PROBABILITY DISTRIBUTION */}
          {selectedTicket.prediction?.category.all_probabilities && (
            <div className="space-y-2 pt-1">
              <span className="text-xs text-slate-500 font-normal block">
                Phân phối xác suất 7 loại vấn đề
              </span>

              <div className="space-y-1.5 text-xs">
                {[...selectedTicket.prediction.category.all_probabilities]
                  .sort((a, b) => b.probability - a.probability)
                  .map((cat) => {
                    const isSelected = cat.id === selectedTicket.final_category;
                    return (
                      <div key={cat.id} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={isSelected ? 'font-semibold text-slate-900' : 'text-slate-500 font-normal'}
                          >
                            {cat.name_vi}
                          </span>
                          <span
                            className={isSelected ? 'font-semibold text-slate-900' : 'text-slate-400 font-normal'}
                          >
                            {cat.percent_str}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded h-1 overflow-hidden">
                          <div
                            className={`h-1 rounded transition-all duration-300 ${
                              isSelected ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.max(cat.probability * 100, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        </aside>
      )}

    </div>
  );
};
