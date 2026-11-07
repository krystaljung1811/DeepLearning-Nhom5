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
import type { Ticket } from '../types';

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

  const queueMap: Record<string, number> = {};
  tickets.forEach((t) => {
    const q = t.analysis?.routing.target_queue || 'Đang xử lý';
    const shortLabel = q.replace('Phòng ', '').replace('Bộ phận ', '');
    queueMap[shortLabel] = (queueMap[shortLabel] || 0) + 1;
  });

  const queueData = Object.entries(queueMap).map(([name, count]) => ({
    name,
    count
  }));

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

  const confidenceData = [
    { range: '50-60%', count: 1 },
    { range: '60-70%', count: 2 },
    { range: '70-80%', count: 2 },
    { range: '80-90%', count: 4 },
    { range: '90-95%', count: 5 },
    { range: '95-100%', count: 11 }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-6xl mx-auto w-full">
      
      {/* Title */}
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Tổng quan vận hành & Tự động hóa
        </h2>
        <p className="text-xs text-slate-500 font-normal">
          Thống kê lưu lượng yêu cầu, tỷ lệ định tuyến tự động và phân bổ khối lượng công việc.
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Tổng ticket hôm nay
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-slate-900">{total}</span>
            <span className="text-xs text-emerald-600 font-normal">+14%</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Email, Chat, Web Portal
          </span>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Tự động định tuyến
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-emerald-700">{autoRate}%</span>
            <span className="text-xs text-slate-500 font-normal">({autoRoutedCount} ticket)</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Đạt ngưỡng an toàn
          </span>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Cần người duyệt
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-rose-700">{reviewRate}%</span>
            <span className="text-xs text-slate-500 font-normal">({needsReviewCount} ticket)</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Tin cậy &lt; ngưỡng hoặc rủi ro
          </span>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Thời gian SLA trung bình
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-slate-900">2.4 giờ</span>
            <span className="text-xs text-emerald-600 font-normal">-38%</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Cam kết phản hồi
          </span>
        </div>

      </div>

      {/* 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Bar chart: Queue distribution */}
        <div className="lg:col-span-8 bg-white rounded-lg p-4 border border-slate-200 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Phân bổ ticket theo hàng đợi tiếp nhận
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Ánh xạ sang các phòng ban nội bộ
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart: Priority */}
        <div className="lg:col-span-4 bg-white rounded-lg p-4 border border-slate-200 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Phân bổ mức độ ưu tiên
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Từ P1 (Khẩn cấp) đến P4 (Thấp)
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
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
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-xs">
            {prioData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 font-normal truncate">{item.name}:</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Confidence Area Chart */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Phân bố độ tin cậy của mô hình
          </h3>
          <p className="text-xs text-slate-500 font-normal">
            Phần lớn ticket tập trung ở dải 95–100%
          </p>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={confidenceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#4f46e5"
                strokeWidth={1.5}
                fill="url(#colorConf)"
                name="Số ticket"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
