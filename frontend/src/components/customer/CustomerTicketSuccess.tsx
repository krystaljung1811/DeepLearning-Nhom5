import React, { useState } from 'react';

interface Props {
  ticketInfo: {
    ticket_id: string;
    access_token: string;
    customer_name: string;
    email: string;
    subject: string;
    queue: string;
  };
  onTrackNow: (ticketId: string, token: string) => void;
  onCreateAnother: () => void;
}

export const CustomerTicketSuccess: React.FC<Props> = ({ ticketInfo, onTrackNow, onCreateAnother }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ticketInfo.ticket_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 text-center">
      {/* Icon Check */}
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Yêu Cầu Hỗ Trợ Đã Được Tiếp Nhận!
      </h2>
      <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
        Hệ thống học sâu BiLSTM + Bahdanau Attention đã phân tích và tự động chuyển yêu cầu của bạn tới:
        <span className="block font-semibold text-blue-700 mt-1 bg-blue-50 py-1 px-3 rounded-lg border border-blue-100">
          🏢 {ticketInfo.queue}
        </span>
      </p>

      {/* Ticket ID Box */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-5 mb-6 max-w-sm mx-auto">
        <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">
          Mã số Ticket của bạn
        </div>
        <div className="text-3xl font-extrabold text-blue-600 tracking-wider my-1 font-mono">
          {ticketInfo.ticket_id}
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-700">Đã sao chép!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Sao chép mã Ticket</span>
            </>
          )}
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-8 max-w-md mx-auto space-y-1">
        <p>📧 Chúng tôi đã gửi email xác nhận và liên kết tra cứu tới <strong>{ticketInfo.email}</strong>.</p>
        <p>Chuyên viên hỗ trợ sẽ phản hồi trong thời gian sớm nhất.</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => onTrackNow(ticketInfo.ticket_id, ticketInfo.access_token)}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
        >
          <span>🔍 Tra Cứu Tiến Độ Ngay</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <button
          onClick={onCreateAnother}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm transition"
        >
          Gửi thêm yêu cầu khác
        </button>
      </div>
    </div>
  );
};
