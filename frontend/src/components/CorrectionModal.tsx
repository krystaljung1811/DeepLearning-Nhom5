import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { Ticket } from '../types';

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Hiệu chỉnh quyết định AI
            </h3>
            <p className="text-xs text-slate-500 font-normal">{ticket.id} • {ticket.sender}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 font-normal leading-relaxed">
            Dữ liệu sửa nhãn sẽ được lưu vào <span className="font-semibold text-slate-800">data/feedback.jsonl</span> phục vụ cho quá trình Active Learning.
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-normal block">
              Loại vấn đề:
            </label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full text-xs font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:border-indigo-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.id === initialCat ? '(Dự đoán AI)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-normal block">
              Mức độ ưu tiên:
            </label>
            <select
              value={selectedPrio}
              onChange={(e) => setSelectedPrio(e.target.value as any)}
              className="w-full text-xs font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:border-indigo-600"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.id === initialPrio ? '(Dự đoán AI)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-normal block">
              Ghi chú của nhân viên (tùy chọn):
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Lý do sửa nhãn..."
              className="w-full text-xs font-normal bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-normal cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu hiệu chỉnh</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
