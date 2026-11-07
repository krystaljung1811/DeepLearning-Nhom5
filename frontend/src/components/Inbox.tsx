import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Mail,
  MessageSquare,
  Globe,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Send,
  CheckCircle,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  EyeOff,
  Bot,
  User,
  ArrowRight
} from 'lucide-react';
import { Ticket, RoutingResponse } from '../types';

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
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showAttention, setShowAttention] = useState<boolean>(true);
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  // Auto analyze selected ticket if not yet analyzed
  useEffect(() => {
    if (selectedTicket && !selectedTicket.analysis) {
      setIsAnalyzing(true);
      onAnalyzeTicket(selectedTicket).finally(() => setIsAnalyzing(false));
    }
  }, [selectedTicket?.id]);

  // Update reply draft when analysis changes
  useEffect(() => {
    if (selectedTicket?.analysis?.category.suggested_reply) {
      setReplyDraft(selectedTicket.analysis.category.suggested_reply);
    } else {
      setReplyDraft('');
    }
  }, [selectedTicket?.id, selectedTicket?.analysis]);

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.text.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'needs_review'
        ? t.analysis?.triage.human_review_required || t.status === 'needs_review'
        : !(t.analysis?.triage.human_review_required || t.status === 'needs_review');

    const matchesChannel = channelFilter === 'all' || t.channel === channelFilter;

    const matchesPriority =
      priorityFilter === 'all' || (t.analysis && t.analysis.priority.id === priorityFilter);

    return matchesSearch && matchesStatus && matchesChannel && matchesPriority;
  });

  const getPriorityColor = (prioId?: string) => {
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
        return <Mail className="w-3.5 h-3.5 text-slate-500" />;
      case 'livechat':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  const renderAttentionHighlightedText = (text: string, tokens?: { token: string; weight: number }[]) => {
    if (!showAttention || !tokens || tokens.length === 0) {
      return <span>{text}</span>;
    }

    const maxWeight = Math.max(...tokens.map((t) => t.weight), 0.0001);

    return (
      <span>
        {tokens.map((item, idx) => {
          const norm = item.weight / maxWeight;
          const isHigh = norm > 0.18;
          return (
            <span
              key={idx}
              className={isHigh ? 'attn-token-high' : 'attn-token-norm'}
              title={`Attention weight: ${(item.weight * 100).toFixed(2)}%`}
            >
              {item.token}{' '}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100">
      
      {/* ======================================================== */}
      {/* 1. LEFT PANE: TICKET FEED LIST (Width: 320px)            */}
      {/* ======================================================== */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Search & Stats Header */}
        <div className="p-3.5 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>Hàng Đợi Yêu Cầu</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px]">
                {filteredTickets.length}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">J / K chuyển tiếp</span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã, tên, nội dung..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-center text-slate-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('needs_review')}
              className={`py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'needs_review'
                  ? 'bg-rose-50 text-rose-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Cần duyệt
            </button>
            <button
              onClick={() => setStatusFilter('auto_routed')}
              className={`py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'auto_routed'
                  ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Đã định tuyến
            </button>
          </div>
        </div>

        {/* Scrollable Ticket List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Không tìm thấy ticket phù hợp bộ lọc.
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicket?.id;
              const isNeedsReview =
                ticket.analysis?.triage.human_review_required || ticket.status === 'needs_review';

              return (
                <div
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 border-l-4 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-600'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${getPriorityColor(
                          ticket.analysis?.priority.id
                        )}`}
                      />
                      <span className="font-mono font-bold text-slate-500">{ticket.id}</span>
                      {ticket.humanCorrected && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                          Đã sửa
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[10px]">{ticket.createdAt}</span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                    {ticket.subject}
                  </h4>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-normal">
                    {ticket.text}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      {getChannelIcon(ticket.channel)}
                      <span className="truncate max-w-[110px] font-medium text-slate-700">
                        {ticket.sender}
                      </span>
                    </div>

                    {isNeedsReview ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[9px]">
                        <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                        Cần duyệt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px]">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                        Đã chuyển
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </aside>

      {/* ======================================================== */}
      {/* 2. CENTER PANE: CONVERSATION & REPLY VIEW (Flex 1)       */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden min-w-0">
        
        {/* Ticket Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 space-y-2">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {selectedTicket.id}
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {selectedTicket.subject}
              </h1>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onOpenCorrection(selectedTicket)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hiệu chỉnh AI</span>
              </button>

              <button
                onClick={() => onMarkResolved(selectedTicket.id)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã xử lý</span>
              </button>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="font-semibold text-slate-800">{selectedTicket.sender}</span>
              <span>•</span>
              <span className="text-slate-400 font-mono text-[11px]">{selectedTicket.email}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 capitalize font-medium text-slate-600">
                {getChannelIcon(selectedTicket.channel)} {selectedTicket.channel}
              </span>
              <span>•</span>
              <span className="text-slate-400">{selectedTicket.createdAt}</span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedTicket.analysis?.priority && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>{selectedTicket.analysis.priority.name_vi}</span>
                  <span className="font-normal opacity-75">
                    (SLA: {selectedTicket.analysis.priority.sla})
                  </span>
                </span>
              )}

              {selectedTicket.analysis?.triage.human_review_required ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  <span>Cần duyệt thủ công</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Tự động định tuyến</span>
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Scrollable Conversation Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Customer Message Bubble */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{selectedTicket.sender}</h4>
                  <p className="text-[11px] text-slate-400">Khách hàng gửi yêu cầu</p>
                </div>
              </div>

              {/* Attention Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Soi từ khóa Attention:</span>
                <button
                  onClick={() => setShowAttention(!showAttention)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    showAttention
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {showAttention ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showAttention ? 'Đang bật' : 'Đang tắt'}</span>
                </button>
              </div>
            </div>

            {/* Message Body with Natural Highlighter */}
            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
              {isAnalyzing ? (
                <div className="space-y-2 py-4">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-full"></div>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-2/3"></div>
                </div>
              ) : (
                renderAttentionHighlightedText(
                  selectedTicket.text,
                  selectedTicket.analysis?.token_attentions
                )
              )}
            </div>

            {/* Attention Legend */}
            {showAttention && selectedTicket.analysis && (
              <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2 border-t border-slate-100">
                <span className="inline-block px-1.5 py-0.2 rounded bg-yellow-200 text-yellow-900 border-b-2 border-yellow-500 font-bold text-[10px]">
                  từ khóa
                </span>
                <span>
                  Các cụm từ có trọng số chú ý cao nhất chi phối quyết định của mô hình BiLSTM (Bahdanau Additive Attention).
                </span>
              </div>
            )}
          </div>

          {/* AI Suggested Response Banner */}
          {selectedTicket.analysis?.category.suggested_reply && (
            <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/60 rounded-2xl p-4 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-950">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>Gợi Ý Trả Lời Nhanh Từ AI Copilot</span>
                </div>
                <button
                  onClick={() =>
                    setReplyDraft(selectedTicket.analysis!.category.suggested_reply)
                  }
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Áp dụng vào khung soạn</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-indigo-100/60 italic font-medium">
                "{selectedTicket.analysis.category.suggested_reply}"
              </p>
            </div>
          )}

          {/* Reply Composer */}
          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Soạn thảo câu trả lời gửi đến khách hàng:
              </span>
              <span className="text-[11px] text-slate-400">Phản hồi qua kênh {selectedTicket.channel}</span>
            </div>

            <textarea
              rows={4}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Nhập nội dung phản hồi cho khách hàng..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setReplyDraft('')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Xóa nháp
              </button>

              <button
                onClick={() => onSendReply(selectedTicket.id, replyDraft)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi phản hồi cho khách</span>
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* ======================================================== */}
      {/* 3. RIGHT PANE: AI INSIGHTS INSPECTOR (Width: 340px)      */}
      {/* ======================================================== */}
      <aside className="w-84 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bảng Phân Tích AI Copilot</span>
          </h3>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            Realtime
          </span>
        </div>

        {selectedTicket.analysis ? (
          <>
            {/* Card 1: Loại Vấn Đề Phổ Quát */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                1. Loại Vấn Đề (Universal Category)
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {selectedTicket.analysis.category.name_vi}
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                  {selectedTicket.analysis.category.description}
                </p>
              </div>
              <div className="pt-1">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500">Độ tin cậy:</span>
                  <strong className="text-indigo-700 font-mono font-bold">
                    {selectedTicket.analysis.category.confidence_str}
                  </strong>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: selectedTicket.analysis.category.confidence_str }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Hàng Đợi Nội Bộ Tiếp Nhận */}
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-1">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                2. Hàng Đợi Tiếp Nhận (Queue)
              </span>
              <h4 className="text-xs font-extrabold text-indigo-950 leading-snug">
                {selectedTicket.analysis.routing.target_queue}
              </h4>
              <p className="text-[10px] text-slate-500">
                Ánh xạ: {selectedTicket.analysis.routing.industry}
              </p>
            </div>

            {/* Card 3: Mức Độ Ưu Tiên & Cam Kết SLA */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                3. Mức Độ Ưu Tiên & SLA
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {selectedTicket.analysis.priority.name_vi}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Độ tin cậy: {selectedTicket.analysis.priority.confidence_str}
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                  SLA: {selectedTicket.analysis.priority.sla}
                </span>
              </div>
            </div>

            {/* Card 4: Cổng An Toàn Triage Gate */}
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                selectedTicket.analysis.triage.human_review_required
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-emerald-50/60 border-emerald-200'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-extrabold ${
                  selectedTicket.analysis.triage.human_review_required
                    ? 'text-rose-900'
                    : 'text-emerald-900'
                }`}
              >
                {selectedTicket.analysis.triage.human_review_required ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>CẦN DUYỆT THỦ CÔNG</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>TỰ ĐỘNG ĐỊNH TUYẾN</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-600 leading-relaxed">
                {selectedTicket.analysis.triage.human_review_required ? (
                  <ul className="space-y-1 text-rose-800">
                    {selectedTicket.analysis.triage.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-800">
                    Đạt chuẩn an toàn tự động hóa. Đã chuyển thẳng đến hàng đợi chuyên môn.
                  </p>
                )}
              </div>
            </div>

            {/* Card 5: Top Attention Tokens */}
            {selectedTicket.analysis.token_attentions && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Từ Khóa Chi Phối Quyết Định (Top Attention):
                </span>
                <div className="flex flex-wrap gap-1">
                  {[...selectedTicket.analysis.token_attentions]
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 5)
                    .map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                      >
                        <span>{t.token}</span>
                        <span className="font-mono text-[9px] text-amber-700">
                          {(t.weight * 100).toFixed(1)}%
                        </span>
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Card 6: Phân Phối Xác Suất 7 Loại Vấn Đề 100% Tiếng Việt */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Phân Phối 7 Loại Vấn Đề (Tiếng Việt):
              </span>
              <div className="space-y-2">
                {[...selectedTicket.analysis.category.all_probabilities]
                  .sort((a, b) => b.probability - a.probability)
                  .map((cat) => {
                    const isSelected = cat.id === selectedTicket.analysis!.category.id;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={isSelected ? 'font-bold text-indigo-700' : 'text-slate-600'}
                          >
                            {cat.name_vi}
                          </span>
                          <span
                            className={`font-mono ${
                              isSelected ? 'font-black text-indigo-700' : 'text-slate-400'
                            }`}
                          >
                            {cat.percent_str}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
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
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Đang phân tích mô hình BiLSTM...</p>
          </div>
        )}

      </aside>

    </div>
  );
};

