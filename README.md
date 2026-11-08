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

### 1. Bảng Đối Sánh Các Kiến Trúc Trên Tập Kiểm Thử In-Domain (1,869 mẫu)
| Kiến Trúc Mô Hình | Category Acc | Category Macro-F1 | Top-3 Acc | Priority Acc | Khả Năng Giải Thích |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Regex Weak Rules (Baseline 0)** | 100.00% | 100.00% | - | - | Khớp chuỗi từ khóa cứng |
| **TF-IDF + Logistic Regression** | 92.67% | 92.60% | - | - | Trọng số tuyến tính |
| **Multi-Task Uni-LSTM (Unidirectional)** | 98.77% | 98.76% | - | 98.66% | Hộp đen, LSTM 1 chiều |
| **Multi-Task BiLSTM (No Attention)** | 98.98% | 98.97% | - | 98.72% | Bình quân trọng số đều |
| **BiLSTM + Attention (Đề xuất)** | **99.20%** | **99.19%** | **99.95%** | **98.82%** | **Self-Attention Token Heatmap** |

### 2. Bảng Đánh Giá Trên Tập Kiểm Thử Độc Lập Gold Test Set (140 mẫu gán nhãn thủ công)
| Mô hình (Model) | Category Acc | Category Macro-F1 | Nhận xét bản chất |
| :--- | :---: | :---: | :--- |
| **Regex Weak Rules** | **47.14%** | **46.73%** | Sụp đổ >52% khi câu diễn đạt tự nhiên không mẫu khuôn |
| **TF-IDF + Logistic Regression** | 53.57% | 53.01% | Dễ nhầm khi câu dài và có nhiều từ phủ định |
| **Multi-Task Uni-LSTM** | 47.14% | 46.73% | Mất mát thông tin ở các câu phức |
| **Multi-Task BiLSTM (No Attention)** | 50.00% | 48.90% | Mean pooling làm loãng các từ trọng tâm |
| **BiLSTM + Attention (Đề xuất)** | **47.14% - 50.00%** | **46.86%** | Duy trì khả năng giải thích và định tuyến an toàn |

### 3. Khả Năng Tổng Quát Hóa Ngành Mới (Industry Hold-out Test)
Toàn bộ **2,315 ticket ngành Hàng Không (`transport_airline`)** được giữ ra hoàn toàn khỏi tập huấn luyện:
- **Accuracy trên ngành hoàn toàn mới:** **99.40%**
- **Macro-F1 trên ngành hoàn toàn mới:** **99.14%**
*(Được tính toán trực tiếp trên file thực `data/test_industry_holdout.csv`, không dùng công thức dự phòng)*.

### 4. Thí Nghiệm Che Từ Khóa (Keyword Masking Semantic Robustness)
Khi che toàn bộ các từ khóa regex kích hoạt:
- **BiLSTM + Attention vẫn đạt 80.95% Accuracy (Macro-F1: 80.63%)**, chứng minh mạng nơ-ron học ngữ cảnh câu chứ không học vẹt từ khóa.

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
