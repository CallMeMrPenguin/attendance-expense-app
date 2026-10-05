import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { TrendingUp, TrendingDown, Plus, GripVertical, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { formatVND } from '@/lib/utils';
import { CategoryIcon } from './flow-constants';
import TrangAccountCard from './TrangAccountCard';

interface FlowCategoryGridProps {
  currentUser: { id: string };
  incomeCats: any[];
  expenseCats: any[];
  categoryBudgets: Record<string, number>;
  chartSelectedMonths: string[];
  getCategoryActual: (cat: string, isExpense: boolean) => number;
  getCategoryIconName: (cat: string, type: 'income' | 'expense') => string;
  onAddCategory: (type: 'income' | 'expense') => void;
  onEditCategory: (cat: any) => void;
  onReorderCategory: (type: 'income' | 'expense', fromIdx: number, toIdx: number) => void;
  onMoveCategory: (type: 'income' | 'expense', fromIdx: number, direction: 'up' | 'down') => void;
  trangAccountBalance?: number;
  bankReceipts?: any[];
  manualTransactions?: any[];
  onEditTrangBalance: () => void;
}

export const FlowCategoryGrid: React.FC<FlowCategoryGridProps> = ({
  currentUser,
  incomeCats,
  expenseCats,
  categoryBudgets,
  chartSelectedMonths,
  getCategoryActual,
  getCategoryIconName,
  onAddCategory,
  onEditCategory,
  onReorderCategory,
  onMoveCategory,
  trangAccountBalance,
  bankReceipts,
  manualTransactions,
  onEditTrangBalance,
}) => {
  const categoryColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'reorder',
      header: 'Thứ Tự',
      size: 80,
      enableResizing: false,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const item = row.original;
        const totalCount = item.totalCount || 0;
        return (
          <div className="flex items-center gap-1 justify-center select-none" onClick={(e) => e.stopPropagation()}>
            <span className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-1" title="Kéo thả dòng để đổi thứ tự">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <button
              type="button"
              disabled={item.idx === 0}
              onClick={() => onMoveCategory(item.type, item.idx, 'up')}
              className="p-1 rounded bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
              title="Di chuyển lên"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={item.idx === totalCount - 1}
              onClick={() => onMoveCategory(item.type, item.idx, 'down')}
              className="p-1 rounded bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
              title="Di chuyển xuống"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    },
    {
      id: 'category_info',
      header: 'Danh Mục & Biểu Tượng',
      accessorKey: 'name',
      cell: ({ row }) => {
        const item = row.original;
        const isIncome = item.type === 'income';
        return (
          <div className="flex items-center gap-3 text-left">
            <span className={`inline-flex p-2.5 rounded-full border shrink-0 transition-all ${
              isIncome 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                : 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
            }`}>
              <CategoryIcon iconName={item.iconName} className="h-4 w-4" />
            </span>
            <div className="flex flex-col justify-center text-left min-w-0">
              <span className={`font-black text-xs truncate ${isIncome ? 'text-emerald-400 text-glow-green' : 'text-red-500 text-glow-red'}`}>
                {item.name}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      id: 'amount_info',
      header: 'Số Tiền / Hạn Mức',
      accessorKey: 'actual',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col justify-center text-left sm:text-center">
            <span className="text-xs font-black text-white leading-none">
              {formatVND(item.actual)}
            </span>
            <span className="text-[10px] font-bold text-slate-400 leading-none mt-1">
              / {formatVND(item.budgetVal)}
            </span>
          </div>
        );
      }
    },
    {
      id: 'progress',
      header: 'Tiến Độ & Hạn Mức',
      accessorKey: 'pct',
      cell: ({ row }) => {
        const item = row.original;
        const isIncome = item.type === 'income';
        return (
          <div className="flex items-center gap-2.5 w-full px-1 min-w-[140px]">
            <span className="text-[10px] font-black text-slate-300 w-8 shrink-0 text-right">{item.pct}%</span>
            <div className="h-2.5 bg-[#080c18] rounded-full w-full relative overflow-visible border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
              <div
                className={`h-full rounded-full transition-all duration-300 relative ${item.barGradientClass}`}
                style={{
                  width: `${item.pct}%`,
                  boxShadow: `0 0 12px ${item.glowColor}, 0 0 4px ${item.glowColor}`
                }}
              />
            </div>
            {item.rawPct > 100 && (
              <span className={`${isIncome ? 'text-emerald-400' : 'text-rose-500'} text-[9px] font-black uppercase shrink-0`}>Vượt!</span>
            )}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Thao Tác',
      size: 80,
      enableResizing: false,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <button
            type="button"
            onClick={() => onEditCategory({ 
              type: item.type, 
              index: item.idx, 
              name: item.name, 
              icon: item.iconName, 
              note: item.noteText,
              budget: item.budgetVal,
              keywords: item.keywords || ''
            })}
            className="h-7.5 w-7.5 bg-white/[0.04] border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/15 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm cursor-pointer mx-auto"
            title="Chỉnh sửa danh mục"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        );
      }
    }
  ], [onEditCategory, onMoveCategory]);

  const renderCategoryTable = (type: 'income' | 'expense') => {
    const isIncome = type === 'income';
    const cats = isIncome ? incomeCats : expenseCats;

    const rows = cats.map((catItem, idx) => {
      const cat = catItem.name;
      const budgetVal = (categoryBudgets[cat] || 0) * chartSelectedMonths.length;
      const actual = getCategoryActual(cat, !isIncome);
      const rawPct = budgetVal > 0 ? Math.round((actual / budgetVal) * 100) : 0;
      const pct = Math.min(100, rawPct);
      const isAchieved = isIncome && budgetVal > 0 && rawPct >= 100;
      const isOver = !isIncome && budgetVal > 0 && rawPct >= 100;

      let barGradientClass = '';
      let glowColor = '';
      if (isIncome) {
        if (rawPct <= 40) {
          barGradientClass = 'bg-gradient-to-r from-rose-500 to-red-400';
          glowColor = '#f43f5e';
        } else if (rawPct <= 90) {
          barGradientClass = 'bg-gradient-to-r from-amber-500 to-yellow-400';
          glowColor = '#f59e0b';
        } else {
          barGradientClass = 'bg-gradient-to-r from-emerald-500 to-teal-400';
          glowColor = '#10b981';
        }
      } else {
        if (rawPct <= 40) {
          barGradientClass = 'bg-gradient-to-r from-blue-500 to-cyan-400';
          glowColor = '#06b6d4';
        } else if (rawPct <= 90) {
          barGradientClass = 'bg-gradient-to-r from-amber-500 to-yellow-400';
          glowColor = '#f59e0b';
        } else {
          barGradientClass = 'bg-gradient-to-r from-rose-500 to-pink-400';
          glowColor = '#f43f5e';
        }
      }

      const iconName = getCategoryIconName(cat, type);
      const noteText = catItem.note || (isIncome ? 'Thu nhập khác' : 'Chi phí khác');

      return {
        idx,
        totalCount: cats.length,
        name: cat,
        type,
        iconName,
        noteText,
        actual,
        budgetVal,
        rawPct,
        pct,
        barGradientClass,
        glowColor,
        keywords: catItem.keywords || '',
        isAchieved,
        isOver
      };
    });

    return (
      <div className="space-y-4">
        <DataTable
          tableId={`flow_${type}_categories`}
          userId={currentUser.id}
          data={rows}
          columns={categoryColumns}
          pageSize={20}
          enableRowReorder={true}
          onRowReorder={(fromIdx, toIdx) => onReorderCategory(type, fromIdx, toIdx)}
          exportFilename={`danh_sach_loai_${type}`}
          searchPlaceholder={`Tìm loại ${isIncome ? 'thu nhập' : 'chi tiêu'}...`}
          toolbarRight={
            <button
              type="button"
              onClick={() => onAddCategory(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                isIncome
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm</span>
            </button>
          }
          emptyMessage={`Chưa có loại ${isIncome ? 'thu nhập' : 'chi tiêu'} nào.`}
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Left Column: Income budget block + Trang Account */}
      <div className="space-y-6">
        <div className="calendar-container-depth p-5 bg-[#06080e] rounded-3xl space-y-4 border-2 border-transparent [background:linear-gradient(#06080e,#06080e)_padding-box,linear-gradient(135deg,#10b981,#34d399,#059669)_border-box] shadow-[0_0_25px_rgba(16,185,129,0.35)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg shadow-[0_0_8px_rgba(16,185,129,0.35)] shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-black text-emerald-400 text-glow-green uppercase tracking-wider">Loại thu nhập</h3>
            </div>
            <button
              type="button"
              onClick={() => onAddCategory('income')}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:scale-[1.02]"
              title="Thêm danh mục thu nhập mới"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm</span>
            </button>
          </div>
          {renderCategoryTable('income')}
        </div>

        {/* Trang Account Balance Section */}
        <TrangAccountCard
          trangAccountBalance={trangAccountBalance}
          bankReceipts={bankReceipts}
          manualTransactions={manualTransactions}
          chartSelectedMonths={chartSelectedMonths}
          onEditBalance={onEditTrangBalance}
        />
      </div>

      {/* Right Column: Expense budget block */}
      <div className="calendar-container-depth p-5 bg-[#06080e] rounded-3xl space-y-4 border-2 border-transparent [background:linear-gradient(#06080e,#06080e)_padding-box,linear-gradient(135deg,#f43f5e,#fb7185,#e11d48)_border-box] shadow-[0_0_25px_rgba(244,63,94,0.35)]">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg shadow-[0_0_8px_rgba(239,68,68,0.35)] shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
            <h3 className="text-[15px] font-black text-red-500 text-glow-red uppercase tracking-wider">Loại chi tiêu</h3>
          </div>
          <button
            type="button"
            onClick={() => onAddCategory('expense')}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:scale-[1.02]"
            title="Thêm danh mục chi tiêu mới"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm</span>
          </button>
        </div>
        {renderCategoryTable('expense')}
      </div>
    </div>
  );
};

export default FlowCategoryGrid;
