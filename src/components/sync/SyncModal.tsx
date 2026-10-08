'use client';

import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  Cloud, 
  CloudOff, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  HardDrive, 
  ArrowLeftRight,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { SyncState, SyncStats } from '@/hooks/useSyncManager';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncState;
  lastSyncTime: string | null;
  message: string;
  stats: SyncStats | null;
  remoteUrl: string;
  tableCounts: Record<string, number>;
  onSyncNow: (forceFullSync?: boolean) => Promise<void>;
  onTestConnection: (url?: string) => Promise<any>;
  onSaveRemoteUrl: (url: string) => Promise<any>;
}

export function SyncModal({
  isOpen,
  onClose,
  status,
  lastSyncTime,
  message,
  stats,
  remoteUrl,
  tableCounts,
  onSyncNow,
  onTestConnection,
  onSaveRemoteUrl
}: SyncModalProps) {
  const [editingUrl, setEditingUrl] = useState(remoteUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(editingUrl);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveUrl = async () => {
    setIsSavingUrl(true);
    try {
      await onSaveRemoteUrl(editingUrl);
      await handleTest();
    } finally {
      setIsSavingUrl(false);
    }
  };

  const handleTriggerSync = async (force: boolean) => {
    setIsSyncing(true);
    try {
      await onSyncNow(force);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Chưa có thông tin';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="relative w-full max-w-2xl bg-[#0c0f1d] border border-[#212c4b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#212c4b] bg-[#121626]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5c36f5]/20 border border-[#5c36f5]/40 flex items-center justify-center text-[#8e74ff]">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Trung Tâm Đồng Bộ Hai Chiều</h2>
              <p className="text-xs text-slate-400">Local (Máy tính) | Web Server (24/7 VPS)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-4 ${
            status === 'synced'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : status === 'syncing'
              ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-300'
              : status === 'offline'
              ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          }`}>
            <div className="mt-0.5 shrink-0">
              {status === 'synced' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              {status === 'syncing' && <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />}
              {status === 'offline' && <CloudOff className="w-6 h-6 text-amber-400" />}
              {status === 'error' && <AlertCircle className="w-6 h-6 text-rose-400" />}
              {status === 'idle' && <Cloud className="w-6 h-6 text-slate-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm tracking-wide">
                  {status === 'synced' && 'ĐÃ ĐỒNG BỘ HAI CHIỀU THÀNH CÔNG'}
                  {status === 'syncing' && 'ĐANG TIẾN HÀNH ĐỒNG BỘ DỮ LIỆU...'}
                  {status === 'offline' && 'WEB SERVER ĐANG NGOẠI TUYẾN / SẬP (AN TOÀN CỤC BỘ)'}
                  {status === 'error' && 'GẶP SỰ CỐ KHI ĐỒNG BỘ'}
                  {status === 'idle' && 'TRẠNG THÁI CHỜ ĐỒNG BỘ'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatTime(lastSyncTime)}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
              {status === 'offline' && (
                <p className="text-xs text-amber-200/90 mt-2 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Lưu ý: Mọi thao tác thêm/sửa/xóa bạn thực hiện trên bản Local lúc này đều được bảo toàn 100% trong máy. Ngay khi Web mở lại hoặc có mạng, hệ thống sẽ tự động đồng bộ bù mà không gây mất hay xung đột dữ liệu.
                </p>
              )}
            </div>
          </div>

          {/* Architecture Nodes: Local vs Web */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#121626] border border-[#212c4b]">
              <div className="flex items-center gap-2 mb-3 text-slate-200 font-bold text-xs uppercase tracking-wider">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Bản Cục Bộ (Local Machine)</span>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Địa chỉ máy:</span>
                  <span className="text-white font-mono">http://localhost:9000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Cơ sở dữ liệu:</span>
                  <span className="text-white font-mono">SQLite (data/local.db)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Buổi dạy (Sessions):</span>
                  <span className="text-white font-bold">{tableCounts.sessions || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Giao dịch (Transactions):</span>
                  <span className="text-white font-bold">{tableCounts.manual_transactions || 0}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#121626] border border-[#212c4b]">
              <div className="flex items-center gap-2 mb-3 text-slate-200 font-bold text-xs uppercase tracking-wider">
                <Server className="w-4 h-4 text-purple-400" />
                <span>Bản Đám Mây / Web (24/7 VPS)</span>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Cổng kết nối:</span>
                  <span className="text-white font-mono truncate max-w-[200px]">{remoteUrl}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Chế độ xung đột:</span>
                  <span className="text-emerald-400 font-medium">Last-Write-Wins + Tombstone</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Hóa đơn ngân hàng:</span>
                  <span className="text-white font-bold">{tableCounts.bank_receipts || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Chu kỳ tự động:</span>
                  <span className="text-white">Mỗi 45 giây</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Input for Remote Web URL */}
          <div className="p-4 rounded-xl bg-[#121626] border border-[#212c4b] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#5c36f5]" />
                Đường Dẫn Web Server (Remote URL)
              </label>
              <span className="text-[11px] text-slate-500">Mặc định: https://chamcong.upkidscentermanager.io.vn</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                placeholder="https://chamcong.upkidscentermanager.io.vn"
                className="flex-1 px-3 py-2 bg-[#0c0f1d] border border-[#212c4b] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#5c36f5]"
              />
              <button
                onClick={handleSaveUrl}
                disabled={isSavingUrl}
                className="px-4 py-2 bg-[#5c36f5] hover:bg-[#6c48f7] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {isSavingUrl ? 'Đang lưu...' : 'Lưu URL'}
              </button>
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/10 transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Đang kiểm tra...' : 'Kiểm Tra'}
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg text-xs border ${
                testResult.isOnline 
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                  : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          {/* Sync Stats Summary if available */}
          {stats && (
            <div className="p-4 rounded-xl bg-[#121626] border border-[#212c4b]">
              <div className="flex items-center gap-2 mb-3 text-slate-200 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Kết Quả Lần Đồng Bộ Gần Nhất</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-[#0c0f1d] border border-white/5">
                  <div className="text-slate-400 text-[11px]">Nhận về</div>
                  <div className="text-emerald-400 font-bold text-sm">+{stats.appliedRecords}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#0c0f1d] border border-white/5">
                  <div className="text-slate-400 text-[11px]">Đẩy lên</div>
                  <div className="text-sky-400 font-bold text-sm">+{stats.outgoingRecords}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#0c0f1d] border border-white/5">
                  <div className="text-slate-400 text-[11px]">Xóa đồng bộ</div>
                  <div className="text-amber-400 font-bold text-sm">{stats.appliedDeletions}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#0c0f1d] border border-white/5">
                  <div className="text-slate-400 text-[11px]">Khử xung đột</div>
                  <div className="text-purple-400 font-bold text-sm">{stats.conflictsResolved}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#212c4b] bg-[#121626]">
          <button
            onClick={() => handleTriggerSync(true)}
            disabled={isSyncing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-colors disabled:opacity-50"
          >
            Đồng Bộ Toàn Bộ (Full Resync)
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={() => handleTriggerSync(false)}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#5c36f5] hover:bg-[#6c48f7] text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(92,54,245,0.4)] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Hai Chiều Ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
