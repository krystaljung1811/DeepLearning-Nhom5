# BÁO CÁO ĐỀ TÀI NGHIÊN CỨU & THỰC NGHIỆM

## ĐỀ TÀI: ỨNG DỤNG MẠNG NƠ-RON BiLSTM KẾT HỢP CƠ CHẾ ATTENTION TRONG TỰ ĐỘNG PHÂN LOẠI VÀ ĐỊNH TUYẾN YÊU CẦU HỖ TRỢ KHÁCH HÀNG ĐA KÊNH

---

### MỤC LỤC
1. [BÀI TOÁN SAU KHI ĐẶT LẠI (PROBLEM RE-FORMULATION)](#1-bài-toán-sau-khi-đặt-lại)
2. [BA NGUYÊN TẮC THIẾT KẾ CỐT LÕI](#2-ba-nguyên-tắc-thiết-kế-cốt-lõi)
   - 2.1. Phân loại theo nội dung thay vì thương hiệu hay kênh
   - 2.2. Khử triệt để dấu vết đặc thù của Twitter
   - 2.3. Xử lý độ dài và văn phong đa kênh (Email, Chat, Ticket)
3. [DỮ LIỆU & PHƯƠNG PHÁP GIÁM SÁT YẾU (WEAK SUPERVISION)](#3-dữ-liệu--phương-pháp-giám-sát-yếu)
   - 3.1. Nguồn dữ liệu Twitter Customer Support (`twcs.csv`)
   - 3.2. Bộ nhãn phổ quát 7 nhóm vấn đề & 4 mức ưu tiên
   - 3.3. Quy trình gán nhãn giám sát yếu có kiểm soát
4. [KIẾN TRÚC MÔ HÌNH MULTI-TASK BiLSTM + ATTENTION](#4-kiến-trúc-mô-hình-multi-task-bilstm--attention)
   - 4.1. Sơ đồ khối tổng thể hệ thống
   - 4.2. Cơ chế Bahdanau Self-Attention Pooling & Giải thích (Explainability)
   - 4.3. Đầu ra đa nhiệm (Category & Priority) và Cổng kiểm soát rủi ro (Human Triage Gate)
   - 4.4. Mô hình đối chứng Baseline (TF-IDF + Logistic Regression, Baseline LSTM)
5. [ĐÁNH GIÁ KHẢ NĂNG TỔNG QUÁT HÓA (GENERALIZATION BENCHMARK)](#5-đánh-giá-khả-năng-tổng-quát-hóa)
   - 5.1. Kết quả kiểm thử trên tập In-Domain (Test Set 2,100 mẫu)
   - 5.2. Thử nghiệm giữ ra theo ngành (Industry Hold-out Test)
   - 5.3. Thử nghiệm đa kênh bên ngoài (Cross-Channel External Test: Email dài, Live Chat)
   - 5.4. Đường cong Tỷ lệ Tự động hóa vs Độ chính xác (Risk-Coverage Curve)
6. [HỆ THỐNG GIAO DIỆN HELPDESK & ÁNH XẠ HÀNG ĐỢI DOANH NGHIỆP](#6-hệ-thống-giao-diện-helpdesk--ánh-xạ-hàng-đợi-doanh-nghiệp)
7. [GIỚI HẠN THỰC TẾ & KHẢ NĂNG ỨNG DỤNG TẠI VIỆT NAM](#7-giới-hạn-thực-tế--khả-năng-ứng-dụng-tại-việt-nam)
   - 7.1. Độ lệch phân bố giữa mạng xã hội và ticket nội bộ
   - 7.2. Vấn đề ngôn ngữ và bối cảnh Việt Nam
   - 7.3. Vòng lặp phản hồi người duyệt (Human-in-the-Loop Active Learning)
8. [KẾT LUẬN & HƯỚNG PHÁT TRIỂN](#8-kết-luận--hướng-phát-triển)

---

### 1. BÀI TOÁN SAU KHI ĐẶT LẠI

Trong cách tiếp cận truyền thống, việc gán nhãn *"Hãng nào đã trả lời tweet"* chỉ có ý nghĩa cục bộ trên mạng xã hội Twitter, khiến mô hình bị phụ thuộc vào tên thương hiệu và không thể áp dụng cho bất kỳ doanh nghiệp nào khác.

**Định nghĩa bài toán chuẩn hóa:**
> *Với một yêu cầu hỗ trợ dạng văn bản gửi từ **bất kỳ kênh nào** (Email dài, Live Chat trên Website, Ứng dụng di động, Mạng xã hội), hệ thống tự động dự đoán **Loại vấn đề** và **Mức độ ưu tiên** theo một **bộ nhãn dùng chung (Universal Labels)** cho mọi tổ chức. Mỗi tổ chức chỉ cần một bảng ánh xạ cấu hình để chuyển nhãn này sang hàng đợi nội bộ tương ứng. Những yêu cầu có độ tin cậy thấp hoặc rủi ro cao tự động được chuyển cho nhân viên duyệt.*

Cách đặt bài toán này giải quyết trọn vẹn nhu cầu ứng dụng thực tế tại Việt Nam và môi trường doanh nghiệp nói chung, vì mô hình hoàn toàn **không phụ thuộc vào việc khách hàng nhắn qua Twitter hay qua kênh nào**.

---

### 2. BA NGUYÊN TẮC THIẾT KẾ CỐT LÕI

#### 2.1. Phân loại theo nội dung, không theo thương hiệu hay kênh
Mô hình học từ vựng và cấu trúc ngữ nghĩa thuần túy của vấn đề khách hàng gặp phải (ví dụ: bị trừ tiền sai, giao hàng chậm, app bị đơ, không nhận được OTP, hàng vỡ, nhân viên thô lỗ...). Bằng cách này, mô hình trở thành một **Universal Classification Engine**, phục vụ được đồng thời nhiều lĩnh vực (E-commerce, Ngân hàng/Fintech, SaaS, Bán lẻ) chỉ qua một bảng ánh xạ (Routing Mapping Table).

#### 2.2. Khử triệt để dấu vết đặc thù của Twitter
Để mô hình không học các "đường tắt" (shortcut learning), quy trình tiền xử lý loại bỏ:
- `@mentions` (tránh lộ tên hãng và tên người dùng)
- `#hashtags` (chỉ giữ lại từ ngữ, bỏ ký hiệu `#`)
- Tiền tố `RT` (Retweet)
- Toàn bộ URLs rút gọn (`t.co`, `bit.ly`)
- Khống chế độ dài đặc trưng của tweet (tối đa 280 ký tự) bằng cách huấn luyện với câu có cấu trúc tự nhiên và mở rộng kiểm thử trên các đoạn văn bản dài.

#### 2.3. Xử lý khác biệt về độ dài và văn phong giữa các kênh
Email và Ticket hệ thống thường dài hơn tweet nhiều (chứa lời chào mở đầu, thông tin bối cảnh dài, lời cảm ơn). Mô hình sử dụng **Cơ chế Attention (Bahdanau Self-Attention)** đóng vai trò như bộ lọc thông minh: dù văn bản dài nhiều câu, cơ chế Attention tự động định vị và "phóng to" (zoom in) vào đoạn mang nội dung cốt lõi của khiếu nại, triệt tiêu ảnh hưởng của các câu chào hỏi xã giao thông thường.

---

### 3. DỮ LIỆU & PHƯƠNG PHÁP GIÁM SÁT YẾU (WEAK SUPERVISION)

#### 3.1. Nguồn dữ liệu gốc (`twcs.csv`)
Tập dữ liệu Customer Support on Twitter gồm gần 3 triệu tương tác. Dự án trích xuất các tin nhắn inbound từ khách hàng, lọc bỏ toàn bộ các dấu vết mạng xã hội.

#### 3.2. Bộ nhãn phổ quát 7 Nhóm vấn đề & 4 Mức ưu tiên

**1. Bảy loại vấn đề phổ quát (Universal Categories):**
1. **`billing_refund` (Thanh toán & Hoàn tiền):** Giao dịch sai, trừ tiền nhầm, hoàn tiền hóa đơn, cước phí thuê bao, thẻ tín dụng.
2. **`shipping_delivery` (Giao hàng & Vận chuyển):** Đơn hàng trễ, sai địa chỉ, thất lạc bưu kiện, tài xế không đến, hành lý chậm trễ.
3. **`technical_issue` (Lỗi Kỹ thuật & Hệ thống):** Sập ứng dụng, màn hình đơ, lỗi mạng/wifi, hao pin, cập nhật phần mềm lỗi, mất kết nối máy chủ.
4. **`account_security` (Tài khoản & Bảo mật):** Quên/đổi mật khẩu, tài khoản bị khóa, mã xác thực OTP/2FA, đăng nhập trái phép.
5. **`product_quality` (Chất lượng Sản phẩm):** Hàng hỏng, nứt vỡ, linh kiện lỗi, sản phẩm ôi thiu, không đúng mô tả.
6. **`complaint_escalation` (Khiếu nại Gay gắt & Rủi ro):** Trải nghiệm tồi tệ, đe dọa báo công an/luật sư, yêu cầu gặp quản lý cấp cao.
7. **`general_inquiry` (Thắc mắc Chung):** Hỏi giờ mở cửa, chính sách đổi trả, hướng dẫn thao tác, địa chỉ chi nhánh.

**2. Bốn mức độ ưu tiên (Priority Levels):**
- **Urgent (Khẩn cấp - P1):** Đe dọa pháp lý, khiếu nại gay gắt, nguy cơ an ninh nghiêm trọng.
- **High (Cao - P2):** Tiền bị trừ sai, lỗi gián đoạn dịch vụ diện rộng, bưu kiện trễ nghiêm trọng.
- **Medium (Trung bình - P3):** Lỗi kỹ thuật thông thường, hỏi trạng thái vận đơn, đổi mật khẩu.
- **Low (Thấp - P4):** Thắc mắc chung, góp ý nhẹ nhàng.

#### 3.3. Phương pháp gán nhãn giám sát yếu (Weak Supervision)
Vì `twcs.csv` không có sẵn nhãn nghiệp vụ này, đề tài sử dụng phương pháp Weak Supervision kết hợp:
- Bộ luật từ khóa (Regular Expression Keyword Rules) có thứ tự ưu tiên (Priority Cascade).
- Heuristics phân tầng mức độ khẩn cấp.
- Kiểm tra tay trên mẫu đại diện (Sanity Check) để đảm bảo độ chính xác của nhãn huấn luyện.
- Tập dữ liệu được cân bằng hoàn hảo: **3,000 mẫu/nhóm vấn đề (tổng cộng 21,000 mẫu)**.

---

### 4. KIẾN TRÚC MÔ HÌNH MULTI-TASK BiLSTM + ATTENTION

#### 4.1. Sơ đồ khối tổng thể hệ thống

```
  Input Text (Email dài / Live Chat / Ticket)
                     │
                     ▼
  [ Khử dấu vết kênh (Sanitization) ] ──> Xóa @mentions, URLs, RT, chuẩn hóa từ vựng
                     │
                     ▼
  [ Token Embedding Layer (dim = 128) ]
                     │
                     ▼
  [ Stacked BiLSTM (2 layers, hidden = 128) ] ──> Ngữ cảnh xuôi & ngược H ∈ ℝ^(T × 256)
                     │
                     ▼
  [ Bahdanau Additive Attention Pooling ]
         │                                   │
         ▼                                   ▼
  Trọng số Attention α_t             Context Vector c = ∑ α_t · H_t (256-d)
  (Bản đồ nhiệt Heatmap)                     ├───> [ Category Head ] ──> 7 Loại vấn đề
                                             └───> [ Priority Head ] ──> 4 Mức ưu tiên
                                                           │
                                                           ▼
                                            [ Cổng Kiểm Soát (Triage Gate) ]
                                            ├── Độ tin cậy ≥ 60% & Không khẩn cấp ──> TỰ ĐỘNG ĐỊNH TUYẾN
                                            └── Độ tin cậy < 60% HOẶC Rủi ro cao ──> CHUYỂN NGƯỜI DUYỆT
```

#### 4.2. Cơ chế Bahdanau Self-Attention Pooling
Chuỗi trạng thái ẩn hai chiều $H = [H_1, H_2, \dots, H_T]$ được đưa qua tầng Attention:
$$u_t = \tanh(W_a H_t + b_a) \in \mathbb{R}^{d_a}$$
$$\alpha_t = \frac{\exp(v_a^\top u_t)}{\sum_{j=1}^T \exp(v_a^\top u_j)}$$
$$c = \sum_{t=1}^T \alpha_t H_t \in \mathbb{R}^{2 \cdot d_{hidden}}$$

Trọng số $\alpha_t$ phản ánh trực tiếp mức độ đóng góp của từng từ vào quyết định phân loại, mang lại khả năng diễn giải minh bạch (Explainable AI).

#### 4.3. Cổng kiểm soát rủi ro (Human Triage Gate)
Một hệ thống tự động trong thực tế không bao giờ được phép định tuyến mù quáng. Cổng Triage Gate áp dụng quy tắc:
$$\text{Human Review Required} = \left( \max P(\text{Category}|x) < \tau \right) \lor (\text{Priority} == \text{'Urgent'}) \lor (\text{Category} == \text{'complaint\_escalation'})$$
Với ngưỡng an toàn mặc định $\tau = 0.60$.

---

### 5. ĐÁNH GIÁ KHẢ NĂNG TỔNG QUÁT HÓA (BENCHMARK)

#### 5.1. So sánh trên tập kiểm thử độc lập (Test Set: 2,100 mẫu)

| Mô hình (Model) | Độ chính xác Loại vấn đề (Acc) | Macro-F1 Loại vấn đề | Top-3 Accuracy | Độ chính xác Mức ưu tiên |
| :--- | :---: | :---: | :---: | :---: |
| **TF-IDF + Logistic Regression** | 92.71% | 92.71% | - | - |
| **Multi-Task Baseline LSTM** | 97.48% | 97.49% | - | 93.10% |
| **Multi-Task BiLSTM + Attention (Đề xuất)** | **99.38%** | **99.38%** | **99.95%** | **98.43% (F1: 94.61%)** |

**Nhận xét:**
- BiLSTM + Attention vượt trội hơn mô hình Baseline LSTM truyền thống cả về tốc độ hội tụ (ngay từ Epoch 1 đã đạt F1 > 91.3% so với 5.6% của LSTM thường) lẫn độ chính xác cuối cùng.
- Chỉ số **Top-3 Accuracy đạt 99.95%**, đảm bảo khi đưa ra danh sách gợi ý cho nhân viên duyệt, nhãn chính xác hầu như luôn nằm trong top 3 lựa chọn đầu tiên.

#### 5.2. Thử nghiệm giữ ra theo ngành (Industry Hold-out Test)
- **Phương pháp:** Tách toàn bộ các đơn vị thuộc ngành Vận chuyển / Hàng không ra khỏi tập huấn luyện, sau đó đưa vào kiểm thử mô hình.
- **Mục đích:** Mô phỏng kịch bản một doanh nghiệp mới hoàn toàn lần đầu áp dụng hệ thống.
- **Kết quả:** Mô hình đạt **Macro-F1 = 91.43%** trên ngành chưa từng thấy, chứng minh tính tổng quát hóa cao của các đặc trưng ngữ nghĩa mà BiLSTM + Attention đã học.

#### 5.3. Thử nghiệm đa kênh bên ngoài (Cross-Channel External Test)
Kiểm thử trên tập dữ liệu mô phỏng Email dài (nhiều câu, có lời chào và bối cảnh dài) và tin nhắn Live Chat ngắn:
- Mô hình nhận diện chính xác 100% loại vấn đề trên các mẫu email dài (nhờ cơ chế Attention tập trung vào các từ khóa then chốt như *unauthorized charge, delayed shipment, crash update, broken bottle* và bỏ qua các câu chào hỏi xã giao).

#### 5.4. Đường cong Tỷ lệ Tự động hóa vs Độ chính xác (Risk-Coverage Curve)
Khi điều chỉnh ngưỡng tự động hóa từ 50% đến 100%:
- Ở mức **Coverage = 70%** (tự động hóa 70% lượng ticket dễ nhất), độ chính xác đạt tuyệt đối **100.0%**.
- Ở mức **Coverage = 90%**, độ chính xác đạt **99.89%**.
- Ở mức **Coverage = 100%** (tự động toàn bộ không có người duyệt), độ chính xác đạt **99.38%**.

---

### 6. HỆ THỐNG GIAO DIỆN HELPDESK & ÁNH XẠ HÀNG ĐỢI

Giao diện Web (`app.py`) được thiết kế lại hoàn toàn theo chuẩn Service Desk hiện đại:
- **Hỗ trợ văn bản đa định dạng:** Khung soạn thảo linh hoạt cho cả Email dài nhiều đoạn lẫn tin nhắn Chat ngắn.
- **Bộ chuyển đổi Tổ chức (Organization Selector):**
  - *E-Commerce & Bán lẻ:* Ánh xạ sang các hàng đợi: *Phòng Kế toán Hoàn tiền, Đội Điều phối Kho vận, Đội Kỹ thuật App, Đội Kiểm định Đổi trả, CSKH VIP...*
  - *Ngân hàng & Fintech:* Ánh xạ sang: *Phòng Tra soát Thẻ, Bộ phận Kỹ thuật Core Banking, Đội An ninh & Gian lận, Hotline 24/7...*
  - *Phần mềm & SaaS:* Ánh xạ sang: *Bộ phận Gói cước B2B, Kỹ sư Tier-2, Đội IAM, Key Account Manager...*
- **Thanh trượt Ngưỡng Tự Động Hóa (Confidence Slider):** Trực tiếp thay đổi ngưỡng an toàn từ 40% đến 95% để quan sát cờ Triage chuyển đổi thời gian thực.
- **Bản đồ nhiệt Attention:** Tô màu các từ khóa quyết định trong văn bản.

---

### 7. GIỚI HẠN THỰC TẾ & KHẢ NĂNG ỨNG DỤNG TẠI VIỆT NAM

1. **Độ lệch phân bố giữa Twitter và Ticket nội bộ:**
   - Twitter là mạng xã hội công khai nên các tin nhắn thiên hướng phàn nàn và gay gắt nhiều hơn ticket nội bộ (vốn chứa nhiều câu hỏi nghiệp vụ và thủ tục). Do đó, phân bố nhãn thực tế của doanh nghiệp có thể có tỷ lệ `general_inquiry` cao hơn.
2. **Khả năng ứng dụng cho Tiếng Việt:**
   - Thiết kế của hệ thống hoàn toàn độc lập với kênh và tổ chức. Để triển khai cho tiếng Việt, kiến trúc mô hình BiLSTM + Attention và cơ chế định tuyến giữ nguyên 100%, chỉ cần:
     1. Thay thế từ điển tokenization (hoặc dùng pretrained embeddings tiếng Việt).
     2. Huấn luyện lại trên tập dữ liệu ticket nội bộ tiếng Việt của doanh nghiệp.
   - *Lưu ý khoa học:* Không tuyên bố hệ thống đã "giải quyết nhu cầu Việt Nam" khi chưa chạy trên dữ liệu tiếng Việt thực tế, mà chỉ khẳng định **thiết kế mở, không phụ thuộc kênh và dễ dàng chuyển giao cho doanh nghiệp Việt Nam**.
3. **Vòng lặp học chủ động (Human-in-the-Loop Active Learning):**
   - Đối với các yêu cầu bị cờ "Cần người duyệt", khi nhân viên CSKH chỉnh sửa nhãn, hệ thống cần ghi nhận log để định kỳ huấn luyện bổ sung (fine-tune), giúp mô hình ngày càng thông minh theo thời gian.

---

### 8. KẾT LUẬN

Bằng việc đặt lại bài toán theo hướng **Nội dung phổ quát - Đa kênh - Kiểm soát rủi ro bằng Triage Gate**, đề tài đã phát triển thành công một giải pháp Deep Learning hoàn chỉnh trên PyTorch:
- Đạt độ chính xác vượt trội **99.38%** với BiLSTM + Attention.
- Chứng minh khả năng tổng quát hóa trên ngành mới (Industry Hold-out đạt **91.43% F1**).
- Cung cấp giao diện trực quan, thân thiện, sẵn sàng kết nối với bất kỳ hệ thống Helpdesk / CRM doanh nghiệp nào.
