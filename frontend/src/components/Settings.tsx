import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Sliders,
  History,
  ShieldAlert,
  Save,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { HumanFeedback } from '../types';

interface SettingsProps {
  selectedIndustry: string;
  onIndustryChange: (ind: string) => void;
  confidenceThreshold: number;
  onThresholdChange: (th: number) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const Settings: React.FC<SettingsProps> = ({
  selectedIndustry,
  onIndustryChange,
  confidenceThreshold,
  onThresholdChange,
  onShowToast
}) => {
  const [feedbackLogs, setFeedbackLogs] = useState<HumanFeedback[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const fetchFeedbackLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbackLogs(data.feedback || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchFeedbackLogs();
  }, []);

  const handleSaveSettings = () => {
    onShowToast('Đã lưu cấu hình hệ thống thành công!', 'Các ticket tiếp theo sẽ áp dụng theo ngưỡng mới.', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Cấu Hình Hệ Thống & Nhật Ký Phản Hồi Học Tập (Human-in-the-loop)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tùy chỉnh bảng ánh xạ phòng ban nội bộ, ngưỡng kiểm soát an toàn Triage và xem lại các phản hồi hiệu chỉnh của nhân viên CSKH.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Industry Mapping Setting */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1. Ánh Xạ Hàng Đợi Nội Bộ Theo Ngành
              </h3>
              <p className="text-[11px] text-slate-400">
                Mô hình dùng 7 nhãn Universal, doanh nghiệp tự map sang phòng ban
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Chọn Lĩnh Vực / Doanh Nghiệp Của Bạn:
            </label>

            <div className="space-y-2">
              {[
                {
                  id: 'ecommerce',
                  name: '🏬 Thương Mại Điện Tử & Bán Lẻ',
                  desc: 'Kho vận giao hàng, Đổi trả sản phẩm, Kế toán đối soát tiền hàng'
                },
                {
                  id: 'fintech',
                  name: '🏦 Ngân Hàng Số & Fintech',
                  desc: 'Tra soát giao dịch, An toàn thẻ tín dụng, Phòng chống rửa tiền'
                },
                {
                  id: 'saas',
                  name: '💻 Phần Mềm Doanh Nghiệp & SaaS',
                  desc: 'Kỹ sư hạ tầng DevOps, Đội ngũ kỹ thuật L3, Quản lý thành công khách hàng'
                }
              ].map((ind) => (
                <div
                  key={ind.id}
                  onClick={() => onIndustryChange(ind.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    selectedIndustry === ind.id
                      ? 'bg-indigo-50/70 border-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="industry"
                    checked={selectedIndustry === ind.id}
                    onChange={() => onIndustryChange(ind.id)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{ind.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{ind.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Triage Confidence Threshold Slider */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Ngưỡng An Toàn Tự Động Hóa (Triage Gate)
              </h3>
              <p className="text-[11px] text-slate-400">
                Quyết định tỷ lệ tự động hóa so với rủi ro sai sót
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Ngưỡng Tin Cậy Tối Thiểu (Threshold):</span>
              <span className="font-mono text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={Math.round(confidenceThreshold * 100)}
              onChange={(e) => onThresholdChange(parseFloat(e.target.value) / 100.0)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 leading-relaxed">
              <div className="font-bold text-slate-800">Quy tắc cổng an toàn:</div>
              <p>• Nếu Softmax Confidence &lt; {Math.round(confidenceThreshold * 100)}%: Tự động kích hoạt Cần Người Duyệt.</p>
              <p>• Nếu Mức ưu tiên là P1 (Khẩn cấp): Luôn chuyển người duyệt bất kể điểm số.</p>
              <p>• Nếu Loại vấn đề là Khiếu nại Gay gắt: Luôn chuyển Quản lý cấp cao xử lý.</p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Mới</span>
            </button>
          </div>
        </div>

      </div>

      {/* Human-in-the-loop Feedback Logs Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                3. Nhật Ký Phản Hồi Của Nhân Viên CSKH (data/feedback.jsonl)
              </h3>
              <p className="text-[11px] text-slate-400">
                Các lượt can thiệp sửa nhãn của con người được lưu lại để phục vụ tái huấn luyện (Active Learning)
              </p>
            </div>
          </div>

          <button
            onClick={fetchFeedbackLogs}
            disabled={isLoadingLogs}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {feedbackLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-1">
            <p>Chưa có lượt hiệu chỉnh nào từ nhân viên.</p>
            <p className="text-[11px] text-slate-500">
              Khi ở Hộp thư (Inbox), bạn có thể nhấn "Hiệu chỉnh AI" để chỉnh sửa phân loại của mô hình.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Thời Gian</th>
                  <th className="py-2.5 px-3">Mã Ticket</th>
                  <th className="py-2.5 px-3">Dự Đoán Ban Đầu</th>
                  <th className="py-2.5 px-3">Nhân Viên Sửa Thành</th>
                  <th className="py-2.5 px-3">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {feedbackLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                      {log.ticket_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      <span className="line-through">{log.original_category}</span> ({log.original_priority})
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                      {log.corrected_category} ({log.corrected_priority})
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 italic">
                      {log.agent_comment || 'Không có ghi chú'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

