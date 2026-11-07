import React from 'react';
import { Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab: 'inbox' | 'dashboard' | 'insights' | 'settings';
  onTabChange: (tab: 'inbox' | 'dashboard' | 'insights' | 'settings') => void;
  selectedIndustry: string;
  onIndustryChange: (ind: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  selectedIndustry,
  onIndustryChange
}) => {
  return (
    <header className="h-12 w-full bg-white border-b border-slate-200 px-4 flex items-center justify-between whitespace-nowrap shrink-0 sticky top-0 z-30">
      
      {/* Brand & Left Navigation */}
      <div className="flex items-center gap-6 h-full">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-slate-900 tracking-tight">
            AutoDesk Support
          </span>
        </div>

        {/* Short Vietnamese Navigation */}
        <nav className="flex items-center gap-1 h-full">
          <button
            onClick={() => onTabChange('inbox')}
            className={`h-full px-3 text-sm flex items-center transition-colors cursor-pointer border-b-2 ${
              currentTab === 'inbox'
                ? 'text-indigo-600 border-indigo-600 font-semibold'
                : 'text-slate-500 border-transparent hover:text-slate-800 font-normal'
            }`}
          >
            Hộp thư
          </button>

          <button
            onClick={() => onTabChange('dashboard')}
            className={`h-full px-3 text-sm flex items-center transition-colors cursor-pointer border-b-2 ${
              currentTab === 'dashboard'
                ? 'text-indigo-600 border-indigo-600 font-semibold'
                : 'text-slate-500 border-transparent hover:text-slate-800 font-normal'
            }`}
          >
            Tổng quan
          </button>

          <button
            onClick={() => onTabChange('insights')}
            className={`h-full px-3 text-sm flex items-center transition-colors cursor-pointer border-b-2 ${
              currentTab === 'insights'
                ? 'text-indigo-600 border-indigo-600 font-semibold'
                : 'text-slate-500 border-transparent hover:text-slate-800 font-normal'
            }`}
          >
            Mô hình
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`h-full px-3 text-sm flex items-center transition-colors cursor-pointer border-b-2 ${
              currentTab === 'settings'
                ? 'text-indigo-600 border-indigo-600 font-semibold'
                : 'text-slate-500 border-transparent hover:text-slate-800 font-normal'
            }`}
          >
            Cài đặt
          </button>
        </nav>

      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        
        {/* Compact Industry Select */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Ngành:</span>
          <select
            value={selectedIndustry}
            onChange={(e) => onIndustryChange(e.target.value)}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-normal focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ecommerce">Bán lẻ & E-Commerce</option>
            <option value="fintech">Ngân hàng & Fintech</option>
            <option value="saas">Phần mềm & SaaS</option>
          </select>
        </div>

        {/* User profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center">
            NV
          </div>
          <span className="text-xs text-slate-600 font-normal hidden sm:inline">
            Agent CSKH
          </span>
        </div>

      </div>

    </header>
  );
};
