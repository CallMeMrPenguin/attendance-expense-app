import React from 'react';
import { 
  Wallet, 
  Plus, 
  LayoutDashboard, 
  Activity, 
  PiggyBank, 
  Calendar as CalendarIcon, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Key
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
  onChangePassword?: () => void;
  collapsed?: boolean;
  setCollapsed?: (val: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentUser,
  handleLogout,
  handleOpenTxModal,
  isMobile = false,
  onChangePassword,
  collapsed = false,
  setCollapsed
}: SidebarProps) {
  const tabs = [
    { id: 'dashboard', label: 'TỔNG QUAN', icon: LayoutDashboard },
    { id: 'flow', label: 'DÒNG TIỀN', icon: Activity },
    { id: 'saving', label: 'TIẾT KIỆM', icon: PiggyBank },
    { id: 'schedule', label: 'LỊCH TRÌNH', icon: CalendarIcon },
    { id: 'settings', label: 'CÀI ĐẶT', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col h-full select-none text-left relative">
      {/* Collapse floating toggle button (Desktop only) */}
      {!isMobile && setCollapsed && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-4 -right-8.5 bg-[#0f1320] hover:bg-[#151a2d] text-slate-400 hover:text-white border border-white/10 p-1.5 rounded-full shadow-[0_0_15px_rgba(92,54,245,0.15)] z-50 cursor-pointer"
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Brand */}
      <div className={`flex items-center gap-3 py-4 mb-4 border-b border-white/5 transition-all duration-300 ${collapsed ? 'px-0 justify-center' : 'px-2'}`}>
        <div className="h-10 w-10 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(92,54,245,0.45)] shrink-0">
          <Wallet className="h-5.5 w-5.5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-wide text-white uppercase leading-none shadow-[0_0_10px_rgba(255,255,255,0.1)]">Finance</span>
            <span className="font-extrabold text-[9px] tracking-widest text-indigo-400 uppercase shadow-[0_0_10px_rgba(92,54,245,0.3)]">Dashboard</span>
          </div>
        )}
      </div>

      {/* Global Pop-up input button in sidebar */}
      <button
        onClick={() => handleOpenTxModal('expense')}
        className={`mb-6 flex items-center justify-center bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] hover:shadow-[0_0_15px_rgba(92,54,245,0.5)] hover:scale-[1.01] transition-all cursor-pointer border border-white/10 select-none shrink-0 ${
          collapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-3 text-xs gap-2'
        }`}
        title="Thêm giao dịch"
      >
        <Plus className="h-4.5 w-4.5" />
        {!collapsed && <span>Thêm giao dịch</span>}
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
              className={`flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
              } ${
                isActive
                  ? 'bg-indigo-500/20 border border-indigo-500/60 text-white shadow-[0_0_15px_rgba(92,54,245,0.3)]'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
              }`}
              title={tab.label}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              {!collapsed && <span>{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile card & password / logout actions */}
      <div className="border-t border-white/5 pt-4 flex flex-col gap-1.5 shrink-0">
        <div className={`flex items-center py-1.5 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2 mb-2'}`}>
          <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-black text-xs shadow-sm shrink-0">
            {currentUser.teacherName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold text-white truncate leading-tight">
                {currentUser.teacherName}
              </span>
              <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest leading-none">
                {currentUser.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
          )}
        </div>

        {/* Change password button */}
        <button
          onClick={onChangePassword}
          className={`flex items-center text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 rounded-xl transition-all cursor-pointer text-left ${
            collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-4 py-2.5 text-xs font-bold'
          }`}
          title="Đổi mật khẩu"
        >
          <Key className="h-4.5 w-4.5 text-slate-400 shrink-0" />
          {!collapsed && <span>Đổi mật khẩu</span>}
        </button>
        
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={`flex items-center text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left ${
            collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-4 py-2.5 text-xs font-bold'
          }`}
          title="Đăng xuất"
        >
          <LogOut className="h-4.5 w-4.5 text-rose-450 shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );
}
