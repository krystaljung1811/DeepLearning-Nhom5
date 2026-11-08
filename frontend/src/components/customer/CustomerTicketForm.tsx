import React, { useState } from 'react';

interface Props {
  onSuccess: (data: {
    ticket_id: string;
    access_token: string;
    customer_name: string;
    email: string;
    subject: string;
    queue: string;
  }) => void;
  onSwitchToTrack: () => void;
}

const SAMPLE_ISSUES = [
  {
    title: 'Thanh toán thẻ bị trừ tiền 2 lần',
    subject: 'Gặp sự cố trừ tiền kép qua cổng Visa',
    body: 'Tôi thực hiện thanh toán đơn hàng #DH-8891 qua thẻ Visa, tài khoản ngân hàng bị trừ 2 lần 1.250.000 VNĐ nhưng trên web thông báo giao dịch thất bại. Yêu cầu hoàn tiền gấp!',
    orderId: 'DH-8891'
  },
  {
    title: 'Hàng nhận bị nứt vỡ khi mở hộp',
    subject: 'Sản phẩm giao đến bị vỡ màn hình',
    body: 'Tôi vừa nhận gói hàng từ shipper sáng nay, khi mở hộp kiểm tra thì sản phẩm bên trong đã bị nứt vỡ nghiêm trọng. Tôi có quay video unbox làm bằng chứng, xin đổi mới.',
    orderId: 'DH-4421'
  },
  {
    title: 'Tài khoản báo đăng nhập lạ',
    subject: 'Cảnh báo đăng nhập bất thường từ IP lạ',
    body: 'Email của tôi vừa nhận thông báo có thiết bị lạ đăng nhập tại khu vực khác. Tôi muốn khóa tạm thời các giao dịch rút tiền và đổi mật khẩu tài khoản ngay lập tức.',
    orderId: ''
  }
];

export const CustomerTicketForm: React.FC<Props> = ({ onSuccess, onSwitchToTrack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectSample = (sample: typeof SAMPLE_ISSUES[0]) => {
    setName('Nguyễn Văn An');
    setEmail('an.nguyen@example.com');
    setOrderId(sample.orderId);
    setSubject(sample.subject);
    setBody(sample.body);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !body.trim()) {
      setError('Vui lòng điền đầy đủ Họ tên, Email, Tiêu đề và Nội dung chi tiết.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/public/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          email: email.trim(),
          order_id: orderId.trim(),
          subject: subject.trim(),
          body: body.trim(),
          channel: 'web',
          industry: 'ecommerce'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || 'Không thể gửi yêu cầu hỗ trợ.');
      }

      onSuccess({
        ticket_id: data.ticket_id,
        access_token: data.access_token,
        customer_name: data.customer_name,
        email: data.email,
        subject: data.subject,
        queue: data.queue
      });
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi kết nối với máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      {/* Header Form */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Gửi Yêu Cầu Hỗ Trợ Mới</h2>
        <p className="text-sm text-slate-500 mt-1">
          Hệ thống AI sẽ tự động phân tích nội dung, định tuyến đến đúng bộ phận chuyên môn và gửi phản hồi qua email cho bạn.
        </p>
      </div>

      {/* Preset Quick Samples */}
      <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>⚡ Thử nhanh với các tình huống mẫu:</span>
          <span className="text-blue-600 font-normal">Bấm để tự điền</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_ISSUES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 transition"
            >
              📌 {sample.title}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Họ và tên của bạn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Nguyễn Văn An"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email nhận phản hồi <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tiêu đề yêu cầu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Tóm tắt ngắn gọn vấn đề gặp phải..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Mã đơn hàng / Hợp đồng <span className="text-xs font-normal text-slate-400">(Nếu có)</span>
            </label>
            <input
              type="text"
              placeholder="DH-12345"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nội dung chi tiết phản ánh <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={5}
            placeholder="Mô tả cụ thể sự việc, thời gian xảy ra, các bước bạn đã thực hiện..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm resize-y"
          />
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onSwitchToTrack}
            className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition"
          >
            🔍 Bạn đã có mã ticket? Tra cứu tại đây
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Mô hình AI đang định tuyến...</span>
              </>
            ) : (
              <>
                <span>Gửi Yêu Cầu Hỗ Trợ</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

