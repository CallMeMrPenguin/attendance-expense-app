import React, { useState, useMemo } from 'react';
import { Shield, TrendingUp, Filter, Activity } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { formatVND } from '@/lib/utils';
import { SavingHistoryItem } from './saving-types';

interface SavingsHistorySectionProps {
  userId: string;
  savingsHistory: SavingHistoryItem[];
}

export const SavingsHistorySection: React.FC<SavingsHistorySectionProps> = ({
  userId,
  savingsHistory,
}) => {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'emergency' | 'accumulation' | 'deposit' | 'withdraw'>('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Filtered savings history list
  const filteredHistory = useMemo(() => {
    return (savingsHistory || []).filter(h => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'emergency') return h.fund === 'emergency';
      if (historyFilter === 'accumulation') return h.fund === 'accumulation';
      if (historyFilter === 'deposit') return h.type === 'deposit';
      if (historyFilter === 'withdraw') return h.type === 'withdraw';
      return true;
    });
  }, [savingsHistory, historyFilter]);

  const historyColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Ngày GD',
      size: 120,
      cell: ({ row }) => <span className="font-semibold text-xs text-slate-300">{row.original.date}</span>
    },
    {
      accessorKey: 'fund',
      header: 'Tên Quỹ',
      size: 160,
      cell: ({ row }) => {
        const h = row.original;
        const isEmergency = h.fund === 'emergency';
        const fundTitle = isEmergency ? 'Quỹ Dự Phòng' : 'Quỹ Tích Lũy';
        return (
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border shrink-0 ${
              isEmergency 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
            }`}>
              {isEmergency ? <Shield className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            </div>
            <span className="font-extrabold text-xs text-white">{fundTitle}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'type',
      header: 'Hành Động',
      size: 130,
      cell: ({ row }) => {
        const isDep = row.original.type === 'deposit';
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
            isDep
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {isDep ? 'Nạp Quỹ' : 'Rút Quỹ'}
          </span>
        );
      }
    },
    {
      accessorKey: 'note',
      header: 'Ghi Chú',
      cell: ({ row }) => <span className="text-xs text-slate-400">{row.original.note || 'N/A'}</span>
    },
    {
      accessorKey: 'amount',
      header: 'Số Tiền',
      size: 140,
      cell: ({ row }) => {
        const h = row.original;
        const isDep = h.type === 'deposit';
        return (
          <span className={`font-black text-xs sm:text-sm tracking-wide ${
            isDep ? 'text-emerald-400 text-glow-green' : 'text-rose-400 text-glow-red'
          }`}>
            {isDep ? '+' : '-'}{formatVND(h.amount)}
          </span>
        );
      }
    }
  ], []);

  return (
    <div className="lg:col-span-2 bg-[#0a0d18] border border-purple-500/20 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-xl shadow-[0_0_10px_rgba(168,85,247,0.3)] shrink-0">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
            Lịch sử giao dịch
          </h3>
        </div>

        {/* Filter controls */}
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setFilterDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#121629] border border-purple-500/30 hover:border-purple-500/50 text-xs font-bold text-slate-300 rounded-xl cursor-pointer transition-all shadow-sm"
            >
              <span>
                {historyFilter === 'all' && 'Tất cả giao dịch'}
                {historyFilter === 'emergency' && 'Quỹ Dự Phòng'}
                {historyFilter === 'accumulation' && 'Quỹ Tích Lũy'}
                {historyFilter === 'deposit' && 'Nạp vào quỹ'}
                {historyFilter === 'withdraw' && 'Rút khỏi quỹ'}
              </span>
              <Filter className="h-3.5 w-3.5 text-purple-400" />
            </button>

            {filterDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-[#0d101d] border border-purple-500/20 rounded-2xl p-2 w-48 shadow-2xl space-y-1 animate-mac-dropdown origin-top-right">
                {[
                  { id: 'all', label: 'Tất cả giao dịch' },
                  { id: 'emergency', label: 'Quỹ Dự Phòng' },
                  { id: 'accumulation', label: 'Quỹ Tích Lũy' },
                  { id: 'deposit', label: 'Nạp vào quỹ' },
                  { id: 'withdraw', label: 'Rút khỏi quỹ' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setHistoryFilter(item.id as any);
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      historyFilter === item.id 
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History DataTable */}
      <DataTable
        tableId="saving_history"
        userId={userId}
        data={filteredHistory}
        columns={historyColumns}
        pageSize={20}
        exportFilename="lich_su_tiet_kiem"
        searchPlaceholder="Tìm kiếm lịch sử..."
        emptyMessage="Chưa ghi nhận lịch sử nạp / rút tiết kiệm nào."
      />
    </div>
  );
};

export default SavingsHistorySection;
