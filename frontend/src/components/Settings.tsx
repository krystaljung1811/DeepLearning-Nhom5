import React, { useState, useEffect } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import type { HumanFeedback } from '../types';

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
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [retrainHistory, setRetrainHistory] = useState<any[]>([]);

  const fetchFeedbackLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbackLogs(data.feedback || []);
      }
      
      const historyRes = await fetch('/api/retrain/history');
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setRetrainHistory(historyData || []);
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

  const handleRetrain = async () => {
    setIsRetraining(true);
    try {
      const res = await fetch('/api/retrain', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast('Cập nhật mô hình thành công!', data.message, 'success');
        fetchFeedbackLogs();
      } else {
        onShowToast('Không thể huấn luyện lại', data.message || 'Lỗi xử lý', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Lỗi kết nối', 'Không thể gửi yêu cầu huấn luyện lại.', 'error');
    } finally {
      setIsRetraining(false);
    }
  };

  const handleSaveSettings = () => {
    onShowToast('Đã lưu cấu hình', 'Các ticket tiếp theo sẽ áp dụng theo ngưỡng mới.', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-5xl mx-auto w-full">
      
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Cài đặt hệ thống & Nhật ký phản hồi
        </h2>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          Tùy chỉnh bảng ánh xạ phòng ban, ngưỡng an toàn Triage và xem lại nhật ký can thiệp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Industry Mapping */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Ánh xạ hàng đợi theo ngành
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              7 nhãn phổ quát được map sang phòng ban tương ứng
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {[
              {
                id: 'ecommerce',
                name: 'Thương mại điện tử & Bán lẻ',
                desc: 'Kho vận, Đổi trả sản phẩm, Kế toán đối soát'
              },
              {
                id: 'fintech',
                name: 'Ngân hàng số & Fintech',
                desc: 'Tra soát thẻ, Kỹ thuật Core Banking, Phòng chống gian lận'
              },
              {
                id: 'saas',
                name: 'Phần mềm doanh nghiệp & SaaS',
                desc: 'Kỹ sư hạ tầng, Hỗ trợ kỹ thuật L2/L3, Quản lý tài khoản B2B'
              }
            ].map((ind) => (
              <div
                key={ind.id}
                onClick={() => onIndustryChange(ind.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${
                  selectedIndustry === ind.id
                    ? 'bg-indigo-50/50 border-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="industry"
                  checked={selectedIndustry === ind.id}
                  onChange={() => onIndustryChange(ind.id)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">{ind.name}</h4>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">{ind.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Triage Threshold Slider */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Ngưỡng an toàn tự động hóa (Triage Gate)
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Cân bằng giữa tỷ lệ tự động và rủi ro sai sót
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-normal">Ngưỡng tin cậy tối thiểu:</span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
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
              className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1 font-normal leading-relaxed">
              <p>• Nếu Confidence &lt; {Math.round(confidenceThreshold * 100)}%: Tự động chuyển người duyệt.</p>
              <p>• Nếu Mức ưu tiên P1 (Khẩn cấp): Luôn chuyển người duyệt.</p>
              <p>• Nếu Loại vấn đề là Khiếu nại Gay gắt: Luôn chuyển người duyệt.</p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu cấu hình</span>
            </button>
          </div>
        </div>

      </div>

      {/* Human-in-the-loop Feedback Logs */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Nhật ký phản hồi người duyệt (data/feedback.jsonl)
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Các lượt sửa nhãn để phục vụ chu trình Active Learning
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRetrain}
              disabled={isRetraining || feedbackLogs.length === 0}
              className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                isRetraining || feedbackLogs.length === 0
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
              <span>{isRetraining ? 'Đang tinh chỉnh model...' : 'Huấn luyện lại (Active Learning)'}</span>
            </button>
            <button
              onClick={fetchFeedbackLogs}
              disabled={isLoadingLogs}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-normal cursor-pointer px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {retrainHistory.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <span className="font-semibold text-slate-800">Lịch sử tinh chỉnh Active Learning gần nhất:</span>
            <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>Thời gian: {retrainHistory[retrainHistory.length - 1].timestamp}</span>
              <span>Mẫu feedback: {retrainHistory[retrainHistory.length - 1].human_feedback_samples}</span>
              <span>Tổng mẫu luyện: {retrainHistory[retrainHistory.length - 1].total_training_samples}</span>
              <span>Thời gian xử lý: {retrainHistory[retrainHistory.length - 1].duration_seconds}s</span>
            </div>
          </div>
        )}

        {feedbackLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Chưa có lượt hiệu chỉnh nào từ nhân viên.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs">
                <tr>
                  <th className="py-2 px-3">Thời gian</th>
                  <th className="py-2 px-3">Mã ticket</th>
                  <th className="py-2 px-3">Dự đoán AI</th>
                  <th className="py-2 px-3">Nhân viên sửa thành</th>
                  <th className="py-2 px-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {feedbackLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {log.ticket_id}
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      <span className="line-through">{log.original_category}</span> ({log.original_priority})
                    </td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">
                      {log.corrected_category} ({log.corrected_priority})
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {log.agent_comment || '-'}
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
