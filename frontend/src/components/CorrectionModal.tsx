import React, { useState } from 'react';
import { X, Check, SlidersHorizontal, MessageSquare } from 'lucide-react';
import { Ticket } from '../types';

interface CorrectionModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (correction: {
    ticket_id: string;
    original_category: string;
    corrected_category: string;
    original_priority: string;
    corrected_priority: string;
    agent_comment: string;
  }) => void;
}

const CATEGORIES = [
  { id: 'billing_refund', name: 'Thanh toán & Hoàn tiền' },
  { id: 'shipping_delivery', name: 'Giao hàng & Vận chuyển' },
  { id: 'technical_issue', name: 'Lỗi Kỹ thuật & Hệ thống' },
  { id: 'account_security', name: 'Tài khoản & Bảo mật' },
  { id: 'product_quality', name: 'Chất lượng Sản phẩm' },
  { id: 'complaint_escalation', name: 'Khiếu nại Gay gắt & Pháp lý' },
  { id: 'general_inquiry', name: 'Thắc mắc Chung & Hướng dẫn' }
];

const PRIORITIES = [
  { id: 'urgent', name: 'P1 - Khẩn cấp (SLA: 15m)' },
  { id: 'high', name: 'P2 - Cao (SLA: 1h)' },
  { id: 'medium', name: 'P3 - Trung bình (SLA: 4h)' },
  { id: 'low', name: 'P4 - Thấp (SLA: 24h)' }
];

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSubmit
}) => {
  if (!isOpen || !ticket.analysis) return null;

  const initialCat = ticket.analysis.category.id;
  const initialPrio = ticket.analysis.priority.id;

  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [selectedPrio, setSelectedPrio] = useState(initialPrio);
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ticket_id: ticket.id,
      original_category: initialCat,
      corrected_category: selectedCat,
      original_priority: initialPrio,
      corrected_priority: selectedPrio,
      agent_comment: comment
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Hiệu Chỉnh Quyết Định AI & Ghi Nhận Phản Hồi
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">{ticket.id} • {ticket.sender}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
            Dữ liệu hiệu chỉnh này sẽ được ghi nhận vào nhật ký học tập (Human-in-the-loop) để phục vụ quá trình tái huấn luyện và cải thiện độ chính xác của mô hình BiLSTM.
          </div>

          {/* Sửa Loại Vấn Đề */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Loại Vấn Đề (Universal Category):
            </label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.id === initialCat ? '(Dự đoán ban đầu)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sửa Mức Ưu Tiên */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Mức Độ Ưu Tiên & Cam Kết SLA:
            </label>
            <select
              value={selectedPrio}
              onChange={(e) => setSelectedPrio(e.target.value as any)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.id === initialPrio ? '(Dự đoán ban đầu)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú của nhân viên */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Lý do hoặc ghi chú của nhân viên CSKH (Tùy chọn):
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ví dụ: Khách hàng yêu cầu hỗ trợ đặc biệt, nâng ưu tiên lên P1..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Lưu Hiệu Chỉnh & Ghi Log
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
