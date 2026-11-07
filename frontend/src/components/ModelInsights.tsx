import React from 'react';

export const ModelInsights: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Nghiên cứu bóc tách & Thử nghiệm chuyên sâu
        </h2>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          Đối sánh khoa học giữa BiLSTM + Attention, baseline LSTM, TF-IDF và luật Regex.
        </p>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">BiLSTM + Attention F1</span>
          <span className="text-base font-semibold text-indigo-600 block">99.38%</span>
          <span className="text-xs text-emerald-600 font-normal block">+6.67% so với TF-IDF</span>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">Đóng góp của Attention</span>
          <span className="text-base font-semibold text-indigo-600 block">+1.44%</span>
          <span className="text-xs text-slate-500 font-normal block">So với Mean Pooling</span>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">Che từ khóa kích hoạt</span>
          <span className="text-base font-semibold text-emerald-700 block">87.65%</span>
          <span className="text-xs text-rose-600 font-normal block">Regex sập về 0.0%</span>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">Độ sụt khi che Attention</span>
          <span className="text-base font-semibold text-rose-700 block">-64.2%</span>
          <span className="text-xs text-slate-500 font-normal block">Che ngẫu nhiên chỉ -3.8%</span>
        </div>

      </div>

      {/* 1. Benchmark Table */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Bảng đối sánh các kiến trúc mô hình
          </h3>
          <p className="text-xs text-slate-500 font-normal">
            Đánh giá trên tập kiểm thử độc lập 2,100 mẫu
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs">
              <tr>
                <th className="py-2.5 px-3">Kiến trúc mô hình</th>
                <th className="py-2.5 px-3">Độ chính xác</th>
                <th className="py-2.5 px-3">Macro-F1</th>
                <th className="py-2.5 px-3">Hold-out ngành mới</th>
                <th className="py-2.5 px-3">Khi che từ khóa</th>
                <th className="py-2.5 px-3">Cơ chế giải thích</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-semibold text-slate-800">Regex Rule-based Baseline</td>
                <td className="py-2.5 px-3">84.20%</td>
                <td className="py-2.5 px-3">83.95%</td>
                <td className="py-2.5 px-3 text-slate-500">76.80%</td>
                <td className="py-2.5 px-3 text-rose-600 font-semibold">0.0% (Liệt hoàn toàn)</td>
                <td className="py-2.5 px-3 text-slate-400">Khớp chuỗi cứng</td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-semibold text-slate-800">TF-IDF + Logistic Regression</td>
                <td className="py-2.5 px-3">92.71%</td>
                <td className="py-2.5 px-3">92.71%</td>
                <td className="py-2.5 px-3 text-slate-500">83.40%</td>
                <td className="py-2.5 px-3 text-slate-500">41.20%</td>
                <td className="py-2.5 px-3 text-slate-400">Trọng số tuyến tính</td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-semibold text-slate-800">Unidirectional LSTM (Last Hidden)</td>
                <td className="py-2.5 px-3">96.82%</td>
                <td className="py-2.5 px-3">96.80%</td>
                <td className="py-2.5 px-3 text-slate-500">88.10%</td>
                <td className="py-2.5 px-3 text-slate-700">72.40%</td>
                <td className="py-2.5 px-3 text-slate-400">Vector ẩn cuối</td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-semibold text-slate-800">BiLSTM + Mean/Max Pooling</td>
                <td className="py-2.5 px-3">97.94%</td>
                <td className="py-2.5 px-3">97.95%</td>
                <td className="py-2.5 px-3 text-slate-500">89.70%</td>
                <td className="py-2.5 px-3 text-slate-700">79.80%</td>
                <td className="py-2.5 px-3 text-slate-400">Bình quân trọng số đều</td>
              </tr>

              <tr className="bg-indigo-50/50 font-semibold text-indigo-950">
                <td className="py-2.5 px-3 text-indigo-900">BiLSTM + Bahdanau Attention (Đề xuất)</td>
                <td className="py-2.5 px-3 text-emerald-700">99.38%</td>
                <td className="py-2.5 px-3 text-emerald-700">99.38%</td>
                <td className="py-2.5 px-3 text-indigo-700">91.43%</td>
                <td className="py-2.5 px-3 text-emerald-700">87.65%</td>
                <td className="py-2.5 px-3 text-indigo-700">Self-Attention Heatmap</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Ablation & Keyword Occlusion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Ablation study */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Nghiên cứu bóc tách (Ablation study)
          </h3>
          <p className="text-xs text-slate-500 font-normal">
            Tách biệt đóng góp của Bidirectional và Attention
          </p>

          <div className="space-y-2 text-xs leading-relaxed text-slate-600 pt-1">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between font-semibold text-slate-800">
                <span>1. Đóng góp của Bidirectional:</span>
                <span className="text-indigo-600 font-semibold">+1.12% F1</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Tăng từ 96.82% lên 97.94%. BiLSTM đọc theo hai chiều xuôi và ngược, giúp bắt được các quan hệ phủ định như <em>"cancelled but charged"</em>.
              </p>
            </div>

            <div className="p-2.5 bg-indigo-50/40 rounded-lg border border-indigo-200 space-y-1">
              <div className="flex justify-between font-semibold text-indigo-950">
                <span>2. Đóng góp của Bahdanau Attention:</span>
                <span className="text-emerald-700 font-semibold">+1.44% F1</span>
              </div>
              <p className="text-xs text-slate-600 font-normal">
                Tăng từ 97.94% lên 99.38%. Cơ chế Attention tập trung phân bổ trọng số lớn cho các từ quyết định nghiệp vụ và triệt tiêu câu chào hỏi xã giao.
              </p>
            </div>
          </div>
        </div>

        {/* Keyword occlusion */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Thí nghiệm che từ khóa (Keyword occlusion)
          </h3>
          <p className="text-xs text-slate-500 font-normal">
            Bằng chứng mô hình học ngữ nghĩa thay vì học vẹt Regex
          </p>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
            <p className="text-xs font-normal">
              Che toàn bộ các từ kích hoạt của Regex (như <em>refund, charge, crash, freeze, password, delivery</em>):
            </p>

            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-xs text-rose-800 font-normal block">Luật Regex</span>
                <span className="text-base font-semibold text-rose-700 mt-0.5 block">0.0%</span>
                <span className="text-xs text-rose-500 font-normal">Mất từ khóa là không thể nhận diện</span>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-xs text-emerald-800 font-normal block">BiLSTM + Attention</span>
                <span className="text-base font-semibold text-emerald-700 mt-0.5 block">87.65%</span>
                <span className="text-xs text-emerald-600 font-normal">Vẫn đoán đúng nhờ ngữ cảnh</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-normal pt-1">
              Kết luận: Mô hình học được cấu trúc cú pháp và ngữ nghĩa toàn câu, không phụ thuộc vào chuỗi từ khóa cứng.
            </p>
          </div>
        </div>

      </div>

      {/* 3. Faithfulness & Risk-Coverage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Attention Faithfulness */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Kiểm tra tính trung thực của Attention
          </h3>
          <p className="text-xs text-slate-500 font-normal">
            Phương pháp Jain & Wallace (2019)
          </p>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 bg-rose-50 rounded-lg border border-rose-200 text-xs">
                <span className="font-semibold text-rose-900">Che Top-3 token có Attention cao nhất:</span>
                <span className="font-semibold text-rose-700">-64.2% độ tin cậy</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-700 font-normal">Che 3 token ngẫu nhiên:</span>
                <span className="font-semibold text-slate-600">-3.8% độ tin cậy</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-normal">
              Chênh lệch <strong>16.9 lần</strong> chứng minh cơ chế Attention trung thực và đóng vai trò chi phối trực tiếp vào vector đầu ra.
            </p>
          </div>
        </div>

        {/* Risk-Coverage table */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Tỷ lệ tự động hóa & Rủi ro (Risk vs. Coverage)
          </h3>
          <p className="text-xs text-slate-500 font-normal">
            Thiết lập ngưỡng Triage Gate đảm bảo độ chính xác
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg text-xs">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs">
                <tr>
                  <th className="py-2 px-2.5">Độ bao phủ</th>
                  <th className="py-2 px-2.5">Độ chính xác</th>
                  <th className="py-2 px-2.5">Ngưỡng tin cậy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                <tr>
                  <td className="py-2 px-2.5 font-semibold text-emerald-800">70% yêu cầu tự động</td>
                  <td className="py-2 px-2.5 font-semibold text-emerald-700">100.0% (0 lỗi)</td>
                  <td className="py-2 px-2.5 text-slate-400">&gt; 0.9996</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-semibold text-slate-800">80% yêu cầu tự động</td>
                  <td className="py-2 px-2.5 text-slate-700">99.94%</td>
                  <td className="py-2 px-2.5 text-slate-400">&gt; 0.9992</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-semibold text-slate-800">90% yêu cầu tự động</td>
                  <td className="py-2 px-2.5 text-slate-700">99.89%</td>
                  <td className="py-2 px-2.5 text-slate-400">&gt; 0.9975</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 text-slate-500">100% (toàn bộ)</td>
                  <td className="py-2 px-2.5 text-slate-600">99.38%</td>
                  <td className="py-2 px-2.5 text-slate-400">Tất cả</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
