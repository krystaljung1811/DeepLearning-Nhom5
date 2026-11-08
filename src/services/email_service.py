import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any

class EmailService:
    """
    Dịch vụ gửi thông báo email cho khách hàng và nhân viên.
    - Chế độ Real SMTP: Nếu có đủ SMTP_HOST, SMTP_USER, SMTP_PASS trong biến môi trường.
    - Chế độ Simulation (Mô phỏng): Nếu chưa cấu hình, in log ra console kèm mã trạng thái
      'email_not_configured' để hệ thống và người dùng biết chính xác tình trạng.
    """
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "").strip()
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "").strip()
        self.smtp_pass = os.getenv("SMTP_PASS", "").strip()
        self.from_email = os.getenv("SMTP_FROM", "support@autodesk.local").strip()
        self.base_url = os.getenv("APP_BASE_URL", "http://localhost:8000").rstrip("/")
        
        self.is_smtp_configured = bool(self.smtp_host and self.smtp_user and self.smtp_pass)

    def _send(self, to_email: str, subject: str, text_content: str, html_content: str = None) -> Dict[str, Any]:
        now_iso = datetime.now().isoformat()

        # 1. Nếu SMTP đã được cấu hình đầy đủ -> Thực hiện gửi thật qua mạng
        if self.is_smtp_configured:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"AutoDesk Support Desk <{self.from_email}>"
                msg["To"] = to_email

                msg.attach(MIMEText(text_content, "plain", "utf-8"))
                if html_content:
                    msg.attach(MIMEText(html_content, "html", "utf-8"))

                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_pass)
                    server.sendmail(self.from_email, [to_email], msg.as_string())

                print(f"✅ [EMAIL SERVICE - REAL SMTP] Đã gửi email thành công tới: {to_email} | Tiêu đề: {subject}")
                return {
                    "success": True,
                    "status": "sent",
                    "detail": f"Đã gửi qua SMTP ({self.smtp_host})",
                    "timestamp": now_iso
                }
            except Exception as e:
                err_msg = str(e)
                print(f"❌ [EMAIL SERVICE - SMTP ERROR] Lỗi khi gửi tới {to_email}: {err_msg}")
                return {
                    "success": False,
                    "status": "failed",
                    "detail": f"Lỗi máy chủ SMTP: {err_msg}",
                    "timestamp": now_iso
                }

        # 2. Chưa cấu hình SMTP -> Ghi nhận trạng thái rõ ràng 'email_not_configured'
        print("\n" + "="*70)
        print(f"⚠️  [EMAIL SERVICE - SIMULATION ONLY: SMTP_NOT_CONFIGURED]")
        print(f"   Hộp thư đến: {to_email}")
        print(f"   Tiêu đề: {subject}")
        print(f"   Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 70)
        print(text_content.strip())
        print("="*70 + "\n")

        return {
            "success": True,
            "status": "email_not_configured",
            "detail": "SMTP chưa được cấu hình. Nội dung email đã được ghi nhận trong console mô phỏng.",
            "timestamp": now_iso
        }

    def send_ticket_created(self, to_email: str, ticket_id: str, subject: str, access_token: str) -> Dict[str, Any]:
        direct_link = f"{self.base_url}/support/track?ticket_id={ticket_id}&token={access_token}"
        mail_subj = f"[AutoDesk Support] Tiếp nhận yêu cầu #{ticket_id}"
        body = f"""
Xin chào Quý khách,

Yêu cầu hỗ trợ của Quý khách đã được hệ thống tiếp nhận thành công và tự động phân loại qua AI:
- Mã Ticket: {ticket_id}
- Tiêu đề: {subject}
- Thời gian tạo: {datetime.now().strftime('%d/%m/%Y %H:%M')}

👉 LIÊN KẾT TRUY CẬP TRỰC TIẾP (Không cần nhập OTP):
{direct_link}

(Nếu truy cập từ thiết bị mới, Quý khách có thể dùng mã Ticket #{ticket_id} và địa chỉ email này để xác thực OTP).

Trân trọng,
Bộ phận Hỗ trợ Khách hàng AutoDesk Enterprise
"""
        return self._send(to_email, mail_subj, body)

    def send_otp(self, to_email: str, ticket_id: str, otp_code: str) -> Dict[str, Any]:
        mail_subj = f"[Mã xác thực OTP] Tra cứu yêu cầu #{ticket_id}"
        body = f"""
Xin chào Quý khách,

Mã xác thực OTP (dùng một lần) để tra cứu yêu cầu hỗ trợ #{ticket_id} của Quý khách là:

        👉  {otp_code}  👈

Mã có hiệu lực trong vòng 15 phút và sẽ tự động vô hiệu sau lần xác minh đầu tiên. Vui lòng không chia sẻ mã này cho bất kỳ ai.

Trân trọng,
Bộ phận Hỗ trợ Khách hàng AutoDesk
"""
        return self._send(to_email, mail_subj, body)

    def send_agent_reply(self, to_email: str, ticket_id: str, reply_text: str, access_token: str = "", agent_name: str = "Chuyên viên hỗ trợ") -> Dict[str, Any]:
        track_url = f"{self.base_url}/support/track?ticket_id={ticket_id}"
        if access_token:
            track_url += f"&token={access_token}"

        mail_subj = f"[AutoDesk Support] Phản hồi mới cho yêu cầu #{ticket_id}"
        body = f"""
Xin chào Quý khách,

{agent_name} đã gửi phản hồi cho yêu cầu #{ticket_id} của bạn:

------------------------------------------------------------
{reply_text}
------------------------------------------------------------

Quý khách có thể xem toàn bộ hội thoại và phản hồi lại tại:
{track_url}

Trân trọng,
Đội ngũ Hỗ trợ Khách hàng AutoDesk
"""
        return self._send(to_email, mail_subj, body)

email_service = EmailService()
