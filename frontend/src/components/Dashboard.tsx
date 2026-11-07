import React, { useState, useEffect } from 'react';
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
  CartesianGrid
} from 'recharts';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import type { DashboardStats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 text-xs text-slate-400">
        Đang tải số liệu thống kê thực tế...
      </div>
    );
  }

  if (!stats || stats.total_tickets === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Chưa có dữ liệu thống kê
          </h3>
          <p className="text-xs text-slate-500 font-normal leading-relaxed">
            Hệ thống tính toán toàn bộ KPI từ cơ sở dữ liệu SQLite thực tế. Hãy tạo ticket hoặc nạp từ tệp CSV để quan sát biểu đồ phân bổ.
          </p>
        </div>
      </div>
    );
  }

  const prioColors: Record<string, string> = {
    'P1 - Khẩn cấp': '#f43f5e',
    'P2 - Cao': '#f97316',
    'P3 - Trung bình': '#f59e0b',
    'P4 - Thấp': '#64748b'
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Tổng quan vận hành & Tự động hóa (Số liệu thực tế)
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Dữ liệu được tính toán trực tiếp từ cơ sở dữ liệu SQLite của các ticket đã xử lý.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-normal cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Cập nhật số liệu</span>
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Tổng ticket đã lưu
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-slate-900">{stats.total_tickets}</span>
            <span className="text-xs text-slate-400 font-normal">ticket</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Lưu trong data/helpdesk.db
          </span>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Tỷ lệ tự động định tuyến
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-emerald-700">{stats.auto_routed_pct}%</span>
            <span className="text-xs text-slate-500 font-normal">({stats.auto_routed_count} ticket)</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Đạt chuẩn an toàn
          </span>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Cần người duyệt
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-rose-700">{stats.needs_review_pct}%</span>
            <span className="text-xs text-slate-500 font-normal">({stats.needs_review_count} ticket)</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Tin cậy thấp hoặc rủi ro
          </span>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-normal block">
            Đã chỉnh bởi nhân viên
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-indigo-700">{stats.reviewed_by_human_count}</span>
            <span className="text-xs text-slate-500 font-normal">lượt sửa</span>
          </div>
          <span className="text-xs text-slate-400 font-normal block">
            Độ trễ TB: {stats.avg_inference_ms} ms
          </span>
        </div>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* By Queue */}
        <div className="lg:col-span-8 bg-white rounded-lg p-4 border border-slate-200 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Phân bổ theo hàng đợi phòng ban
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Số lượng ticket thực tế theo đích đến
            </p>
          </div>

          <div className="h-56 w-full">
            {stats.by_queue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_queue} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
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
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu hàng đợi
              </div>
            )}
          </div>
        </div>

        {/* By Priority */}
        <div className="lg:col-span-4 bg-white rounded-lg p-4 border border-slate-200 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Phân bổ mức độ ưu tiên
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Phân tầng rủi ro thực tế
            </p>
          </div>

          <div className="h-44 w-full">
            {stats.by_priority.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.by_priority}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {stats.by_priority.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={prioColors[entry.name] || '#64748b'}
                      />
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
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu ưu tiên
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-xs">
            {stats.by_priority.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: prioColors[item.name] || '#64748b' }}
                />
                <span className="text-slate-600 font-normal truncate">{item.name}:</span>
                <span className="font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
