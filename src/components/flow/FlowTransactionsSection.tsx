import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { formatVND, isHungTrangVcbTransfer, formatDateTimeVN } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { CategoryIcon } from './flow-constants';

interface FlowTransactionsSectionProps {
  currentUser: { id: string };
  filterRecurring: 'all' | 'co_dinh' | 'tam_thoi' | 'trao_doi' | 'khong_xep_loai' | 'bien_lai';
  setFilterRecurring: (val: 'all' | 'co_dinh' | 'tam_thoi' | 'trao_doi' | 'khong_xep_loai' | 'bien_lai') => void;
  filteredTransactions: any[];
  filteredBankReceipts: any[];
  bankReceiptsCount: number;
  isSyncing: boolean;
  handleSyncReceipts?: () => Promise<void>;
  handleUnclassifyReceipt?: (receiptId: string) => Promise<void> | void;
  onOpenClassify: (receipt: any) => void;
  onEditTransaction: (tx: any) => void;
  getCategoryIconName: (cat: string, type: 'income' | 'expense') => string;
}

export const FlowTransactionsSection: React.FC<FlowTransactionsSectionProps> = ({
  currentUser,
  filterRecurring,
  setFilterRecurring,
  filteredTransactions,
  filteredBankReceipts,
  bankReceiptsCount,
  isSyncing,
  handleSyncReceipts,
  handleUnclassifyReceipt,
  onOpenClassify,
  onEditTransaction,
  getCategoryIconName,
}) => {
  const { showToast } = useToast();

  const bankReceiptColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'trans_date',
      header: 'Ngày / Mã GD',
      size: 140,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col text-left">
            <span className="font-bold text-white text-xs">{formatDateTimeVN(r.trans_date)}</span>
            <span className="text-[10px] text-slate-400">Mã: {r.order_number || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'sender_name',
      header: 'Người Gửi -> Người Nhận',
      cell: ({ row }) => {
        const r = row.original;
        const detailsStr = r.details || '';
        const hasNoteInDetails = detailsStr.includes(' | Ghi chú: ');
        const mainDetails = hasNoteInDetails ? detailsStr.split(' | Ghi chú: ')[0] : detailsStr;
        const sender = r.sender_name || r.remitter_name || (r.debit_account?.includes('9981397845') ? 'PHAM THI THU TRANG' : 'BUI DUC HUNG');
        return (
          <div className="flex flex-col text-left max-w-xs truncate">
            <span className="font-extrabold text-white text-xs truncate">
              {sender} {'->'} {r.beneficiary_name || 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">{mainDetails}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'category',
      header: 'Trạng Thái & Phân Loại',
      size: 200,
      cell: ({ row }) => {
        const r = row.original;
        const isClassified = r.status === 'classified';
        const isInternalExchange = isHungTrangVcbTransfer(r);
        const isExchange = r.type === 'exchange' || isInternalExchange;
        const isIncome = r.type === 'income';
        const isSaving = r.type === 'saving';
        const badgeStyle = isIncome
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          : isSaving
          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
          : r.type === 'exchange'
          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
          : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
        const typeLabel = isIncome ? 'Thu' : isSaving ? 'Tiết kiệm' : r.type === 'exchange' ? 'Trao đổi' : 'Chi';
        const rawCat = r.category || (isExchange ? 'Trao đổi' : 'Đã phân loại');
        const isSame = rawCat.toLowerCase().trim() === typeLabel.toLowerCase().trim() || isExchange;
        const categoryBadgeText = isSame ? rawCat : `${rawCat} (${typeLabel})`;

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {isClassified ? (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${badgeStyle}`}>
                {categoryBadgeText}
              </span>
            ) : isExchange ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                Trao đổi
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Không xếp loại
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'amount',
      header: 'Số Tiền',
      size: 130,
      cell: ({ row }) => {
        const r = row.original;
        const isExchange = r.type === 'exchange' || isHungTrangVcbTransfer(r);
        if (isExchange) {
          return (
            <span className="font-black text-sm text-cyan-300">
              {formatVND(r.amount)}
            </span>
          );
        }

        const isIncome = r.type === 'income';
        const isSaving = r.type === 'saving';
        const colorClass = isIncome ? 'text-emerald-400' : isSaving ? 'text-purple-400' : 'text-rose-400';
        const prefix = isIncome ? '+' : '-';
        return (
          <span className={`font-black text-sm ${colorClass}`}>
            {prefix}{formatVND(r.amount)}
          </span>
        );
      }
    }
  ], []);

  const transactionColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Ngày',
      size: 140,
      minSize: 110,
      maxSize: 180,
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-slate-300">{formatDateTimeVN(row.original.date)}</span>
      )
    },
    {
      accessorKey: 'desc',
      header: 'Mô Tả & Loại Giao Dịch',
      size: 260,
      minSize: 160,
      maxSize: 350,
      cell: ({ row }) => {
        const t = row.original;
        const isIncome = t.type === 'income';
        const isExchange = t.type === 'exchange';
        const descColor = isIncome ? 'text-emerald-300' : isExchange ? 'text-cyan-300' : 'text-rose-300';
        return (
          <div className="flex items-center gap-2 truncate text-left">
            <span className={`font-extrabold text-xs truncate ${descColor}`}>
              {t.desc}
            </span>
            {t.isRecurring ? (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                Cố định
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-500/15 text-slate-400 border border-slate-500/25 shrink-0">
                Tạm thời
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'category',
      header: 'Danh Mục',
      size: 140,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) => {
        const t = row.original;
        const isIncome = t.type === 'income';
        const isExchange = t.type === 'exchange';
        const catIcon = isExchange ? 'Coins' : getCategoryIconName(t.category, t.type);
        const badgeColor = isIncome
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
          : isExchange
          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.25)]';
        const textColor = isIncome ? 'text-emerald-400' : isExchange ? 'text-cyan-400' : 'text-rose-400';

        return (
          <div className="flex items-center gap-2 shrink-0 justify-center">
            <span className={`inline-flex p-1.5 rounded-full border shrink-0 ${badgeColor}`}>
              <CategoryIcon iconName={catIcon} className="h-3.5 w-3.5" />
            </span>
            <span className={`font-black text-xs truncate ${textColor}`}>
              {t.category}
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: 'amount',
      header: 'Số Tiền',
      size: 140,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) => {
        const t = row.original;
        const isIncome = t.type === 'income';
        const isExchange = t.type === 'exchange';
        const amountColor = isIncome
          ? 'text-emerald-400 text-glow-green'
          : isExchange
          ? 'text-cyan-400 font-black'
          : 'text-rose-500 text-glow-red';
        const prefix = isIncome ? '+' : isExchange ? '' : '-';

        return (
          <span className={`font-black text-xs sm:text-sm tracking-wide ${amountColor}`}>
            {prefix}{formatVND(t.amount)}
          </span>
        );
      }
    }
  ], [getCategoryIconName]);

  const unclassifiedBankReceipts = useMemo(() => {
    return (filteredBankReceipts || []).filter(
      r => r.status !== 'classified' && r.type !== 'exchange' && !isHungTrangVcbTransfer(r)
    );
  }, [filteredBankReceipts]);

  const tabIndices: Record<string, number> = {
    all: 0,
    co_dinh: 1,
    tam_thoi: 2,
    trao_doi: 3,
    khong_xep_loai: 4,
    bien_lai: 5,
  };
  const activeIdx = tabIndices[filterRecurring] ?? 0;

  const indicatorBg = filterRecurring === 'all'
    ? 'bg-[#5c36f5] shadow-[0_0_14px_rgba(92,54,245,0.5)]'
    : filterRecurring === 'co_dinh'
    ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
    : filterRecurring === 'tam_thoi'
    ? 'bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.5)]'
    : filterRecurring === 'trao_doi'
    ? 'bg-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.5)]'
    : filterRecurring === 'khong_xep_loai'
    ? 'bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.5)]'
    : 'bg-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.5)]';

  const sectionTitle = filterRecurring === 'bien_lai'
    ? 'Biên Lai Ngân Hàng'
    : filterRecurring === 'khong_xep_loai'
    ? 'Biên Lai Chưa Xếp Loại'
    : 'Sổ Giao Dịch Chi Tiết';

  return (
    <div className="calendar-container-depth p-5 bg-[#06080e] rounded-3xl space-y-4 border-2 border-transparent [background:linear-gradient(#06080e,#06080e)_padding-box,linear-gradient(135deg,#3b82f6,#60a5fa,#1d4ed8)_border-box] shadow-[0_0_25px_rgba(59,130,246,0.35)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-black text-blue-400 text-glow-blue uppercase tracking-wider">
            {sectionTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Control sliding indicator */}
          <div className="relative flex bg-[#0d1018] p-1 rounded-xl border border-white/10 text-xs shrink-0 font-bold select-none min-w-[500px]">
            <div
              className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${indicatorBg}`}
              style={{
                left: activeIdx === 0 ? '4px' : `calc((100% / 6) * ${activeIdx} + 1px)`,
                width: 'calc((100% / 6) - 2px)',
              }}
            />
            <button
              type="button"
              onClick={() => setFilterRecurring('all')}
              className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'all' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterRecurring('co_dinh')}
              className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'co_dinh' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
            >
              Cố định
            </button>
            <button
              type="button"
              onClick={() => setFilterRecurring('tam_thoi')}
              className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'tam_thoi' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
            >
              Tạm thời
            </button>
            <button
              type="button"
              onClick={() => setFilterRecurring('trao_doi')}
              className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'trao_doi' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
            >
              Trao đổi
            </button>
            <button
              type="button"
              onClick={() => setFilterRecurring('khong_xep_loai')}
              className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'khong_xep_loai' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
            >
              Không xếp loại
            </button>
            <button
              type="button"
              onClick={() => setFilterRecurring('bien_lai')}
              className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'bien_lai' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
            >
              Biên lai
            </button>
          </div>
        </div>
      </div>

      {filterRecurring === 'bien_lai' ? (
        <div className="space-y-4">
          <DataTable
            tableId="flow_bank_receipts"
            userId={currentUser.id}
            data={filteredBankReceipts}
            columns={bankReceiptColumns}
            pageSize={20}
            exportFilename="bien_lai_ngan_hang"
            searchPlaceholder="Tìm kiếm biên lai..."
            onRowDoubleClick={(row) => onOpenClassify(row)}
            toolbarRight={
              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  if (handleSyncReceipts) {
                    await handleSyncReceipts();
                  }
                }}
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Gmail'}</span>
              </button>
            }
            emptyMessage={
              bankReceiptsCount > 0 
                ? 'Không có biên lai chuyển tiền nào trong tháng đã chọn.' 
                : 'Chưa có biên lai chuyển tiền nào được ghi nhận từ Gmail.'
            }
          />
        </div>
      ) : filterRecurring === 'khong_xep_loai' ? (
        <div className="space-y-4">
          <DataTable
            tableId="flow_unclassified_receipts"
            userId={currentUser.id}
            data={unclassifiedBankReceipts}
            columns={bankReceiptColumns}
            pageSize={20}
            exportFilename="bien_lai_chua_xep_loai"
            searchPlaceholder="Tìm kiếm chưa xếp loại..."
            onRowDoubleClick={(row) => onOpenClassify(row)}
            emptyMessage="Tất cả biên lai đã được phân loại đầy đủ."
          />
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable
            tableId="flow_transactions"
            userId={currentUser.id}
            data={filteredTransactions}
            columns={transactionColumns}
            pageSize={20}
            exportFilename="danh_sach_giao_dich"
            searchPlaceholder="Tìm kiếm giao dịch..."
            onRowDoubleClick={(row) => onEditTransaction({
              id: row.id,
              desc: row.desc,
              amount: row.amount,
              type: row.type,
              category: row.category,
              date: row.date,
              isRecurring: !!row.isRecurring
            })}
            emptyMessage="Chưa ghi nhận giao dịch nào."
          />
        </div>
      )}
    </div>
  );
};

export default FlowTransactionsSection;
