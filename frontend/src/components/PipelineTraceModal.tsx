import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';
import type { Ticket } from '../types';

interface PipelineTraceModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToTicket: () => void;
}

export const PipelineTraceModal: React.FC<PipelineTraceModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onProceedToTicket
}) => {
  if (!isOpen || !ticket || !ticket.prediction) return null;

  const trace = ticket.trace || ticket.prediction.trace;
  const pred = ticket.prediction;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Pipeline Suy Luận Mô Hình BiLSTM + Attention
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Mã ticket: {ticket.id} • Thời gian suy luận: <strong className="text-indigo-600 font-semibold">{trace?.inference_ms || 2.5} ms</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Trace Steps */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
          
          {/* OOV Warning if > 40% */}
          {trace?.oov_warning && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2 text-amber-900 font-normal leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Cảnh báo tỷ lệ từ lạ (OOV Rate):</span>
                <span>{trace.oov_warning}</span>
              </div>
            </div>
          )}

          {/* 8 Execution Pipeline Steps */}
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
            
            {/* Step 1: Làm sạch */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Làm sạch văn bản (Sanitization)</span>
                </span>
                <span className="text-slate-400 font-normal">Khử dấu vết Twitter</span>
              </div>
              <p className="text-xs text-slate-600 font-normal bg-slate-50 p-2 rounded border border-slate-100 leading-normal">
                {trace?.cleaned_text || pred.clean_text}
              </p>
              <span className="text-[11px] text-slate-400 font-normal block">
                Đã loại bỏ @mentions, #hashtags, tiền tố RT, URLs rút gọn để mô hình không học đường tắt.
              </span>
            </div>

            {/* Step 2: Tokenize & OOV */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Phân tách từ & Kiểm tra từ điển (Tokenization)</span>
                </span>
                <span className="text-slate-500 font-normal">
                  Tổng: <strong>{trace?.token_count || 0}</strong> token
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-500 font-normal block">Từ vựng hợp lệ:</span>
                  <span className="font-semibold text-slate-800">
                    {(trace?.token_count || 0) - (trace?.oov_count || 0)} token (trong từ điển {trace?.vocab_size || 892} từ)
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-500 font-normal block">Từ ngoài từ điển (OOV):</span>
                  <span className={`font-semibold ${trace && trace.oov_rate > 0.4 ? 'text-amber-700' : 'text-slate-800'}`}>
                    {trace?.oov_count || 0} token ({trace?.oov_rate_pct || '0%'})
                  </span>
                </div>
              </div>
              {trace?.oov_tokens && trace.oov_tokens.length > 0 && (
                <div className="text-[11px] text-slate-500 font-normal pt-0.5">
                  Các từ lạ ánh xạ về token &lt;UNK&gt;: {trace.oov_tokens.join(', ')}
                </div>
              )}
            </div>

            {/* Step 3 & 4: Embedding & BiLSTM */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3 & 4. Embedding & Mạng nơ-ron BiLSTM 2 lớp</span>
                </span>
                <span className="text-slate-400 font-normal">Mã hóa ngữ cảnh 2 chiều</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-500 font-normal block">Lớp Embedding:</span>
                  <span className="font-semibold text-slate-800">
                    Vector không gian {trace?.embed_dim || 128} chiều
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-500 font-normal block">Chuỗi trạng thái ẩn BiLSTM:</span>
                  <span className="font-semibold text-slate-800">
                    2 lớp Stacked (H ∈ ℝ^[{trace?.seq_len_clipped || 20} × 256])
                  </span>
                </div>
              </div>
            </div>

            {/* Step 5: Bahdanau Attention Pooling */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>5. Cơ chế Bahdanau Additive Attention Pooling</span>
                </span>
                <span className="text-indigo-600 font-semibold">∑ α_t = 1.0</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
                <span className="text-slate-500 font-normal block">
                  Top từ khóa mang trọng số Attention cao nhất (chi phối quyết định):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {trace?.top_attention_tokens && trace.top_attention_tokens.length > 0 ? (
                    trace.top_attention_tokens.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-normal"
                      >
                        {t.token} <strong className="text-amber-800 font-semibold">{(t.weight * 100).toFixed(1)}%</strong>
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 font-normal">Trọng số phân bổ đều</span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 6 & 7: Heads & Triage Gate */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>6 & 7. Đầu ra đa nhiệm & Cổng an toàn Triage</span>
                </span>
                <span className={`text-xs font-semibold px-2 py-0.2 rounded border ${
                  pred.triage.human_review_required
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {pred.triage.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-500 font-normal block">Dự đoán Loại vấn đề:</span>
                  <span className="font-semibold text-slate-900">
                    {pred.category.name_vi} ({pred.category.confidence_str})
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-slate-500 font-normal block">Mức ưu tiên & Cam kết SLA:</span>
                  <span className="font-semibold text-slate-900">
                    {pred.priority.name_vi} (SLA: {pred.priority.sla})
                  </span>
                </div>
              </div>
            </div>

            {/* Step 8: Hàng đợi */}
            <div className="p-3 flex items-center justify-between bg-indigo-50/40">
              <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>8. Điều phối hàng đợi tiếp nhận:</span>
              </span>
              <span className="font-semibold text-indigo-900 text-xs bg-white px-2.5 py-1 rounded border border-indigo-200">
                {pred.routing.target_queue}
              </span>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-normal">
            Dữ liệu đã được lưu an toàn vào cơ sở dữ liệu SQLite
          </span>
          <button
            onClick={onProceedToTicket}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Mở ticket trong hộp thư</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};

