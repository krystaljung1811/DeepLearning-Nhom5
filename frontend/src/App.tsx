import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Inbox } from './components/Inbox';
import { Dashboard } from './components/Dashboard';
import { ModelInsights } from './components/ModelInsights';
import { Settings } from './components/Settings';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CreateTicketModal } from './components/CreateTicketModal';
import { PipelineTraceModal } from './components/PipelineTraceModal';
import { ImportCsvModal } from './components/ImportCsvModal';
import { CorrectionModal } from './components/CorrectionModal';
import { CustomerPortal } from './components/customer/CustomerPortal';
import type { Ticket, ChannelType, ImportEvaluation } from './types';

export const App: React.FC = () => {
  const [portalView, setPortalView] = useState<'agent' | 'customer'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/support')) {
        return 'customer';
      }
    }
    return 'agent';
  });

  const [currentTab, setCurrentTab] = useState<'inbox' | 'dashboard' | 'insights' | 'settings'>('inbox');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ecommerce');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.60);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [isTraceOpen, setIsTraceOpen] = useState<boolean>(false);
  const [activeTraceTicket, setActiveTraceTicket] = useState<Ticket | null>(null);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
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

  // Fetch real tickets from SQLite backend
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.tickets && data.tickets.length > 0 && !selectedTicketId) {
          setSelectedTicketId(data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải dữ liệu', 'Không thể kết nối đến backend SQLite.', 'error');
    }
  }, [selectedTicketId, showToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      setPortalView(path.startsWith('/support') ? 'customer' : 'agent');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchToCustomer = () => {
    setPortalView('customer');
    window.history.pushState({}, '', '/support');
  };

  const switchToAgent = () => {
    setPortalView('agent');
    window.history.pushState({}, '', '/');
    fetchTickets();
  };

  // Keyboard navigation: J (next) and K (prev)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement;
      const isInput =
        activeElem?.tagName === 'INPUT' ||
        activeElem?.tagName === 'TEXTAREA' ||
        activeElem?.tagName === 'SELECT';

      if (isInput || currentTab !== 'inbox' || tickets.length === 0) return;

      const currentIndex = tickets.findIndex((t) => t.id === selectedTicketId);

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const nextIdx = (currentIndex + 1) % tickets.length;
        setSelectedTicketId(tickets[nextIdx].id);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const prevIdx = (currentIndex - 1 + tickets.length) % tickets.length;
        setSelectedTicketId(tickets[prevIdx].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tickets, selectedTicketId, currentTab]);

  // Create ticket handler
  const handleCreateTicket = async (formData: {
    customer_name: string;
    email: string;
    channel: ChannelType;
    subject: string;
    body: string;
  }) => {
    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          industry: selectedIndustry,
          confidence_threshold: confidenceThreshold
        })
      });

      if (!res.ok) {
        throw new Error('Create ticket failed');
      }

      const newTicket: Ticket = await res.json();

      setIsCreateOpen(false);
      setTickets((prev) => [newTicket, ...prev]);
      setSelectedTicketId(newTicket.id);

      // Open execution pipeline trace modal
      setActiveTraceTicket(newTicket);
      setIsTraceOpen(true);

      showToast(
        'Đã tạo và định tuyến ticket thành công!',
        `Mã ticket: ${newTicket.id} • Hàng đợi: ${newTicket.final_queue}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Lỗi tạo ticket', 'Không thể gửi yêu cầu vào pipeline.', 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Human correction handler
  const handleSubmitCorrection = async (correction: {
    ticket_id: string;
    original_category: string;
    corrected_category: string;
    original_priority: string;
    corrected_priority: string;
    agent_comment: string;
  }) => {
    try {
      const res = await fetch(`/api/tickets/${correction.ticket_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_category: correction.corrected_category,
          final_priority: correction.corrected_priority,
          agent_comment: correction.agent_comment,
          status: 'resolved'
        })
      });

      if (!res.ok) {
        throw new Error('Patch ticket failed');
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === correction.ticket_id
            ? {
                ...t,
                final_category: correction.corrected_category,
                final_priority: correction.corrected_priority,
                reviewed_by_human: 1,
                status: 'resolved',
                agent_comment: correction.agent_comment
              }
            : t
        )
      );

      showToast(
        'Đã lưu hiệu chỉnh nhãn',
        'Phản hồi đã được ghi nhận vào data/feedback.jsonl cho chu trình Active Learning.',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Lỗi hiệu chỉnh', 'Không thể cập nhật nhãn ticket.', 'error');
    }
  };

  const handleSendReply = async (ticketId: string, replyText: string) => {
    if (!replyText.trim()) {
      showToast('Nội dung trống', 'Vui lòng nhập phản hồi trước khi gửi cho khách.', 'error');
      return;
    }
    try {
      const ticket = tickets.find((t) => t.id === ticketId);
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_text: replyText,
          channel: ticket?.channel || 'email'
        })
      });

      if (!res.ok) {
        throw new Error('Reply dispatch failed');
      }

      const data = await res.json();
      const updatedTicket: Ticket = data.ticket;

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? updatedTicket : t))
      );

      showToast(
        'Đã gửi phản hồi thành công!',
        `Hệ thống Dispatcher đã gửi phản hồi qua ${ticket?.channel || 'email'} cho khách hàng.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Lỗi gửi phản hồi', 'Không thể kết nối đến hệ thống Dispatcher.', 'error');
    }
  };

  const handleMarkResolved = async (ticketId: string) => {
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: 'resolved' } : t))
      );
      showToast('Đã đóng ticket', `Ticket ${ticketId} đã chuyển sang trạng thái đã xử lý xong.`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAgent = async (ticketId: string, agentName: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_agent: agentName })
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, assigned_agent: agentName } : t))
        );
        showToast('Đã phân công', `Ticket ${ticketId} đã gán cho: ${agentName || 'Chưa phân công'}`, 'success');
      }
    } catch (err) {
      showToast('Lỗi phân công', 'Không thể cập nhật nhân viên phụ trách.', 'error');
    }
  };

  const handleBulkAction = async (ticketIds: string[], action: string, value: string = '') => {
    try {
      const res = await fetch('/api/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_ids: ticketIds, action, value })
      });
      if (res.ok) {
        fetchTickets();
        showToast('Thao tác hàng loạt', `Đã áp dụng thành công trên ${ticketIds.length} ticket.`, 'success');
      }
    } catch (err) {
      showToast('Lỗi thao tác', 'Không thể thực hiện thao tác hàng loạt.', 'error');
    }
  };

  const handleImportSuccess = (count: number, evalResult?: ImportEvaluation) => {
    fetchTickets();
    showToast(
      'Đã nhập dữ liệu CSV thành công!',
      evalResult
        ? `Đã nạp ${count} ticket. Độ chính xác trên tập có nhãn là ${evalResult.accuracy}%.`
        : `Đã nạp và định tuyến thành công ${count} ticket vào SQLite.`,
      'success'
    );
  };

  if (portalView === 'customer') {
    return (
      <div className="h-screen w-full overflow-y-auto bg-slate-50 text-slate-800">
        <CustomerPortal onSwitchToAgent={switchToAgent} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      
      {/* 1. Header Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
        onSwitchToCustomer={switchToCustomer}
      />

      {/* 2. Main Tab View */}
      {currentTab === 'inbox' && (
        <Inbox
          tickets={tickets}
          selectedTicketId={selectedTicketId}
          onSelectTicket={setSelectedTicketId}
          onOpenCreateModal={() => setIsCreateOpen(true)}
          onOpenImportModal={() => setIsImportOpen(true)}
          onOpenCorrection={(t) => {
            setTicketToCorrect(t);
            setIsCorrectionOpen(true);
          }}
          onSendReply={handleSendReply}
          onMarkResolved={handleMarkResolved}
          onAssignAgent={handleAssignAgent}
          onBulkAction={handleBulkAction}
          onRefreshTickets={fetchTickets}
          confidenceThreshold={confidenceThreshold}
        />
      )}

      {currentTab === 'dashboard' && <Dashboard />}

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

      {/* 4. Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTicket}
        isSubmitting={isSubmittingCreate}
      />

      {/* 5. Pipeline Execution Trace Modal */}
      <PipelineTraceModal
        ticket={activeTraceTicket}
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        onProceedToTicket={() => {
          setIsTraceOpen(false);
          setCurrentTab('inbox');
        }}
      />

      {/* 6. Batch CSV Import Modal */}
      <ImportCsvModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
        selectedIndustry={selectedIndustry}
        confidenceThreshold={confidenceThreshold}
      />

      {/* 7. Human Review Correction Modal */}
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
