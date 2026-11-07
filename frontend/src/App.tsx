import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Inbox } from './components/Inbox';
import { Dashboard } from './components/Dashboard';
import { ModelInsights } from './components/ModelInsights';
import { Settings } from './components/Settings';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CorrectionModal } from './components/CorrectionModal';
import { INITIAL_TICKETS } from './mockData';
import { Ticket, RoutingResponse } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'inbox' | 'dashboard' | 'insights' | 'settings'>('inbox');
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(INITIAL_TICKETS[0].id);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ecommerce');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.60);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState<boolean>(false);
  const [ticketToCorrect, setTicketToCorrect] = useState<Ticket | null>(null);

  const showToast = useCallback((title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Analyze a single ticket via FastAPI POST /api/route
  const analyzeTicket = useCallback(
    async (ticket: Ticket): Promise<RoutingResponse | null> => {
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: ticket.text,
            industry: selectedIndustry,
            confidence_threshold: confidenceThreshold,
            channel: ticket.channel
          })
        });

        if (!res.ok) {
          throw new Error('API routing failed');
        }

        const data: RoutingResponse = await res.json();

        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? { ...t, analysis: data } : t))
        );

        return data;
      } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối mô hình', 'Không thể gọi /api/route. Hãy kiểm tra server FastAPI.', 'error');
        return null;
      }
    },
    [selectedIndustry, confidenceThreshold, showToast]
  );

  // Auto-analyze the first few tickets on mount
  useEffect(() => {
    const preloadTickets = async () => {
      for (let i = 0; i < Math.min(tickets.length, 6); i++) {
        await analyzeTicket(tickets[i]);
      }
    };
    preloadTickets();
  }, []);

  // When industry or threshold changes, re-analyze current ticket
  useEffect(() => {
    const currentTicket = tickets.find((t) => t.id === selectedTicketId);
    if (currentTicket) {
      analyzeTicket(currentTicket);
    }
  }, [selectedIndustry, confidenceThreshold]);

  // Keyboard navigation: J (next ticket) and K (previous ticket)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement;
      const isInput =
        activeElem?.tagName === 'INPUT' ||
        activeElem?.tagName === 'TEXTAREA' ||
        activeElem?.tagName === 'SELECT';

      if (isInput || currentTab !== 'inbox') return;

      const currentIndex = tickets.findIndex((t) => t.id === selectedTicketId);

      if (e.key === 'j' || e.key === 'J') {
        // Next ticket
        e.preventDefault();
        const nextIdx = (currentIndex + 1) % tickets.length;
        setSelectedTicketId(tickets[nextIdx].id);
      } else if (e.key === 'k' || e.key === 'K') {
        // Prev ticket
        e.preventDefault();
        const prevIdx = (currentIndex - 1 + tickets.length) % tickets.length;
        setSelectedTicketId(tickets[prevIdx].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tickets, selectedTicketId, currentTab]);

  const handleOpenCorrection = (ticket: Ticket) => {
    setTicketToCorrect(ticket);
    setIsCorrectionOpen(true);
  };

  const handleSendReply = (ticketId: string, replyText: string) => {
    if (!replyText.trim()) {
      showToast('Nội dung trống', 'Vui lòng nhập phản hồi trước khi gửi cho khách.', 'error');
      return;
    }
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'auto_routed' } : t))
    );
    showToast(
      'Đã gửi phản hồi thành công!',
      `Nội dung đã được chuyển phát qua kênh của ticket ${ticketId}.`,
      'success'
    );
  };

  const handleMarkResolved = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'resolved' } : t))
    );
    showToast('Đã đóng ticket', `Ticket ${ticketId} đã chuyển sang trạng thái đã xử lý xong.`, 'success');
  };

  const handleSubmitCorrection = async (correction: {
    ticket_id: string;
    original_category: string;
    corrected_category: string;
    original_priority: string;
    corrected_priority: string;
    agent_comment: string;
  }) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction)
      });

      setTickets((prev) =>
        prev.map((t) => (t.id === correction.ticket_id ? { ...t, humanCorrected: true } : t))
      );

      showToast(
        'Đã ghi nhận hiệu chỉnh AI',
        'Phản hồi đã được ghi vào data/feedback.jsonl cho chu trình Active Learning.',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Lỗi ghi phản hồi', 'Không thể lưu feedback vào backend.', 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100 text-slate-800">
      
      {/* 1. Header Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
      />

      {/* 2. Main Tab View */}
      {currentTab === 'inbox' && (
        <Inbox
          tickets={tickets}
          selectedTicketId={selectedTicketId}
          onSelectTicket={setSelectedTicketId}
          onAnalyzeTicket={analyzeTicket}
          onOpenCorrection={handleOpenCorrection}
          onSendReply={handleSendReply}
          onMarkResolved={handleMarkResolved}
          confidenceThreshold={confidenceThreshold}
        />
      )}

      {currentTab === 'dashboard' && <Dashboard tickets={tickets} />}

      {currentTab === 'insights' && <ModelInsights />}

      {currentTab === 'settings' && (
        <Settings
          selectedIndustry={selectedIndustry}
          onIndustryChange={setSelectedIndustry}
          confidenceThreshold={confidenceThreshold}
          onThresholdChange={setConfidenceThreshold}
          onShowToast={showToast}
        />
      )}

      {/* 3. Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 4. Human Review & Correction Modal */}
      {ticketToCorrect && (
        <CorrectionModal
          ticket={ticketToCorrect}
          isOpen={isCorrectionOpen}
          onClose={() => setIsCorrectionOpen(false)}
          onSubmit={handleSubmitCorrection}
        />
      )}

    </div>
  );
};

export default App;
