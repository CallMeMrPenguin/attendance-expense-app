import React from 'react';
import { 
  Wallet, 
  Plus, 
  LayoutDashboard, 
  Activity, 
  PiggyBank, 
  Calendar as CalendarIcon, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings') => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  currentUser: {
    username: string;
    teacherName: string;
    role: 'admin' | 'teacher' | 'user';
  };
  handleLogout: () => Promise<void>;
  handleOpenTxModal: (type: 'income' | 'expense' | 'saving') => void;
  isMobile?: boolean;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentUser,
  handleLogout,
  handleOpenTxModal,
  isMobile = false
}: SidebarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'flow', label: 'Dòng tiền', icon: Activity },
    { id: 'saving', label: 'Tiết kiệm', icon: PiggyBank },
    { id: 'schedule', label: 'Lịch trình', icon: CalendarIcon },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col h-full select-none text-left">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-white/5">
        <div className="h-10 w-10 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(92,54,245,0.25)] shrink-0">
          <Wallet className="h-5.5 w-5.5" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-sm tracking-wide text-white uppercase leading-none">Finance</span>
          <span className="font-extrabold text-[9px] tracking-widest text-indigo-400 uppercase">Dashboard</span>
        </div>
      </div>

      {/* Global Pop-up input button in sidebar */}
      <button
        onClick={() => handleOpenTxModal('expense')}
        className="mb-6 w-full flex items-center justify-center gap-2 py-3 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] hover:scale-[1.01] transition-all cursor-pointer border border-white/10 select-none shrink-0"
      >
        <Plus className="h-4 w-4" />
        <span>Thêm giao dịch</span>
      </button>

      {/* Navigation list */}
      <nav className="flex flex-col gap-2 flex-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                isActive
                  ? 'bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 shadow-[0_0_12px_rgba(92,54,245,0.15)]'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User profile card & logout */}
      <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-black text-xs shadow-sm shrink-0">
            {currentUser.teacherName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-extrabold text-white truncate leading-tight">
              {currentUser.teacherName}
            </span>
            <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest leading-none">
              {currentUser.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left"
        >
          <LogOut className="h-4.5 w-4.5 text-rose-450 shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
