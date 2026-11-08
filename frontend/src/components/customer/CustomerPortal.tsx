import React, { useState } from 'react';
import { CustomerTicketForm } from './CustomerTicketForm';
import { CustomerTicketSuccess } from './CustomerTicketSuccess';
import { CustomerTrack } from './CustomerTrack';

interface Props {
  onSwitchToAgent: () => void;
}

export const CustomerPortal: React.FC<Props> = ({ onSwitchToAgent }) => {
  const [subView, setSubView] = useState<'submit' | 'success' | 'track'>('submit');
  const [createdTicketInfo, setCreatedTicketInfo] = useState<{
    ticket_id: string;
    access_token: string;
    customer_name: string;
    email: string;
    subject: string;
    queue: string;
  } | null>(null);

  const [trackParams, setTrackParams] = useState<{ ticketId?: string; token?: string }>({});

  const handleCreateSuccess = (info: typeof createdTicketInfo) => {
    setCreatedTicketInfo(info);
    setSubView('success');
  };

  const handleTrackNow = (ticketId: string, token: string) => {
    setTrackParams({ ticketId, token });
    setSubView('track');
  };

  return (
    <div className="min-h-full w-full bg-slate-50/80 text-slate-800 flex flex-col font-sans pb-12">
      {/* 1. Header Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
              A
            </div>
            <div>
              <div className="text-base font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                <span>AutoDesk</span>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Help Center
                </span>
              </div>
              <div className="text-xs text-slate-400">Trung Tâm Trợ Giúp Khách Hàng</div>
            </div>
          </div>

          {/* Quick Nav Tabs */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setSubView('submit')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subView === 'submit' || subView === 'success'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📝 Gửi Yêu Cầu
              </button>
              <button
                onClick={() => setSubView('track')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subView === 'track'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔍 Tra Cứu Ticket
              </button>
            </div>

            {/* Switch to Agent Dashboard */}
            <button
              onClick={onSwitchToAgent}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs flex items-center gap-1.5"
              title="Dành cho chuyên viên hỗ trợ và hội đồng đánh giá đề tài"
            >
              <span>🔐 Khu Vực Nhân Viên</span>
              <span className="hidden md:inline text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Agent</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section for Help Center */}
      <div className="bg-gradient-to-b from-blue-50/60 to-transparent pt-8 pb-4 px-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Chúng tôi có thể giúp gì cho bạn hôm nay?
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2">
          Gửi phản ánh của bạn về đơn hàng, thanh toán, bảo hành hoặc tài khoản. Hệ thống AI BiLSTM + Bahdanau Attention sẽ phân tuyến tự động đến đúng chuyên viên.
        </p>

        {/* Mobile SubNav */}
        <div className="flex sm:hidden items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setSubView('submit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border ${
              subView === 'submit' || subView === 'success'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            📝 Gửi Yêu Cầu Mới
          </button>
          <button
            onClick={() => setSubView('track')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border ${
              subView === 'track'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            🔍 Tra Cứu Tiến Độ
          </button>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {subView === 'submit' && (
          <CustomerTicketForm
            onSuccess={handleCreateSuccess}
            onSwitchToTrack={() => setSubView('track')}
          />
        )}

        {subView === 'success' && createdTicketInfo && (
          <CustomerTicketSuccess
            ticketInfo={createdTicketInfo}
            onTrackNow={handleTrackNow}
            onCreateAnother={() => {
              setCreatedTicketInfo(null);
              setSubView('submit');
            }}
          />
        )}

        {subView === 'track' && (
          <CustomerTrack
            initialTicketId={trackParams.ticketId}
            initialToken={trackParams.token}
            onBackToSubmit={() => setSubView('submit')}
          />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 AutoDesk Support Desk — Đồ Án Nghiên Cứu Học Sâu Multi-Task BiLSTM + Bahdanau Attention.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Phiên bản Enterprise 3.0</span>
            <span>•</span>
            <button onClick={onSwitchToAgent} className="text-blue-600 hover:underline">
              Giao diện Quản trị viên
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

