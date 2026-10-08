'use client';

import React, { useState } from 'react';
import { RefreshCw, Cloud, CloudOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSyncManager } from '@/hooks/useSyncManager';
import { SyncModal } from './SyncModal';

export function SyncStatusBadge() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const syncManager = useSyncManager();
  const { status, lastSyncTime, message, stats, remoteUrl, tableCounts, syncNow, testConnection, saveRemoteUrl } = syncManager;

  const getBadgeConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Đã đồng bộ',
          pillClass: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />,
          label: 'Đang sync...',
          pillClass: 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40',
          dotClass: 'bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]',
        };
      case 'offline':
        return {
          icon: <CloudOff className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Web sập / Ngoại tuyến',
          pillClass: 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40',
          dotClass: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Lỗi đồng bộ',
          pillClass: 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/40',
          dotClass: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
        };
      default:
        return {
          icon: <Cloud className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Chờ sync',
          pillClass: 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800',
          dotClass: 'bg-slate-400',
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIsModalOpen(true)}
          title={`Trạng thái đồng bộ: ${message} (Bấm để xem chi tiết hoặc cấu hình)`}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${badge.pillClass}`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dotClass}`} />
          <span className="hidden sm:inline font-mono tracking-tight">{badge.label}</span>
          {badge.icon}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            syncNow(false);
          }}
          disabled={status === 'syncing'}
          title="Bấm để đồng bộ dữ liệu ngay lập tức"
          className="p-1.5 rounded-xl bg-[#121626] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <SyncModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        status={status}
        lastSyncTime={lastSyncTime}
        message={message}
        stats={stats}
        remoteUrl={remoteUrl}
        tableCounts={tableCounts}
        onSyncNow={syncNow}
        onTestConnection={testConnection}
        onSaveRemoteUrl={saveRemoteUrl}
      />
    </>
  );
}
