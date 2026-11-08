import urllib.request
import json
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

def make_request(method, endpoint, data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    if headers is None:
        headers = {}
    
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode('utf-8')
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode('utf-8')
        try:
            err_json = json.loads(err_content)
        except Exception:
            err_json = {"detail": err_content}
        return e.code, err_json

def test_full_customer_and_agent_flow():
    print("[TEST] 1. Khách hàng gửi ticket công khai từ Customer Portal...")
    payload = {
        "customer_name": "Nguyễn Hoàng Nam",
        "email": "hoangnam@example.com",
        "subject": "Không nhận được mã OTP kích hoạt tài khoản",
        "body": "Tôi đã bấm gửi lại mã kích hoạt 3 lần trong sáng nay nhưng vẫn chưa nhận được OTP vào email, nhờ CSKH kiểm tra và hỗ trợ gấp!",
        "order_id": "ACC-78912",
        "channel": "web",
        "industry": "ecommerce"
    }
    status, data = make_request("POST", "/api/public/tickets", payload)
    assert status == 200, f"Status error: {status}, {data}"
    assert data["success"] is True
    assert "TK-" in data["ticket_id"]
    ticket_id = data["ticket_id"]
    access_token = data["access_token"]
    print(f"   -> Đã tạo ticket thành công: {ticket_id} (Token: {access_token[:8]}...)")

    print("[TEST] 2. Kiểm tra bảo vệ quyền riêng tư: Truy cập không có token phải bị từ chối 401...")
    status_unauth, unauth_data = make_request("GET", f"/api/public/tickets/{ticket_id}")
    assert status_unauth == 401, f"Expected 401, got {status_unauth}"
    print("   -> Bảo vệ thành công: Bị chặn với mã 401 Unauthorized.")

    print("[TEST] 3. Truy cập hợp lệ với access_token...")
    status_auth, auth_data = make_request("GET", f"/api/public/tickets/{ticket_id}?token={access_token}")
    assert status_auth == 200
    assert auth_data["id"] == ticket_id
    assert auth_data["customer_name"] == "Nguyễn Hoàng Nam"
    assert len(auth_data["messages"]) >= 1
    print(f"   -> Truy cập thành công: {auth_data['subject']} | Hàng đợi: {auth_data['final_queue']}")

    print("[TEST] 4. Khách hàng gửi thêm tin nhắn vào luồng hội thoại...")
    msg_payload = {
        "sender_name": "Nguyễn Hoàng Nam",
        "message": "Tôi vừa kiểm tra cả thư mục Spam/Junk nhưng cũng không thấy email nào.",
        "token": access_token
    }
    status_msg, msg_data = make_request("POST", f"/api/public/tickets/{ticket_id}/messages", msg_payload)
    assert status_msg == 200
    print("   -> Khách hàng gửi tin nhắn thành công!")

    print("[TEST] 5. Nhân viên kiểm tra hội thoại từ Agent Dashboard...")
    status_agent_msgs, agent_msgs = make_request("GET", f"/api/tickets/{ticket_id}/messages")
    assert status_agent_msgs == 200
    assert len(agent_msgs["messages"]) == 2
    print(f"   -> Nhân viên thấy 2 tin nhắn trong hội thoại.")

    print("[TEST] 6. Nhân viên phản hồi giải quyết ticket...")
    reply_payload = {
        "reply_text": "Chào bạn Nam, hệ thống phát hiện hộp thư của bạn đang bị chặn bởi bộ lọc nội bộ của công ty. Chúng tôi đã gửi lại mã trực tiếp vào SMS số điện thoại liên kết.",
        "channel": "email"
    }
    status_reply, reply_data = make_request("POST", f"/api/tickets/{ticket_id}/reply", reply_payload)
    assert status_reply == 200
    print("   -> Nhân viên đã gửi phản hồi thành công!")

    print("[TEST] 7. Khách hàng xem lại ticket trên Customer Portal và thấy phản hồi...")
    status_check, check_data = make_request("GET", f"/api/public/tickets/{ticket_id}?token={access_token}")
    assert status_check == 200
    msgs = check_data["messages"]
    assert any(m["sender_type"] == "agent" for m in msgs)
    print(f"   -> Khách hàng đã nhận được phản hồi của nhân viên (Tổng {len(msgs)} tin nhắn trong hội thoại)!")

    print("[TEST] 8. Đăng nhập Agent...")
    status_login, login_data = make_request("POST", "/api/agent/auth/login", {"username": "admin", "password": "admin123"})
    assert status_login == 200
    assert "token" in login_data
    print("   -> Đăng nhập Agent thành công!")

    print("[TEST] 9. Kiểm tra Agent Workspace Metrics & Phân trang...")
    status_ws, ws_data = make_request("GET", "/api/tickets?status=all&limit=10")
    assert status_ws == 200
    assert "metrics" in ws_data
    assert "total_open" in ws_data["metrics"]
    print(f"   -> Metrics: Đang mở {ws_data['metrics']['total_open']} | P1: {ws_data['metrics']['urgent']} | Chờ duyệt: {ws_data['metrics']['needs_review']}")

    print("[TEST] 10. Phân công nhân viên xử lý ticket...")
    status_assign, _ = make_request("PATCH", f"/api/tickets/{ticket_id}", {"assigned_agent": "Trần Thị Hỗ Trợ (L1 Support)"})
    assert status_assign == 200
    _, t_assigned = make_request("GET", f"/api/tickets/{ticket_id}")
    assert t_assigned["assigned_agent"] == "Trần Thị Hỗ Trợ (L1 Support)"
    print("   -> Phân công nhân viên thành công!")

    print("[TEST] 11. Kiểm tra Multilingual Reply (Tiếng Anh tự động sinh câu trả lời Tiếng Anh)...")
    en_payload = {
        "customer_name": "John Doe",
        "email": "johndoe@example.com",
        "subject": "Double charged on my Visa card",
        "body": "I was charged twice for my subscription. Please investigate and refund the duplicate charge immediately.",
        "order_id": "ORD-5544",
        "channel": "web"
    }
    status_en, en_ticket = make_request("POST", "/api/public/tickets", en_payload)
    assert status_en == 200
    # Lấy thông tin nội bộ của ticket vừa tạo
    _, en_detail = make_request("GET", f"/api/tickets/{en_ticket['ticket_id']}")
    en_reply = en_detail['prediction']['category']['suggested_reply']
    assert "billing and finance team" in en_reply or "Hello" in en_reply
    print(f"   -> AI sinh phản hồi Tiếng Anh chuẩn: '{en_reply[:60]}...'")

    print("\n✅ TOÀN BỘ 11/11 BƯỚC KIỂM THỬ NÂNG CẤP HỆ THỐNG ĐÃ ĐẠT 100%!")

    print("\n✅ TOÀN BỘ QUY TRÌNH CUSTOMER PORTAL & AGENT DASHBOARD BACKEND ĐẠT 100%!")

if __name__ == '__main__':
    test_full_customer_and_agent_flow()
