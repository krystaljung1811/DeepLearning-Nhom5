# Hệ Thống Tự Động Định Tuyến Hỗ Trợ Khách Hàng Đa Kênh (Universal Helpdesk Ticket Router)

[![PyTorch](https://img.shields.io/badge/PyTorch-2.15-EE4C2C?style=flat&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Hệ thống học sâu sử dụng **PyTorch Multi-Task BiLSTM kết hợp cơ chế Bahdanau Additive Attention** để tự động phân tích ngữ nghĩa, phân loại **7 Loại vấn đề phổ quát** và **4 Mức độ ưu tiên**, tích hợp **Cổng kiểm soát rủi ro (Human Triage Gate)** và giao diện điều hành chuẩn Enterprise Helpdesk (Zendesk / Intercom / Linear style).

---

## 🎯 Bài Toán Sau Khi Đặt Lại & 3 Nguyên Tắc Thiết Kế

1. **Phân loại theo nội dung, không theo thương hiệu hay kênh:** Mô hình không học nhãn "hãng nào trả lời" (chỉ có nghĩa trên Twitter), mà học 7 nhóm vấn đề phổ quát (*Thanh toán & Hoàn tiền, Giao hàng & Vận chuyển, Lỗi kỹ thuật, Tài khoản & Bảo mật, Chất lượng sản phẩm, Khiếu nại gay gắt, Thắc mắc chung*) và 4 mức độ ưu tiên (*P1 - Khẩn cấp đến P4 - Thấp*). Mỗi tổ chức chỉ cần một bảng ánh xạ nội bộ để chuyển sang hàng đợi của mình mà không cần huấn luyện lại.
2. **Khử triệt để dấu vết Twitter:** Loại bỏ `@mentions`, `#hashtags`, `RT`, URLs rút gọn để mô hình không học "đường tắt", đảm bảo hoạt động tốt khi gặp Email dài hoặc Live Chat.
3. **Xử lý khác biệt về độ dài qua Attention:** Email dài chứa nhiều câu xã giao được tầng Bahdanau Attention tự động chắt lọc và tập trung vào các từ khóa vấn đề chính.

---

## 📊 Kết Quả Thực Nghiệm & Nghiên Cứu Bóc Tách (Ablation Study)

### 1. Bảng Đối Sánh Các Kiến Trúc Mô Hình
| Kiến Trúc Mô Hình | Accuracy | Macro-F1 (Category) | Hold-out Ngành mới | Khi Bị Che Từ Khóa | Khả Năng Giải Thích |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Regex Rule Baseline (Luật từ khóa)** | 84.20% | 83.95% | 76.80% | **0.0% (Liệt hoàn toàn)** | Khớp chuỗi cứng |
| **TF-IDF + Logistic Regression** | 92.71% | 92.71% | 83.40% | 41.20% | Trọng số tuyến tính |
| **Unidirectional LSTM (Last Hidden)** | 96.82% | 96.80% | 88.10% | 72.40% | Hộp đen |
| **BiLSTM + Mean/Max Pooling** | 97.94% | 97.95% | 89.70% | 79.80% | Bình quân trọng số đều |
| **BiLSTM + Bahdanau Attention (Đề xuất)** | **99.38%** | **99.38%** | **91.43%** | **87.65%** | **Self-Attention Heatmap** |

### 2. Đóng Góp Của Từng Thành Phần (Ablation Analysis)
- **Đóng góp của Bidirectional (2 chiều):** Tăng **+1.12% F1** (từ 96.82% lên 97.94%) nhờ việc nắm bắt ngữ cảnh theo cả hai hướng trước và sau.
- **Đóng góp của Bahdanau Attention:** Tăng **+1.44% F1** (từ 97.94% lên 99.38%) vượt trội so với Mean Pooling nhờ khả năng dồn trọng số vào các từ khóa quyết định.

### 3. Thí Nghiệm Che Từ Khóa (Keyword Occlusion Test)
Khi che toàn bộ các từ khóa kích hoạt của Regex (`refund`, `charge`, `crash`, `freeze`, `password`, `stolen`...):
- **Regex Baseline:** Tụt về **0.0%** do không còn từ khóa để so khớp.
- **BiLSTM + Attention:** Vẫn giữ vững độ chính xác **87.65%**, chứng minh mô hình học cấu trúc ngữ nghĩa sâu (semantic syntax) của cả câu chứ không "học vẹt" luật Regex.

### 4. Kiểm Tra Tính Trung Thực (Attention Faithfulness Test)
Theo phương pháp của *Jain & Wallace (2019)* và *Wiegreffe & Pinter (2019)*:
- Che **Top-3 Attention Tokens** làm sụt giảm **64.2% độ tin cậy** của mô hình.
- Che **3 Tokens ngẫu nhiên** chỉ làm sụt giảm **3.8% độ tin cậy**.
- Tác động chênh lệch lên tới **16.9 lần**, chứng minh Attention trung thực và phản ánh đúng cơ chế quyết định.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Khởi chạy Ứng dụng Helpdesk Workspace (React + FastAPI)
Mở terminal và chạy lệnh:
```bash
python app.py
```
👉 Mở trình duyệt và truy cập: **`http://localhost:8000`** (hoặc `http://127.0.0.1:8000`).

*(Tùy chọn dành cho Lập trình viên)*: Nếu muốn chỉnh sửa giao diện Frontend với Hot Module Reload (HMR):
```bash
cd frontend
npm run dev
```
👉 Truy cập giao diện phát triển tại: **`http://localhost:5173`** (đã được cấu hình tự động Proxy API sang `:8000`).

### 2. Kiểm thử tương tác qua dòng lệnh (CLI Interactive Demo)
```bash
python demo_cli.py
```
Cho phép gõ trực tiếp nội dung ticket, đổi ngành nghề (`:switch`) và xem kết quả định tuyến cùng biểu đồ Attention ASCII trực tiếp trên Terminal.

### 3. Chạy kiểm thử tự động (Unit Tests)
```bash
python -m unittest tests/test_pipeline.py
```

### 4. Tái lập toàn bộ luồng huấn luyện & đánh giá (Pipeline Automation)
```bash
python run_all.py
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
DeepLearning/
├── frontend/                     # Giao diện Helpdesk hiện đại (React 19 + TypeScript + Vite + Tailwind + Recharts + Lucide)
│   ├── src/
│   │   ├── components/           # Inbox (3-pane), Dashboard (Charts), ModelInsights (Ablation), Settings
│   │   ├── types.ts              # Định nghĩa TypeScript chuẩn
│   │   ├── mockData.ts           # 25 kịch bản ticket mẫu phong phú
│   │   └── App.tsx               # Ứng dụng điều phối trung tâm
│   ├── vite.config.ts            # Cấu hình Vite & Tailwind v4
│   └── package.json
├── data/                         # Dữ liệu Universal (train, val, test, vocab, feedback.jsonl)
├── models/                       # Trọng số PyTorch đã huấn luyện (best_universal_bilstm_attention.pt)
├── reports/                      # Báo cáo đánh giá, biểu đồ Risk-Coverage và ma trận nhầm lẫn
├── src/                          # Mã nguồn Python xử lý mô hình
│   ├── build_universal_dataset.py# Khử rò rỉ, phân tầng dữ liệu
│   ├── dataset_universal.py      # PyTorch Dataset đa nhiệm (Multi-task)
│   ├── models_universal.py       # Kiến trúc BiLSTM + Bahdanau Attention
│   ├── train_universal.py        # Huấn luyện mô hình
│   ├── evaluate_universal.py     # Đánh giá benchmark và hold-out
│   └── predict_universal.py      # Engine suy luận, trích xuất Attention & Triage Gate
├── tests/                        # Kiểm thử đơn vị
├── app.py                        # FastAPI Backend & Static File Server
├── demo_cli.py                   # Terminal Demo tương tác
├── BAO_CAO_DE_TAI.md             # Luận văn báo cáo khoa học toàn diện
└── README.md
```

> [!NOTE]
> Thư mục dữ liệu thô `archive/twcs/twcs.csv` (~492.58 MB) được tải từ Kaggle Dataset *"Customer Support on Twitter"*. Do chính sách của GitHub giới hạn tệp tối đa 100 MB, tệp này được liệt kê trong `.gitignore` và không đẩy lên Git repository. Khi sao chép dự án về máy mới, bạn chỉ cần tải tệp `twcs.csv` từ Kaggle và đặt vào thư mục `archive/twcs/`.
