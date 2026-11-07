import React, { useState } from 'react';
import { X, Upload, CheckCircle2, FileText } from 'lucide-react';
import type { ImportEvaluation } from '../types';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number, evalResult?: ImportEvaluation) => void;
  selectedIndustry: string;
  confidenceThreshold: number;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  selectedIndustry,
  confidenceThreshold
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    evaluation?: ImportEvaluation;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Vui lòng chọn tệp CSV');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('industry', selectedIndustry);
    formData.append('confidence_threshold', confidenceThreshold.toString());

    try {
      const res = await fetch('/api/tickets/import', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Import failed');
      }

      const data = await res.json();
      setImportResult({
        imported_count: data.imported_count,
        evaluation: data.evaluation
      });
      onImportSuccess(data.imported_count, data.evaluation);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi nhập tệp CSV');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-xl w-full border border-slate-200 shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Nhập hàng loạt từ tệp CSV (Batch Evaluation)
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Định tuyến tự động danh sách ticket hoặc kiểm thử Gold Set độc lập
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          
          {!importResult ? (
            <>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-slate-600 font-normal leading-relaxed">
                <span className="font-semibold text-slate-800 block">Cấu trúc tệp CSV được hỗ trợ:</span>
                <p>• Cột bắt buộc: <code className="font-semibold text-indigo-700 bg-white px-1 py-0.5 rounded border border-slate-200">text</code> (nội dung yêu cầu của khách hàng).</p>
                <p>• Cột tùy chọn: <code className="font-semibold text-indigo-700 bg-white px-1 py-0.5 rounded border border-slate-200">label</code> (nhãn thật để tự động đo độ chính xác & ma trận nhầm lẫn).</p>
                <p>• Các cột khác: <code className="text-slate-600 bg-white px-1 py-0.5 rounded border border-slate-200">subject</code>, <code className="text-slate-600 bg-white px-1 py-0.5 rounded border border-slate-200">customer_name</code>, <code className="text-slate-600 bg-white px-1 py-0.5 rounded border border-slate-200">email</code>, <code className="text-slate-600 bg-white px-1 py-0.5 rounded border border-slate-200">channel</code>.</p>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center space-y-2 hover:border-indigo-400 transition-colors">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs text-slate-600 font-normal">
                  <label className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    Chọn tệp CSV từ máy tính
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span> hoặc kéo thả vào đây</span>
                </div>
                {file && (
                  <div className="text-xs font-semibold text-emerald-700 pt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã chọn: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-normal leading-relaxed">
                <span className="font-semibold block text-sm">Nhập dữ liệu thành công!</span>
                <span>Đã nạp và định tuyến thành công <strong>{importResult.imported_count}</strong> ticket vào cơ sở dữ liệu SQLite.</span>
              </div>

              {/* Evaluation Metrics if labels were provided */}
              {importResult.evaluation && (
                <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      Kết quả đánh giá trên tập nhãn kiểm thử (Gold Set):
                    </span>
                    <span className="font-semibold text-emerald-700 text-sm">
                      {importResult.evaluation.accuracy}% Accuracy
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-normal">
                    Dự đoán đúng {importResult.evaluation.correct_count} / {importResult.evaluation.total_labeled} mẫu có nhãn thật.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-normal cursor-pointer"
          >
            Đóng
          </button>
          {!importResult && (
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Đang phân tích...' : 'Bắt đầu nạp & Định tuyến'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
