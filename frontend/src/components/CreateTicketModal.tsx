import React, { useState } from 'react';
import { X, Send, Sparkles, AlertCircle } from 'lucide-react';
import type { ChannelType } from '../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    customer_name: string;
    email: string;
    channel: ChannelType;
    subject: string;
    body: string;
  }) => void;
  isSubmitting: boolean;
}

const SAMPLE_SCENARIOS = [
  {
    name: '💳 Hoàn tiền sai cước thẻ tín dụng',
    subject: 'Unauthorized charge of $99 on my credit card',
    customer_name: 'Nguyen Van An',
    email: 'an.nguyen@example.com',
    channel: 'email' as ChannelType,
    body: "Dear support team, I noticed an unauthorized charge of 99 dollars on my credit card invoice yesterday for an annual subscription fee that I explicitly cancelled last month. Please reverse this unauthorized payment and process a full refund to my card immediately."
  },
  {
    name: '🚚 Bưu kiện giao trễ 5 ngày',
    subject: 'Package shipment delayed for five days order #4890',
    customer_name: 'Tran Thi Bich',
    email: 'bich.tran@gmail.com',
    channel: 'email' as ChannelType,
    body: "Hello, my shipment delivery order number 4890 has been delayed for five days. The courier tracking status is stuck at sorting facility and the driver never showed up. I urgently need this package delivered before my departure tomorrow morning."
  },
  {
    name: '🛠️ Sập ứng dụng liên tục và đơ màn hình',
    subject: 'App crash and screen freeze after latest software update',
    customer_name: 'Le Hoang Cuong',
    email: 'cuong.le@enterprise.vn',
    channel: 'livechat' as ChannelType,
    body: "Good afternoon, our enterprise team is facing a severe software application crash after installing the new version update. The screen freezes on the main dashboard and disconnects active network sessions. Please release an urgent bug fix."
  },
  {
    name: '🔐 Tài khoản bị khóa và không nhận được OTP',
    subject: 'Account locked and not receiving 2FA OTP security code',
    customer_name: 'Pham Minh Duc',
    email: 'duc.pham@outlook.com',
    channel: 'web' as ChannelType,
    body: "I cannot log in to my account. It says password incorrect and I am not receiving the two-factor authentication OTP security code on my mobile phone. Please verify my identity and unlock my account."
  },
  {
    name: '🚨 Đe dọa kiện ra tòa vì thái độ phục vụ',
    subject: 'Formal lawsuit notice regarding manager misconduct',
    customer_name: 'Sarah Jenkins',
    email: 'sjenkins@globalcorp.net',
    channel: 'email' as ChannelType,
    body: "This is the absolute worst customer service experience I have ever had! Your manager hung up on me and refused to take any responsibility for our corrupted data. I will report this scam to consumer protection police and hire my attorney for a formal lawsuit if your director does not call me today!"
  },
  {
    name: 'ℹ️ Hỏi chính sách đổi trả hàng hóa',
    subject: 'Inquiry about merchandise return policy and store hours',
    customer_name: 'Vu Thu Huong',
    email: 'huong.vu@yahoo.com',
    channel: 'web' as ChannelType,
    body: "Hi there, can you please tell me what the return policy is for items purchased during the promotion campaign, and where can I find your nearest store working hours in District 1?"
  }
];

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<ChannelType>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  if (!isOpen) return null;

  const handleSelectSample = (idx: number) => {
    const s = SAMPLE_SCENARIOS[idx];
    setCustomerName(s.customer_name);
    setEmail(s.email);
    setChannel(s.channel);
    setSubject(s.subject);
    setBody(s.body);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !email.trim() || !subject.trim() || !body.trim()) {
      alert('Vui lòng điền đầy đủ tất cả các trường thông tin');
      return;
    }
    onSubmit({
      customer_name: customerName.trim(),
      email: email.trim(),
      channel,
      subject: subject.trim(),
      body: body.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full border border-slate-200 shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tạo ticket hỗ trợ mới
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Gửi yêu cầu vào pipeline phân loại & định tuyến học sâu BiLSTM
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          {/* Điền Mẫu Dropdown */}
          <div className="flex items-center justify-between p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Điền mẫu nội dung:</span>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value !== '') {
                  handleSelectSample(parseInt(e.target.value));
                  e.target.value = '';
                }
              }}
              className="text-xs font-normal text-slate-700 bg-white border border-indigo-200 rounded px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="">Chọn kịch bản mẫu...</option>
              {SAMPLE_SCENARIOS.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row: Customer Name & Email */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-normal block">
                Tên khách hàng:
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nguyen Van A"
                className="w-full text-xs font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-normal block">
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full text-xs font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Row: Channel & Subject */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-normal block">
                Kênh tiếp nhận:
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelType)}
                className="w-full text-xs font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:border-indigo-600"
              >
                <option value="email">Email</option>
                <option value="livechat">Live Chat</option>
                <option value="web">Web Portal</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs text-slate-600 font-normal block">
                Tiêu đề ticket:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ví dụ: Bị trừ tiền 2 lần trên thẻ..."
                className="w-full text-xs font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-600 font-normal block">
                Nội dung yêu cầu khách hàng:
              </label>
              <span className="text-[11px] text-slate-400">Khuyến khích gõ tiếng Anh</span>
            </div>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Dán hoặc gõ nội dung tin nhắn của khách hàng vào đây..."
              className="w-full text-xs font-normal text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-indigo-600 leading-relaxed"
            />
          </div>

          {/* Notice Banner about English data */}
          <div className="flex items-start gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 font-normal">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Mô hình được huấn luyện trên dữ liệu tiếng Anh đa kênh. Nên nhập văn bản bằng tiếng Anh để mô hình phân tích cú pháp và trích xuất Attention chính xác nhất.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-normal cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang phân loại...' : 'Gửi yêu cầu & Chạy mô hình'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

