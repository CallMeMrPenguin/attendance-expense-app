'use client';

import React, { useMemo, useState } from 'react';
import { 
  X, 
  Trash2, 
  RotateCcw, 
  Calendar, 
  Clock, 
  Receipt, 
  AlertCircle,
  Sparkles,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { TrashItem } from '@/hooks/useTrashBin';
import { formatDateVN } from '@/lib/utils';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashItems: TrashItem[];
  loading: boolean;
  onRestore: (item: TrashItem) => Promise<boolean>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashItems,
  loading,
  onRestore,
  onPermanentDelete,
  onEmptyTrash
}) => {
  const [filterType, setFilterType] = useState<'all' | 'schedule' | 'session' | 'transaction'>('all');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (filterType === 'all') return trashItems;
    if (filterType === 'schedule') return trashItems.filter(i => i.item_type === 'schedule' || i.item_type === 'session');
    if (filterType === 'transaction') return trashItems.filter(i => i.item_type === 'transaction');
    return trashItems.filter(i => i.item_type === filterType);
  }, [trashItems, filterType]);

  const getRemainingDays = (expiresAtStr: string) => {
    const diff = new Date(expiresAtStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const columns = useMemo<ColumnDef<TrashItem>[]>(() => [
    {
      id: 'type',
      header: 'Loại',
      accessorKey: 'item_type',
      cell: ({ row }) => {
        const type = row.original.item_type;
        if (type === 'schedule') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Calendar className="w-3 h-3" />
              Lịch Trình
            </span>
          );
        }
        if (type === 'session') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              <Clock className="w-3 h-3" />
              Ca Dạy Lẻ
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Receipt className="w-3 h-3" />
            Giao Dịch
          </span>
        );
      }
    },
    {
      id: 'name',
      header: 'Tên Mục Đã Xóa',
      accessorKey: 'item_name',
      cell: ({ row }) => (
        <div className="flex flex-col text-left py-1">
          <span className="font-black text-white text-xs">{row.original.item_name}</span>
          {row.original.deleted_month && (
            <span className="text-[10px] text-slate-400 font-bold mt-0.5">
              Tháng {row.original.deleted_month}
            </span>
          )}
        </div>
      )
    },
    {
      id: 'user',
      header: 'Phụ Trách',
      accessorKey: 'related_user',
      cell: ({ row }) => (
        <span className="text-xs font-bold text-slate-300">
          {row.original.related_user || 'ADMIN'}
        </span>
      )
    },
    {
      id: 'deleted_at',
      header: 'Thời Gian Xóa',
      accessorKey: 'deleted_at',
      cell: ({ row }) => {
        const d = new Date(row.original.deleted_at);
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return <span className="text-xs font-mono text-slate-400">{dateStr}</span>;
      }
    },
    {
      id: 'expiration',
      header: 'Hạn Lưu Trữ',
      accessorKey: 'expires_at',
      cell: ({ row }) => {
        const days = getRemainingDays(row.original.expires_at);
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
            days <= 3 
              ? 'text-rose-300 bg-rose-500/15 border border-rose-500/30' 
              : 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
          }`}>
            Còn {days} ngày
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Thao Tác',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const item = row.original;
        const isRestoring = restoringId === item.id;
        const isDeleting = deletingId === item.id;

        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              disabled={isRestoring || isDeleting}
              onClick={async () => {
                setRestoringId(item.id);
                try {
                  await onRestore(item);
                } finally {
                  setRestoringId(null);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5c36f5] hover:bg-[#7351f7] text-white text-xs font-black transition-all shadow-[0_0_12px_rgba(92,54,245,0.4)] active:scale-95 cursor-pointer disabled:opacity-50"
              title="Khôi phục lại vào hệ thống"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
              <span>Khôi Phục</span>
            </button>

            <button
              type="button"
              disabled={isRestoring || isDeleting}
              onClick={async () => {
                if (confirm(`Bạn có chắc muốn xóa vĩnh viễn mục "${item.item_name}"?`)) {
                  setDeletingId(item.id);
                  try {
                    await onPermanentDelete(item.id);
                  } finally {
                    setDeletingId(null);
                  }
                }
              }}
              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title="Xóa vĩnh viễn ngay lập tức"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    }
  ], [restoringId, deletingId, onRestore, onPermanentDelete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div 
        className="fixed inset-0 bg-black/85 transition-opacity cursor-pointer"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-[#0c0f1e] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl z-10 max-h-[92vh] flex flex-col text-left animate-mac-dropdown">
        {/* Header Bar */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.3)]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Thùng Rác & Đã Xóa Gần Đây
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {trashItems.length} mục
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Các mục xóa nhầm sẽ được lưu giữ an toàn 30 ngày. Hệ thống tự động dọn dẹp vĩnh viễn sau 30 ngày.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trashItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn dọn sạch toàn bộ Thùng rác vĩnh viễn?')) {
                    onEmptyTrash();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-black transition-colors cursor-pointer"
              >
                Dọn Sạch Thùng Rác
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 my-4 select-none shrink-0 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Tất Cả' },
            { id: 'schedule', label: 'Lịch Trình & Ca Dạy' },
            { id: 'transaction', label: 'Giao Dịch Thu Chi' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                filterType === tab.id
                  ? 'bg-[#5c36f5] text-white border-white/20 shadow-[0_0_12px_rgba(92,54,245,0.4)]'
                  : 'bg-[#121624] text-slate-400 border-white/5 hover:text-white hover:bg-[#1a2035]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-hidden min-h-[320px]">
          <DataTable<TrashItem>
            data={filteredData}
            columns={columns}
            pageSize={20}
            showPagination={true}
            searchPlaceholder="Tìm theo tên mục..."
            emptyMessage={
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-sm font-bold text-slate-400">Thùng rác hiện đang trống</span>
                <span className="text-xs text-slate-500 mt-1">
                  Mọi lịch trình hoặc ca dạy bị xóa sẽ được lưu tại đây trong 30 ngày để khôi phục khi cần.
                </span>
              </div>
            }
          />
        </div>

        {/* Footer info note */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Khi bấm "Khôi Phục", lịch trình và ca dạy sẽ quay trở lại bảng lịch ngay lập tức với đầy đủ số ca và thông tin học phí.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs transition-colors cursor-pointer shrink-0"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrashModal;
