# Hệ Thống Tự Động Định Tuyến Hỗ Trợ Khách Hàng Đa Kênh (Universal Helpdesk Ticket Router)

[![PyTorch](https://img.shields.io/badge/PyTorch-2.15-EE4C2C?style=flat&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Hệ thống học sâu sử dụng **PyTorch Multi-Task BiLSTM kết hợp cơ chế Attention (Bahdanau Self-Attention)** để tự động phân tích ngữ nghĩa, phân loại **7 Loại vấn đề phổ quát** và **4 Mức độ ưu tiên**, tích hợp **Cổng kiểm soát rủi ro (Human Triage Gate)** cho mọi doanh nghiệp.

---

## 🎯 Bài Toán Sau Khi Đặt Lại & 3 Nguyên Tắc Thiết Kế

1. **Phân loại theo nội dung, không theo thương hiệu hay kênh:** Mô hình không học nhãn "hãng nào trả lời", mà học 7 nhóm vấn đề phổ quát (Thanh toán, Giao hàng, Lỗi kỹ thuật, Tài khoản, Chất lượng sản phẩm, Khiếu nại gay gắt, Thắc mắc chung) và mức độ ưu tiên. Mỗi tổ chức chỉ cần một bảng ánh xạ để chuyển sang hàng đợi của mình mà không cần huấn luyện lại.
2. **Khử triệt để dấu vết Twitter:** Loại bỏ `@mentions`, `#hashtags`, `RT`, URLs rút gọn để mô hình không học "đường tắt", đảm bảo hoạt động tốt khi gặp Email dài hoặc Live Chat.
3. **Xử lý khác biệt về độ dài qua Attention:** Email dài chứa nhiều câu xã giao được tầng Attention tự động chắt lọc và tập trung vào các từ khóa vấn đề chính.

---

## 📊 Kết Quả Thực Nghiệm & Benchmark Khoa Học

| Mô hình (Model) | Độ chính xác (Accuracy) | Macro-F1 Loại vấn đề | Top-3 Accuracy | Độ chính xác Mức ưu tiên |
| :--- | :---: | :---: | :---: | :---: |
| **TF-IDF + Logistic Regression** | 92.71% | 92.71% | - | - |
| **Multi-Task Baseline LSTM** | 97.48% | 97.49% | - | 93.10% |
| **Multi-Task BiLSTM + Attention (Đề xuất)** | **99.38%** | **99.38%** | **99.95%** | **98.43% (F1: 94.61%)** |

- **Thử nghiệm ngành mới (Industry Hold-out):** Đạt **91.43% Macro-F1** trên ngành chưa từng thấy trong huấn luyện.
- **Tự động hóa an toàn (Risk-Coverage):** Ở mức Coverage 70%, độ chính xác đạt tuyệt đối **100.0%**. Các yêu cầu có độ tin cậy < 60% hoặc mức ưu tiên khẩn cấp tự động được chuyển cho **Người duyệt thủ công (Human Review)**.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Khởi chạy Giao diện Web Helpdesk Hiện đại
```bash
python app.py
```
👉 Mở trình duyệt tại: **`http://localhost:8000`** hoặc **`http://127.0.0.1:8000`**

**Tính năng trên Web:**
- Thử nghiệm 1-click với các mẫu thực tế (Email hoàn tiền, Email giao hàng trễ, Chat lỗi sập app, Ticket mất OTP, Khiếu nại đe dọa pháp lý...).
- Đổi tổ chức ánh xạ (E-Commerce, Fintech/Ngân hàng, Phần mềm SaaS).
- Kéo thanh trượt điều chỉnh ngưỡng tự động hóa để xem cờ Triage Gate bật tắt.
- Bản đồ nhiệt Attention tô màu từ khóa quan trọng theo thời gian thực.

### 3. Kiểm thử tương tác qua dòng lệnh (CLI Demo)
```bash
python demo_cli.py
```
Cho phép gõ trực tiếp nội dung ticket, đổi ngành nghề (`:switch`) và xem kết quả định tuyến cùng biểu đồ Attention ASCII trực tiếp trên Terminal.

### 4. Chạy kiểm thử tự động (Unit Tests)
```bash
python -m unittest tests/test_pipeline.py
```

### 5. Tái lập toàn bộ luồng huấn luyện & đánh giá
```bash
python run_all.py
```

---

## 📁 Cấu Trúc Thư Mục Chuẩn Hóa

```
DeepLearning/
│
├── archive/                      # Dữ liệu nguồn Twitter Customer Support (twcs.csv)
├── data/                         # Dữ liệu Universal (train, val, test, vocab, labels)
├── models/                       # Trọng số PyTorch đã huấn luyện (best_universal_bilstm_attention.pt)
├── reports/                      # Đồ thị học tập, đường cong Risk-Coverage và ma trận nhầm lẫn
├── src/
│   ├── build_universal_dataset.py # Tạo dữ liệu phổ quát bằng Weak Supervision & Khử rò rỉ
│   ├── dataset_universal.py       # PyTorch Dataset đa nhiệm (Multi-task)
│   ├── models_universal.py        # MultiTaskBiLSTMAttention & BaselineLSTM
│   ├── train_universal.py         # Huấn luyện mô hình đa nhiệm
│   ├── evaluate_universal.py      # Đánh giá benchmark, industry hold-out & risk-coverage
│   └── predict_universal.py       # Engine định tuyến và cổng kiểm duyệt Triage
├── app.py                        # Giao diện Web Helpdesk hiện đại (FastAPI + Tailwind)
├── run_all.py                    # Script tự động chạy toàn bộ pipeline
├── BAO_CAO_DE_TAI.md             # Báo cáo đề tài khoa học toàn diện
└── README.md
```
