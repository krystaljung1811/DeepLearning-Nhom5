import React from 'react';
import {
  Inbox,
  LayoutDashboard,
  LineChart,
  Settings,
  Building2,
  Sparkles,
  Command
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'inbox' | 'dashboard' | 'insights' | 'settings';
  onTabChange: (tab: 'inbox' | 'dashboard' | 'insights' | 'settings') => void;
  selectedIndustry: string;
  onIndustryChange: (ind: string) => void;
  confidenceThreshold: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  selectedIndustry,
  onIndustryChange,
  confidenceThreshold
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              AutoDesk Support
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              BiLSTM + Attention
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 sm:gap-2 h-full">
        <button
          onClick={() => onTabChange('inbox')}
          className={`h-full px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
            currentTab === 'inbox'
              ? 'text-indigo-600 border-indigo-600 font-bold'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Hộp Thư (Inbox)</span>
        </button>

        <button
          onClick={() => onTabChange('dashboard')}
          className={`h-full px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-indigo-600 border-indigo-600 font-bold'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Bảng Điều Khiển (Dashboard)</span>
        </button>

        <button
          onClick={() => onTabChange('insights')}
          className={`h-full px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
            currentTab === 'insights'
              ? 'text-indigo-600 border-indigo-600 font-bold'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <LineChart className="w-4 h-4" />
          <span>Nghiên Cứu & Benchmark</span>
        </button>

        <button
          onClick={() => onTabChange('settings')}
          className={`h-full px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
            currentTab === 'settings'
              ? 'text-indigo-600 border-indigo-600 font-bold'
              : 'text-slate-500 border-transparent hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu Hình (Settings)</span>
        </button>
      </nav>

      {/* Controls & Agent Profile */}
      <div className="flex items-center gap-3">
        
        {/* Industry dropdown */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-bold text-slate-500">Ngành:</span>
          <select
            value={selectedIndustry}
            onChange={(e) => onIndustryChange(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="ecommerce">🏬 E-Commerce / Bán lẻ</option>
            <option value="fintech">🏦 Ngân hàng & Fintech</option>
            <option value="saas">💻 Phần mềm & SaaS</option>
          </select>
        </div>

        {/* Threshold pill */}
        <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          <span>Ngưỡng:</span>
          <span className="text-indigo-700">{Math.round(confidenceThreshold * 100)}%</span>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="hidden xl:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          <Command className="w-3 h-3" />
          <span>J / K điều hướng</span>
        </div>

        {/* Agent Profile avatar */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
            NV
          </div>
          <div className="hidden md:block text-left text-[11px] leading-tight">
            <span className="font-bold text-slate-800 block">Agent CSKH</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Trực tuyến</span>
          </div>
        </div>

      </div>

    </header>
  );
};

