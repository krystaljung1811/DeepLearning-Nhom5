import React, { useState, useEffect } from 'react';
import type { PublicTicketView, TicketMessage } from '../../types';

interface Props {
  initialTicketId?: string;
  initialToken?: string;
  onBackToSubmit: () => void;
}

export const CustomerTrack: React.FC<Props> = ({ initialTicketId, initialToken, onBackToSubmit }) => {
  const [ticketIdInput, setTicketIdInput] = useState(initialTicketId || '');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [token, setToken] = useState(initialToken || '');

  const [ticket, setTicket] = useState<PublicTicketView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // New message from customer
  const [replyText, setReplyText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto fetch if initialTicketId and initialToken are provided
  useEffect(() => {
    if (initialTicketId && initialToken) {
      fetchTicketDetail(initialTicketId, initialToken);
    } else if (initialTicketId) {
      // Check saved session in localStorage
      const savedToken = localStorage.getItem(`ticket_token_${initialTicketId}`);
      if (savedToken) {
        fetchTicketDetail(initialTicketId, savedToken);
      }
    }
  }, [initialTicketId, initialToken]);

  const fetchTicketDetail = async (tId: string, tok: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/tickets/${encodeURIComponent(tId)}?token=${encodeURIComponent(tok)}`);
      if (res.status === 401) {
        localStorage.removeItem(`ticket_token_${tId}`);
        throw new Error('Cần xác thực bảo mật qua email (OTP) để xem ticket này.');
      }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Không tìm thấy ticket hoặc thông tin không hợp lệ.');
      }
      const data: PublicTicketView = await res.json();
      setTicket(data);
      setToken(tok);
      // Lưu phiên truy cập an toàn vào localStorage để không phải nhập OTP lại
      localStorage.setItem(`ticket_token_${tId}`, tok);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin ticket.');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tId = ticketIdInput.trim();
    const email = emailInput.trim();

    if (!tId || !email) {
      setError('Vui lòng nhập cả Mã số Ticket và Email liên hệ.');
      return;
    }

    // 1. Kiểm tra xem thiết bị này đã có session token hợp lệ trước đó chưa (Trường hợp khách đã xác thực)
    const existingToken = localStorage.getItem(`ticket_token_${tId}`);
    if (existingToken) {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/tickets/${encodeURIComponent(tId)}?token=${encodeURIComponent(existingToken)}`);
        if (res.ok) {
          const data = await res.json();
          setTicket(data);
          setToken(existingToken);
          setLoading(false);
          return; // Xác thực một lần thành công, không cần gửi OTP lại
        }
      } catch (e) {
        // Token cũ hết hạn hoặc không khớp -> tiếp tục quy trình gửi OTP mới
      }
    }

    setLoading(true);
    setError(null);
    setOtpNotice(null);

    try {
      const res = await fetch(`/api/public/tickets/${encodeURIComponent(tId)}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Không thể yêu cầu mã OTP.');
      }

      setOtpSent(true);
      setEmailStatus(data.email_status || 'sent');
      setOtpNotice(data.message || 'Mã OTP đã được gửi đến email của bạn.');
      setCooldown(60); // Đặt thời gian chờ gửi lại 60 giây
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tìm kiếm.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setError('Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/tickets/${encodeURIComponent(ticketIdInput.trim())}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          otp_code: otpInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.detail || 'Mã OTP không đúng hoặc đã hết hạn.');
      }

      // Successfully verified
      const newToken = data.access_token;
      setToken(newToken);
      setOtpSent(false);
      await fetchTicketDetail(ticketIdInput.trim(), newToken);
    } catch (err: any) {
      setError(err.message || 'Lỗi xác minh OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomerMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticket || !token) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/public/tickets/${encodeURIComponent(ticket.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: ticket.customer_name,
          message: replyText.trim(),
          token: token
        })
      });

      if (!res.ok) {
        throw new Error('Gửi phản hồi thất bại.');
      }

      const resData = await res.json();
      const newMsg: TicketMessage = resData.message;

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, newMsg]
            }
          : null
      );
      setReplyText('');
    } catch (err: any) {
      alert(err.message || 'Không thể gửi phản hồi.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Lookup & Authentication Header */}
      {!ticket && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Tra Cứu Tiến Độ Yêu Cầu</h2>
            <p className="text-sm text-slate-500 mt-1">
              Nhập mã ticket và địa chỉ email đã đăng ký để kiểm tra trạng thái xử lý và trao đổi với nhân viên hỗ trợ.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {otpNotice && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{otpNotice} (Xem mã mô phỏng trong Terminal/Console nếu dùng localhost).</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Mã số Ticket <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: TK-2026-1042"
                    value={ticketIdInput}
                    onChange={(e) => setTicketIdInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email của bạn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onBackToSubmit}
                  className="text-sm text-slate-500 hover:text-blue-600 transition"
                >
                  ← Quay lại gửi yêu cầu mới
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Đang kiểm tra...' : 'Xác thực & Tra cứu'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-md mx-auto py-2">
              <div className="text-center mb-4">
                <div className="text-base font-bold text-slate-800">Nhập mã xác thực OTP</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Mã 6 chữ số đã được gửi tới <strong>{emailInput}</strong>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full px-4 py-3 text-center tracking-widest text-2xl font-bold font-mono rounded-xl border-2 border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleSearchSubmit}
                  className="text-blue-600 hover:underline disabled:text-slate-400 font-medium cursor-pointer"
                >
                  {cooldown > 0 ? `⏳ Gửi lại mã sau (${cooldown}s)` : '🔄 Gửi lại mã OTP'}
                </button>
                {emailStatus === 'email_not_configured' && (
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-normal">
                    Mô phỏng: Xem OTP tại Console
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Nhập lại email khác
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Đang xác minh...' : 'Xác nhận OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 2. Detailed Ticket View & Two-way Conversation */}
      {ticket && (
        <div className="space-y-6">
          {/* Top Bar with Status Stepper */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-blue-700 font-mono">{ticket.id}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    ticket.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : ticket.status === 'needs_review'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {ticket.status === 'resolved'
                      ? '✅ Đã Giải Quyết'
                      : ticket.status === 'needs_review'
                      ? '⏳ Đang Chờ Nhân Viên Xử Lý'
                      : '🤖 Đã Phân Tuyến Tự Động'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-1">{ticket.subject}</h3>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span>👤 Khách hàng: <strong>{ticket.customer_name}</strong></span>
                  <span>🏢 Hàng đợi tiếp nhận: <strong>{ticket.final_queue}</strong></span>
                  {ticket.order_id && <span>📦 Mã đơn hàng: <strong>{ticket.order_id}</strong></span>}
                </div>
              </div>

              <button
                onClick={() => setTicket(null)}
                className="self-start md:self-auto text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Tra cứu ticket khác
              </button>
            </div>

            {/* Visual Process Stepper */}
            <div className="pt-6 grid grid-cols-4 text-center text-xs relative">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs mb-1.5 shadow-sm">
                  ✓
                </div>
                <span className="font-semibold text-slate-700">Đã tiếp nhận</span>
                <span className="text-[10px] text-slate-400">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs mb-1.5 shadow-sm">
                  ✓
                </div>
                <span className="font-semibold text-slate-700">AI Phân Tuyến</span>
                <span className="text-[10px] text-slate-400">BiLSTM+Attn</span>
              </div>

              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs mb-1.5 shadow-sm ${
                  ticket.messages.some(m => m.sender_type === 'agent')
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-white animate-pulse'
                }`}>
                  {ticket.messages.some(m => m.sender_type === 'agent') ? '✓' : '3'}
                </div>
                <span className="font-semibold text-slate-700">Nhân viên tiếp nhận</span>
                <span className="text-[10px] text-slate-400">
                  {ticket.messages.some(m => m.sender_type === 'agent') ? 'Đã phản hồi' : 'Đang xử lý'}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs mb-1.5 ${
                  ticket.status === 'resolved'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {ticket.status === 'resolved' ? '✓' : '4'}
                </div>
                <span className="font-semibold text-slate-700">Hoàn tất</span>
                <span className="text-[10px] text-slate-400">{ticket.status === 'resolved' ? 'Đã đóng' : 'Chờ hoàn tất'}</span>
              </div>
            </div>
          </div>

          {/* Conversation History Thread */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>💬 Lịch Sử Trao Đổi Hai Chiều</span>
              <span className="text-xs font-normal text-slate-500">({ticket.messages.length} tin nhắn)</span>
            </h4>

            {/* Messages List */}
            <div className="space-y-4 mb-6 max-h-[420px] overflow-y-auto pr-1">
              {ticket.messages.map((msg, idx) => {
                const isCustomer = msg.sender_type === 'customer';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-xs font-semibold text-slate-700">
                        {isCustomer ? '👤 Bạn (Khách hàng)' : '🎧 ' + msg.sender_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                        isCustomer
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Customer Reply Input */}
            <form onSubmit={handleSendCustomerMessage} className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Bổ sung thông tin hoặc phản hồi thêm cho chuyên viên CSKH:
              </label>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  required
                  placeholder="Nhập nội dung phản hồi của bạn..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm resize-none"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !replyText.trim()}
                  className="px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  {isSendingMessage ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

