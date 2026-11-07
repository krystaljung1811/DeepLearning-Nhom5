import { Ticket } from './types';

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: '#TK-1001',
    subject: 'Bị trừ tiền 99$ cước thuê bao đã hủy trên thẻ tín dụng',
    sender: 'Nguyen Van An',
    email: 'an.nguyen@example.com',
    channel: 'email',
    createdAt: '5 phút trước',
    status: 'auto_routed',
    text: "Dear support team, I noticed an unauthorized charge of 99 dollars on my credit card invoice yesterday for an annual subscription fee that I explicitly cancelled last month. Please reverse this unauthorized payment and process a full refund to my card immediately."
  },
  {
    id: '#TK-1002',
    subject: 'Đe dọa khởi kiện ra tòa vì thái độ phục vụ và từ chối hỗ trợ',
    sender: 'Sarah Jenkins',
    email: 'sjenkins@globalcorp.net',
    channel: 'email',
    createdAt: '12 phút trước',
    status: 'needs_review',
    text: "This is the absolute worst customer service experience I have ever had! Your manager hung up on me and refused to take any responsibility for our corrupted data. I will report this scam to consumer protection police and hire my attorney for a formal lawsuit if your director does not call me today!"
  },
  {
    id: '#TK-1003',
    subject: 'Bưu kiện đơn hàng #4890 giao trễ 5 ngày bưu tá không liên lạc',
    sender: 'Tran Thi Bich',
    email: 'bich.tran@gmail.com',
    channel: 'email',
    createdAt: '25 phút trước',
    status: 'auto_routed',
    text: "Hello, my shipment delivery order number 4890 has been delayed for five days. The courier tracking status is stuck at sorting facility and the driver never showed up. I urgently need this package delivered before my departure tomorrow morning."
  },
  {
    id: '#TK-1004',
    subject: 'Ứng dụng liên tục crash và văng ra ngoài sau khi cập nhật hệ thống',
    sender: 'Le Hoang Cuong',
    email: 'cuong.le@enterprise.vn',
    channel: 'livechat',
    createdAt: '38 phút trước',
    status: 'auto_routed',
    text: "Good afternoon, our enterprise team is facing a severe software application crash after installing the new version update. The screen freezes on the main dashboard and disconnects active network sessions. Please release an urgent bug fix."
  },
  {
    id: '#TK-1005',
    subject: 'Không thể đăng nhập tài khoản và không nhận được mã OTP xác thực',
    sender: 'Pham Minh Duc',
    email: 'duc.pham@outlook.com',
    channel: 'web',
    createdAt: '1 giờ trước',
    status: 'auto_routed',
    text: "I cannot log in to my account. It says password incorrect and I am not receiving the two-factor authentication OTP security code on my mobile phone. Please verify my identity and unlock my account."
  },
  {
    id: '#TK-1006',
    subject: 'Hỏi chính sách đổi trả hàng hóa và địa chỉ chi nhánh gần nhất',
    sender: 'Vu Thu Huong',
    email: 'huong.vu@yahoo.com',
    channel: 'web',
    createdAt: '1.5 giờ trước',
    status: 'auto_routed',
    text: "Hi there, can you please tell me what the return policy is for items purchased during the promotion campaign, and where can I find your nearest store working hours in District 1?"
  },
  {
    id: '#TK-1007',
    subject: 'Màn hình TV bị nứt vỡ và linh kiện bên trong bị gãy khi mở hộp',
    sender: 'Dang Quang Khai',
    email: 'khai.dang@techcorp.com',
    channel: 'email',
    createdAt: '2 giờ trước',
    status: 'auto_routed',
    text: "I received my order today, but upon unboxing the device, the glass display screen is completely shattered and the interior plastic frame is cracked. This is defective product quality. I request a free replacement unit."
  },
  {
    id: '#TK-1008',
    subject: 'Bị trừ tiền 2 lần cho cùng một giao dịch chuyển khoản thanh toán',
    sender: 'Michael Chang',
    email: 'm.chang@fintechlab.io',
    channel: 'livechat',
    createdAt: '2.5 giờ trước',
    status: 'auto_routed',
    text: "My account balance was debited twice for a single payment transaction of 150 dollars this morning. Both transaction IDs appear on my online banking statement. Please check the duplicate charge and refund the extra amount."
  },
  {
    id: '#TK-1009',
    subject: 'Yêu cầu hủy dịch vụ ngay lập tức và hoàn trả toàn bộ số dư',
    sender: 'Hoang Kim Yen',
    email: 'yen.hk@gmail.com',
    channel: 'web',
    createdAt: '3 giờ trước',
    status: 'auto_routed',
    text: "I want to terminate my cloud subscription contract immediately due to service disruptions. Please calculate the remaining balance and refund the unused prepayment to my bank account."
  },
  {
    id: '#TK-1010',
    subject: 'Tài xế giao hàng báo đã giao nhưng tôi chưa hề nhận được bưu kiện',
    sender: 'David Miller',
    email: 'dmiller92@gmail.com',
    channel: 'email',
    createdAt: '3.5 giờ trước',
    status: 'auto_routed',
    text: "Tracking status shows that package #8831 was delivered and signed, but I was at home the entire afternoon and no courier knocked on my door. The parcel is missing. Please investigate where the driver left it."
  },
  {
    id: '#TK-1011',
    subject: 'Máy chủ API phản hồi mã lỗi 500 Internal Server Error kéo dài',
    sender: 'Do Tuan Nghia',
    email: 'nghiadt@cloudtech.com',
    channel: 'web',
    createdAt: '4 giờ trước',
    status: 'auto_routed',
    text: "Our production backend API calls are failing with HTTP 500 internal server error on your webhook endpoint. Latency has increased to over 12 seconds. Is there an ongoing server outage or maintenance?"
  },
  {
    id: '#TK-1012',
    subject: 'Cảnh báo đăng nhập từ vị trí lạ và nghi ngờ tài khoản bị xâm nhập',
    sender: 'Elena Rostova',
    email: 'elena.rostova@proton.me',
    channel: 'email',
    createdAt: '4.5 giờ trước',
    status: 'needs_review',
    text: "I received an automated security email stating that an unrecognized IP address logged into my account from a foreign country. I suspect my credentials were breached or stolen. Please suspend access immediately for security review."
  },
  {
    id: '#TK-1013',
    subject: 'Sản phẩm giao sai mẫu mã và không đúng với mô tả trên website',
    sender: 'Bui Ngoc Lan',
    email: 'lan.bn@gmail.com',
    channel: 'email',
    createdAt: '5 giờ trước',
    status: 'auto_routed',
    text: "I ordered the silver 512GB laptop model, but the package delivered contains a black 256GB version with lower specifications. The merchandise does not match the product description. Please arrange an exchange for the correct item."
  },
  {
    id: '#TK-1014',
    subject: 'Nhân viên tổng đài cúp máy thô lỗ, đe dọa bóc phốt truyền thông',
    sender: 'Alexandre Dupont',
    email: 'a.dupont@paris.fr',
    channel: 'livechat',
    createdAt: '5.5 giờ trước',
    status: 'needs_review',
    text: "Your phone agent shouted at me and hung up when I inquired about my warranty ticket. This disrespectful behavior is intolerable. I will expose this incident on public social media forums unless the head of customer service contacts me with an official apology."
  },
  {
    id: '#TK-1015',
    subject: 'Hướng dẫn cài đặt và tích hợp SDK trên hệ điều hành Linux Ubuntu',
    sender: 'Phan Quoc Bao',
    email: 'baopq@developer.io',
    channel: 'web',
    createdAt: '6 giờ trước',
    status: 'auto_routed',
    text: "Hello support, where can I find the official documentation and step-by-step installation instructions for your Python SDK on Ubuntu 22.04 LTS? Also are there code examples for asynchronous batch queries?"
  },
  {
    id: '#TK-1016',
    subject: 'Hóa đơn VAT điện tử bị sai mã số thuế doanh nghiệp cần điều chỉnh',
    sender: 'Dinh Hoang Long',
    email: 'long.dh@longcorp.vn',
    channel: 'email',
    createdAt: '7 giờ trước',
    status: 'auto_routed',
    text: "The electronic VAT tax invoice issued for invoice #INV-7740 contains an incorrect company tax code and business address. Please issue an adjustment invoice with the correct legal entity information provided in attachment."
  },
  {
    id: '#TK-1017',
    subject: 'Shipper yêu cầu phụ phí bất hợp lý ngoài tiền cước đã thanh toán',
    sender: 'Ngo Thi Mai',
    email: 'mai.ngo@gmail.com',
    channel: 'livechat',
    createdAt: '7.5 giờ trước',
    status: 'auto_routed',
    text: "I already paid the full shipping fee online with my debit card, but the delivery person demanded an extra cash fee of 50,000 VND before handing over the parcel. Please review your courier partner conduct."
  },
  {
    id: '#TK-1018',
    subject: 'Tính năng xuất báo cáo Excel bị đơ và không tải được dữ liệu',
    sender: 'Kevin Vance',
    email: 'kvance@analytics.com',
    channel: 'web',
    createdAt: '8 giờ trước',
    status: 'auto_routed',
    text: "Whenever I click Export to Excel on the monthly analytics dashboard, the spinning loader runs endlessly and the browser tab becomes unresponsive. This bug is blocking our quarterly financial review."
  },
  {
    id: '#TK-1019',
    subject: 'Yêu cầu xóa toàn bộ dữ liệu cá nhân theo quy định bảo vệ quyền riêng tư',
    sender: 'Sophia Schneider',
    email: 'sophia.s@berlin.de',
    channel: 'email',
    createdAt: '9 giờ trước',
    status: 'needs_review',
    text: "Under the provisions of data protection and privacy regulations, I hereby request the permanent deletion of my account profile, transaction history, and all stored personal identifiable information from your databases."
  },
  {
    id: '#TK-1020',
    subject: 'Hàng tiêu dùng bị rách bao bì và biến chất khi giao đến',
    sender: 'Nguyen Thi Kim',
    email: 'kim.nt@vietmail.com',
    channel: 'email',
    createdAt: '10 giờ trước',
    status: 'auto_routed',
    text: "The organic milk package arrived with ruptured sealing foil and leaked liquid inside the cardboard carton box. The merchandise has spoiled and is unsafe for consumption. Please issue an immediate refund."
  },
  {
    id: '#TK-1021',
    subject: 'Mã giảm giá khuyến mãi sinh nhật không kích hoạt được khi thanh toán',
    sender: 'Trinh Van Thang',
    email: 'thang.tv@gmail.com',
    channel: 'web',
    createdAt: '11 giờ trước',
    status: 'auto_routed',
    text: "I received a 20% discount coupon code for my loyalty birthday month, but when entering it at checkout, the cart displays code invalid or expired even though the promotion is valid until next week. Please assist."
  },
  {
    id: '#TK-1022',
    subject: 'Thời gian hoàn tất rút tiền về tài khoản ngân hàng mất bao lâu?',
    sender: 'Liam O Connor',
    email: 'liam.oc@dublin.ie',
    channel: 'livechat',
    createdAt: '12 giờ trước',
    status: 'auto_routed',
    text: "Could you kindly clarify the standard processing timeframe for withdrawing funds from my balance to a local bank account? Does it process over the weekend or only during business banking days?"
  },
  {
    id: '#TK-1023',
    subject: 'Cảnh báo gian lận và thông báo phong tỏa tài khoản từ cơ quan an ninh',
    sender: 'Marcus Weber',
    email: 'm.weber@investigations.ch',
    channel: 'email',
    createdAt: '13 giờ trước',
    status: 'needs_review',
    text: "We are conducting a cross-border financial fraud investigation regarding unauthorized money laundering transactions traced through user ID #99014. Please preserve all system audit trails and freeze related wallets."
  },
  {
    id: '#TK-1024',
    subject: 'Tai nghe Bluetooth bên phải không phát ra âm thanh và không nhận sạc',
    sender: 'Vu Dinh Trong',
    email: 'trongvd@audiofan.vn',
    channel: 'web',
    createdAt: '14 giờ trước',
    status: 'auto_routed',
    text: "The right earbud of the wireless headphones purchased two weeks ago completely stopped working. The LED charging case indicator does not illuminate when placed in dock. This appears to be hardware defect."
  },
  {
    id: '#TK-1025',
    subject: 'Gói doanh nghiệp Enterprise hỗ trợ tối đa bao nhiêu người dùng đồng thời?',
    sender: 'Nguyen Van Hai',
    email: 'hai.nv@enterprisesoft.com',
    channel: 'email',
    createdAt: '15 giờ trước',
    status: 'auto_routed',
    text: "We are evaluating upgrading from Pro plan to Enterprise tier for our company of 250 staff members. Does the Enterprise license include custom single sign-on (SSO) SAML and a dedicated technical account manager?"
  }
];
