import React, { useState, useEffect } from 'react';
import {
  Search,
  Mail,
  MessageSquare,
  Globe,
  SlidersHorizontal,
  Send,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import type { Ticket, RoutingResponse } from '../types';

interface InboxProps {
  tickets: Ticket[];
  selectedTicketId: string;
  onSelectTicket: (id: string) => void;
  onAnalyzeTicket: (ticket: Ticket) => Promise<RoutingResponse | null>;
  onOpenCorrection: (ticket: Ticket) => void;
  onSendReply: (ticketId: string, replyText: string) => void;
  onMarkResolved: (ticketId: string) => void;
  confidenceThreshold: number;
}

export const Inbox: React.FC<InboxProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onAnalyzeTicket,
  onOpenCorrection,
  onSendReply,
  onMarkResolved
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'auto_routed'>('all');
  const [showAttention, setShowAttention] = useState<boolean>(true);
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  useEffect(() => {
    if (selectedTicket && !selectedTicket.analysis) {
      setIsAnalyzing(true);
      onAnalyzeTicket(selectedTicket).finally(() => setIsAnalyzing(false));
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (selectedTicket?.analysis?.category.suggested_reply) {
      setReplyDraft(selectedTicket.analysis.category.suggested_reply);
    } else {
      setReplyDraft('');
    }
  }, [selectedTicket?.id, selectedTicket?.analysis]);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.text.toLowerCase().includes(searchQuery.toLowerCase());

    const isReview = t.analysis?.triage.human_review_required || t.status === 'needs_review';
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

  // Render text using inline <mark> tag with alpha proportional to attention weight
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

  // Top token chips only for weight > 5%
  const topTokens = selectedTicket?.analysis?.token_attentions
    ? [...selectedTicket.analysis.token_attentions]
        .filter((t) => t.weight > 0.05)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
    : [];

  const isNeedsReview =
    selectedTicket?.analysis?.triage.human_review_required ||
    selectedTicket?.status === 'needs_review';

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      
      {/* 1. LEFT PANE: TICKET LIST (Row height ~56px, clean 1-line preview, priority dot) */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Header & Search */}
        <div className="p-3 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Hàng đợi yêu cầu</span>
            <span>{filteredTickets.length} ticket</span>
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

          {/* Filter tabs */}
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
              Đã định tuyến
            </button>
          </div>
        </div>

        {/* Ticket Feed List (Row height ~56px) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredTickets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Không tìm thấy ticket nào
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicket?.id;
              const ticketNeedsReview =
                ticket.analysis?.triage.human_review_required || ticket.status === 'needs_review';

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
                          ticket.analysis?.priority.id
                        )}`}
                      />
                      <span className="font-normal text-slate-400 text-xs shrink-0">
                        {ticket.id}
                      </span>
                      <span className="font-semibold text-slate-900 text-xs truncate">
                        {ticket.subject}
                      </span>
                    </div>

                    {/* Badge ONLY for exceptions ("Cần duyệt" in red) */}
                    {ticketNeedsReview && (
                      <span className="shrink-0 text-xs px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold whitespace-nowrap">
                        Cần duyệt
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5 gap-2 min-w-0">
                    <p className="truncate text-xs font-normal text-slate-500 min-w-0 flex-1">
                      {ticket.text}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
                      {getChannelIcon(ticket.channel)}
                      <span>{ticket.createdAt}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </aside>

      {/* 2. CENTER PANE: TICKET CONVERSATION & REPLY */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
        
        {/* Ticket Header */}
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-normal">
                {selectedTicket.id}
              </span>
              <h1 className="text-base font-semibold text-slate-900 truncate">
                {selectedTicket.subject}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-normal">
              <span>{selectedTicket.sender}</span>
              <span>•</span>
              <span className="text-slate-400">{selectedTicket.email}</span>
              <span>•</span>
              <span className="capitalize">{selectedTicket.channel}</span>
              <span>•</span>
              <span>{selectedTicket.createdAt}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenCorrection(selectedTicket)}
              className="px-2.5 py-1 text-xs font-normal text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Hiệu chỉnh</span>
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
          
          {/* Message Box */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{selectedTicket.sender}</span>
                <span className="text-slate-400">&lt;{selectedTicket.email}&gt;</span>
              </div>

              {/* Attention toggle */}
              <button
                onClick={() => setShowAttention(!showAttention)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-normal"
              >
                {showAttention ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showAttention ? 'Bật highlight' : 'Tắt highlight'}</span>
              </button>
            </div>

            {/* Message text with <mark> highlighting */}
            <div className="text-sm font-normal text-slate-800 leading-relaxed">
              {isAnalyzing ? (
                <div className="space-y-1.5 py-2">
                  <div className="h-3.5 bg-slate-100 rounded animate-pulse w-3/4"></div>
                  <div className="h-3.5 bg-slate-100 rounded animate-pulse w-full"></div>
                </div>
              ) : (
                renderAttentionHighlightedText(
                  selectedTicket.text,
                  selectedTicket.analysis?.token_attentions
                )
              )}
            </div>

            {/* Top token chips (> 5% weight only) */}
            {showAttention && topTokens.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-500 text-xs font-normal">Từ khóa mấu chốt:</span>
                {topTokens.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-normal"
                  >
                    {t.token}{' '}
                    <span className="text-amber-700">{(t.weight * 100).toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Suggested Reply */}
          {selectedTicket.analysis?.category.suggested_reply && (
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Gợi ý phản hồi AI</span>
                <button
                  onClick={() => setReplyDraft(selectedTicket.analysis!.category.suggested_reply)}
                  className="text-xs font-normal text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Áp dụng vào khung soạn
                </button>
              </div>
              <p className="text-xs font-normal text-slate-600 leading-relaxed italic">
                "{selectedTicket.analysis.category.suggested_reply}"
              </p>
            </div>
          )}

          {/* Reply draft area */}
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

      {/* 3. RIGHT PANE: ROUTING DECISION & PLAIN KEY-VALUE LIST (No stacked colored cards) */}
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
        
        {/* Panel Header */}
        <div className="border-b border-slate-200 pb-2">
          <span className="text-xs text-slate-500 font-normal">Thông tin định tuyến</span>
        </div>

        {selectedTicket.analysis ? (
          <>
            {/* 1. ROUTING DECISION AT THE TOP (Primary Element) */}
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
              {isNeedsReview && selectedTicket.analysis.triage.reasons.length > 0 && (
                <ul className="text-xs space-y-0.5 mt-1 list-disc pl-4 font-normal">
                  {selectedTicket.analysis.triage.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* 2. PLAIN KEY-VALUE LIST (No stacked colored cards, no "1. 2. 3.", no "(Universal Category)") */}
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-normal">Loại vấn đề</span>
                <span className="font-semibold text-slate-900 text-right">
                  {selectedTicket.analysis.category.name_vi}
                </span>
              </div>

              <div className="p-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-normal">Mức ưu tiên & SLA</span>
                <span className="font-semibold text-slate-900 text-right">
                  {selectedTicket.analysis.priority.name_vi}{' '}
                  <span className="text-slate-400 font-normal">
                    ({selectedTicket.analysis.priority.sla})
                  </span>
                </span>
              </div>

              <div className="p-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-normal">Hàng đợi tiếp nhận</span>
                <span className="font-semibold text-slate-900 text-right">
                  {selectedTicket.analysis.routing.target_queue}
                </span>
              </div>

              <div className="p-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-normal">Độ tin cậy</span>
                <span className="font-semibold text-slate-900">
                  {selectedTicket.analysis.category.confidence_str}
                </span>
              </div>

            </div>

            {/* 3. PROBABILITY DISTRIBUTION (Clean, flat) */}
            <div className="space-y-2 pt-1">
              <span className="text-xs text-slate-500 font-normal block">
                Phân phối xác suất các loại vấn đề
              </span>

              <div className="space-y-1.5 text-xs">
                {[...selectedTicket.analysis.category.all_probabilities]
                  .sort((a, b) => b.probability - a.probability)
                  .map((cat) => {
                    const isSelected = cat.id === selectedTicket.analysis!.category.id;
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
          </>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400">
            Đang phân tích mô hình...
          </div>
        )}

      </aside>

    </div>
  );
};
