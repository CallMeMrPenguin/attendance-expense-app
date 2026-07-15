import React, { useState, useEffect, useRef } from 'react';
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

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="flex flex-col h-full select-none text-left relative">
      {/* Brand Header */}
      <div className={`flex items-center py-4 mb-4 border-b border-white/5 transition-all duration-300 ${collapsed ? 'px-0 justify-center' : 'px-2 gap-3.5'}`}>
        <div className={`bg-indigo-500/25 border-2 border-indigo-400/80 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(92,54,245,0.8),0_0_15px_rgba(129,140,248,0.6),inset_0_0_12px_rgba(92,54,245,0.4)] shrink-0 transition-all ${
          collapsed ? 'h-10 w-10' : 'h-13 w-13'
        }`}>
          <Wallet className={`text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)] transition-all ${
            collapsed ? 'h-5 w-5' : 'h-7 w-7'
          }`} />
        </div>
        <div className={`flex flex-col transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'w-0 opacity-0 max-w-0' : 'w-auto opacity-100 max-w-44'}`}>
          <span className="font-black text-[17px] tracking-wide text-white uppercase leading-none text-glow-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">Finance</span>
          <span className="font-black text-[11px] tracking-[0.2em] text-indigo-400 uppercase text-glow-purple drop-shadow-[0_0_15px_rgba(129,140,248,0.9)] mt-0.5">Dashboard</span>
        </div>
      </div>

      {/* Global Pop-up input button in sidebar */}
      {currentUser.role === 'admin' && (
        <button
          onClick={() => handleOpenTxModal('expense')}
          className={`mb-6 flex items-center justify-center bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] hover:shadow-[0_0_15px_rgba(92,54,245,0.5)] hover:scale-[1.01] transition-all cursor-pointer border border-white/10 select-none shrink-0 ${
            collapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-3 text-xs gap-2'
          }`}
          title="Thêm giao dịch"
        >
          <Plus className="h-4.5 w-4.5" />
          <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
            collapsed ? 'w-0 opacity-0 max-w-0' : 'w-auto opacity-100 max-w-40'
          }`}>
            Thêm giao dịch
          </span>
        </button>
      )}

      {/* Navigation list */}
      <nav className="flex flex-col gap-2 flex-1">
        {(currentUser.role === 'admin' ? tabs : tabs.filter(t => t.id === 'schedule')).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={`group flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                collapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'
              } ${
                isActive
                  ? 'bg-indigo-500/20 border-2 border-indigo-400 text-white shadow-[0_0_20px_rgba(92,54,245,0.55),0_0_10px_rgba(129,140,248,0.45),inset_0_0_12px_rgba(92,54,245,0.3)]'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent'
              }`}
              title={tab.label}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-all ${
                isActive 
                  ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]' 
                  : 'text-slate-400 group-hover:text-white group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]'
              }`} />
              <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                collapsed ? 'w-0 opacity-0 max-w-0 pointer-events-none' : 'w-auto opacity-100 max-w-40'
              } ${isActive ? 'text-glow-white' : 'group-hover:text-glow-white'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User profile section with popup dropdown menu */}
      <div className="border-t border-white/5 pt-4 flex flex-col shrink-0 relative" ref={profileRef}>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className={`flex items-center py-2.5 rounded-xl hover:bg-white/[0.04] transition-all duration-300 text-left w-full cursor-pointer ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2'}`}
          title={currentUser.teacherName}
        >
          <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-black text-xs shadow-sm hover:shadow-[0_0_10px_rgba(92,54,245,0.4)] transition-all shrink-0">
            {currentUser.teacherName.charAt(0).toUpperCase()}
          </div>
          <div className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
            collapsed ? 'w-0 opacity-0 max-w-0 pointer-events-none' : 'w-auto opacity-100 max-w-40 ml-1'
          }`}>
            <span className="text-xs font-extrabold text-white truncate leading-tight">
              {currentUser.teacherName}
            </span>
            <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest leading-none mt-0.5">
              {currentUser.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        </button>

        {/* Profile Popover Menu (Upward / flyout menu style) */}
        {profileOpen && (
          <div className={`absolute z-[250] bg-[#0d1018]/95 border border-white/10 rounded-[14px] shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-1.5 backdrop-blur-xl animate-mac-dropdown transition-all ${
            collapsed 
              ? 'left-full bottom-2 ml-3.5 w-44 origin-left' 
              : 'bottom-full left-0 mb-2 w-full origin-bottom'
          }`}>
            {!collapsed && (
              <div className="px-3.5 py-2.5 border-b border-white/5 select-none mb-1 text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">Tài khoản</p>
                <p className="text-xs font-extrabold text-white truncate mt-0.5">{currentUser.username}</p>
              </div>
            )}
            
            <button
              onClick={() => { onChangePassword?.(); setProfileOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all cursor-pointer text-left"
            >
              <Key className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Đổi mật khẩu</span>
            </button>
            
            <button
              onClick={() => { handleLogout(); setProfileOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left border-t border-white/5 mt-1 pt-2"
            >
              <LogOut className="h-4 w-4 text-rose-500 shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
