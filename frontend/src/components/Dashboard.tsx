import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import {
  Inbox,
  ShieldCheck,
  ShieldAlert,
  Clock,
  TrendingUp,
  BarChart3,
  Layers
} from 'lucide-react';
import { Ticket } from '../types';

interface DashboardProps {
  tickets: Ticket[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tickets }) => {
  const total = tickets.length;
  const needsReviewCount = tickets.filter(
    (t) => t.analysis?.triage.human_review_required || t.status === 'needs_review'
  ).length;
  const autoRoutedCount = total - needsReviewCount;
  const autoRate = Math.round((autoRoutedCount / total) * 100);
  const reviewRate = 100 - autoRate;

  // Queue distribution data
  const queueMap: Record<string, number> = {};
  tickets.forEach((t) => {
    const q = t.analysis?.routing.target_queue || 'Đang xử lý';
    // Shorten label for chart
    const shortLabel = q.replace('Phòng ', '').replace('Bộ phận ', '');
    queueMap[shortLabel] = (queueMap[shortLabel] || 0) + 1;
  });

  const queueData = Object.entries(queueMap).map(([name, count]) => ({
    name,
    count
  }));

  // Priority distribution data
  const prioData = [
    {
      name: 'P1 - Khẩn cấp',
      value: tickets.filter((t) => t.analysis?.priority.id === 'urgent').length,
      color: '#f43f5e'
    },
    {
      name: 'P2 - Cao',
      value: tickets.filter((t) => t.analysis?.priority.id === 'high').length,
      color: '#f97316'
    },
    {
      name: 'P3 - Trung bình',
      value: tickets.filter((t) => t.analysis?.priority.id === 'medium').length,
      color: '#f59e0b'
    },
    {
      name: 'P4 - Thấp',
      value: tickets.filter((t) => t.analysis?.priority.id === 'low').length,
      color: '#64748b'
    }
  ].filter((p) => p.value > 0);

  // Confidence histogram data
  const confidenceData = [
    { range: '50-60%', count: 1 },
    { range: '60-70%', count: 2 },
    { range: '70-80%', count: 2 },
    { range: '80-90%', count: 4 },
    { range: '90-95%', count: 5 },
    { range: '95-100%', count: 11 }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Bảng Điều Khiển Vận Hành CSKH & Chỉ Số Tự Động Hóa
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi tổng hợp lưu lượng yêu cầu, tỷ lệ phê duyệt qua Cổng Triage và phân bổ khối lượng công việc theo thời gian thực.
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng Yêu Cầu Hôm Nay
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{total}</span>
            <span className="text-xs text-emerald-600 font-bold">+14% so hôm qua</span>
          </div>
          <p className="text-[11px] text-slate-400">Đa kênh: Email, Chat, Web Portal</p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Tỷ Lệ Tự Động Định Tuyến
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950">{autoRate}%</span>
            <span className="text-xs text-emerald-700 font-bold">({autoRoutedCount} tickets)</span>
          </div>
          <p className="text-[11px] text-slate-500">Đạt chuẩn an toàn tự động</p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-rose-200 bg-rose-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Cần Người Duyệt (Triage)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-950">{reviewRate}%</span>
            <span className="text-xs text-rose-700 font-bold">({needsReviewCount} tickets)</span>
          </div>
          <p className="text-[11px] text-slate-500">Nguy cơ rủi ro hoặc điểm tin cậy &lt; 60%</p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Thời Gian Phản Hồi SLA
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">2.4 giờ</span>
            <span className="text-xs text-emerald-600 font-bold">-38% thời gian chờ</span>
          </div>
          <p className="text-[11px] text-slate-400">Giảm thiểu tắc nghẽn hàng đợi</p>
        </div>

      </div>

      {/* 2 Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bar chart: Tickets by Department */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Phân Bổ Ticket Theo Hàng Đợi Tiếp Nhận</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Tự động ánh xạ từ 7 Universal Categories sang phòng ban nội bộ
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Thời gian thực
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Số lượng Ticket" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart: Priority */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Phân Bổ Mức Độ Ưu Tiên</span>
            </h3>
            <p className="text-[11px] text-slate-400">Phân tầng từ P1 (Khẩn cấp) đến P4 (Thấp)</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {prioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {prioData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Area chart: Model Confidence Distribution */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Phân Bố Độ Tin Cậy Của Mô Hình (Confidence Distribution)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Phần lớn yêu cầu tập trung ở dải tin cậy 95–100%, tạo cơ sở vững chắc cho Cổng Triage
            </p>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={confidenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#4f46e5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConfidence)"
                name="Số ticket"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
