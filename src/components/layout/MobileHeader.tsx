import React from 'react';
import { Menu, Users, Wallet } from 'lucide-react';
import { UserProfile } from '@/types/auth';
import { SyncStatusBadge } from '@/components/sync/SyncStatusBadge';

interface MobileHeaderProps {
  onOpenMobileMenu: () => void;
  pendingSavesCount: number;
  currentUser: UserProfile;
  activeTab: string;
  onOpenTeachersModal: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenMobileMenu,
  pendingSavesCount,
  currentUser,
  activeTab,
  onOpenTeachersModal
}) => {
  return (
    <header className="lg:hidden h-16 border-b border-white/10 bg-[#070911] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shrink-0 shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-3">
        {/* Hamburger for mobile */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 hover:text-white transition-all cursor-pointer shadow-[0_0_12px_rgba(92,54,245,0.3)] shrink-0"
          title="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-400/50 rounded-xl flex items-center justify-center text-indigo-300 shadow-[0_0_12px_rgba(92,54,245,0.4)] shrink-0">
            <Wallet className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-wider text-white uppercase leading-none">Finance</span>
            <span className="font-extrabold text-[9px] tracking-widest text-indigo-400 uppercase leading-none mt-0.5">Dashboard</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        <SyncStatusBadge />

        {pendingSavesCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-black shadow-sm animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>Đang lưu ngầm ({pendingSavesCount})</span>
          </div>
        )}

        {/* Quick Scheduler Manage (Admin only & Schedule view) */}
        {currentUser.role === 'admin' && activeTab === 'schedule' && (
          <button
            onClick={onOpenTeachersModal}
            title="Quản lý danh sách giáo viên"
            className="flex items-center gap-2 px-3 py-1.5 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-xl shadow-md transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Quản lý</span>
          </button>
        )}
      </div>

    </header>
  );
};

export default MobileHeader;
