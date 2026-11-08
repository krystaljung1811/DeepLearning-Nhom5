import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

class EmailService:
    """
    Dịch vụ gửi thông báo email cho khách hàng và nhân viên.
    Tự động chuyển giữa chế độ Real SMTP (nếu cấu hình biến môi trường)
    và chế độ Mock Dispatcher (ghi log chi tiết ra console/file).
    """
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.from_email = os.getenv("SMTP_FROM", "support@autodesk.local")
        self.is_smtp_configured = bool(self.smtp_host and self.smtp_user and self.smtp_pass)

    def _send(self, to_email: str, subject: str, text_content: str, html_content: str = None) -> bool:
        if self.is_smtp_configured:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"AutoDesk Support Desk <{self.from_email}>"
                msg["To"] = to_email

                msg.attach(MIMEText(text_content, "plain", "utf-8"))
                if html_content:
                    msg.attach(MIMEText(html_content, "html", "utf-8"))

                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_pass)
                    server.sendmail(self.from_email, [to_email], msg.as_string())
                print(f"[EMAIL SERVICE - SMTP] Đã gửi email thực tới {to_email} | Tiêu đề: {subject}")
                return True
            except Exception as e:
                print(f"[EMAIL SERVICE - SMTP ERROR] Lỗi gửi SMTP tới {to_email}: {e}")
                # Fallback to mock log
                pass

        # Chế độ Mock Log rõ ràng, minh bạch
        print("\n" + "="*70)
        print(f"📧 [EMAIL DISPATCHER SIMULATION] To: {to_email}")
        print(f"📌 Subject: {subject}")
        print(f"🕒 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 70)
        print(text_content.strip())
        print("="*70 + "\n")
        return True

    def send_ticket_created(self, to_email: str, ticket_id: str, subject: str, access_token: str):
        mail_subj = f"[AutoDesk Support] Tiếp nhận yêu cầu hỗ trợ #{ticket_id}"
        body = f"""
Xin chào Quý khách,

Yêu cầu hỗ trợ của Quý khách đã được hệ thống tiếp nhận thành công và tự động định tuyến qua mô hình AI:
- Mã Ticket: {ticket_id}
- Tiêu đề: {subject}
- Thời gian tạo: {datetime.now().strftime('%d/%m/%Y %H:%M')}

Để tra cứu tiến độ xử lý và trao đổi với nhân viên hỗ trợ, Quý khách vui lòng truy cập:
http://localhost:8000/support/track?ticket_id={ticket_id}

Trân trọng,
Bộ phận Chăm sóc Khách hàng AutoDesk Enterprise
"""
        return self._send(to_email, mail_subj, body)

    def send_otp(self, to_email: str, ticket_id: str, otp_code: str):
        mail_subj = f"[Mã xác thực OTP] Tra cứu yêu cầu #{ticket_id}"
        body = f"""
Xin chào Quý khách,

Mã xác thực một lần (OTP) để tra cứu yêu cầu hỗ trợ #{ticket_id} của Quý khách là:

        👉  {otp_code}  👈

Mã có hiệu lực trong vòng 15 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.

Trân trọng,
Bộ phận Hỗ trợ Khách hàng
"""
        return self._send(to_email, mail_subj, body)

    def send_agent_reply(self, to_email: str, ticket_id: str, reply_text: str, agent_name: str = "Chuyên viên hỗ trợ"):
        mail_subj = f"[AutoDesk Support] Phản hồi mới cho yêu cầu #{ticket_id}"
        body = f"""
Xin chào Quý khách,

{agent_name} đã gửi phản hồi cho yêu cầu #{ticket_id} của bạn:

---
{reply_text}
---

Quý khách có thể trả lời trực tiếp hoặc tiếp tục theo dõi tiến độ tại:
http://localhost:8000/support/track?ticket_id={ticket_id}

Trân trọng,
Đội ngũ Hỗ trợ Khách hàng AutoDesk
"""
        return self._send(to_email, mail_subj, body)

email_service = EmailService()

