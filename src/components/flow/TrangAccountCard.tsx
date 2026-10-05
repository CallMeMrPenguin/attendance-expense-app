import React, { useState, useMemo } from 'react';
import { Wallet, Edit3, ChevronDown } from 'lucide-react';
import { formatVND, formatDateVN } from '@/lib/utils';

interface TrangAccountCardProps {
  trangAccountBalance?: number;
  bankReceipts?: any[];
  manualTransactions?: any[];
  chartSelectedMonths: string[];
  onEditBalance: () => void;
}

export const TrangAccountCard: React.FC<TrangAccountCardProps> = ({
  trangAccountBalance = 0,
  bankReceipts = [],
  manualTransactions = [],
  chartSelectedMonths,
  onEditBalance,
}) => {
  const [showTrangTxList, setShowTrangTxList] = useState(false);

  const { trangTxs, trangSpentAmount, trangCurrentBalance, monthLabel } = useMemo(() => {
    const isTrangTx = (item: any) => {
      const sName = (item.sender_name || item.remitter_name || '').toUpperCase();
      const dAcc = (item.debit_account || '').toString();
      return sName.includes('PHAM THI THU TRANG') || dAcc.includes('9981397845');
    };

    const isReceiptInSelectedMonths = (r: any) => {
      if (!chartSelectedMonths || chartSelectedMonths.length === 0) return true;
      const rDate = r.trans_date || r.created_at || '';
      const rMonth = rDate.substring(0, 7);
      return chartSelectedMonths.includes(rMonth);
    };

    const isTxInSelectedMonths = (t: any) => {
      if (!chartSelectedMonths || chartSelectedMonths.length === 0) return true;
      const tMonth = (t.date || '').substring(0, 7);
      return chartSelectedMonths.includes(tMonth);
    };

    const receiptsTrang = bankReceipts
      .filter(r => r.status === 'classified' && (r.type === 'expense' || !r.type) && isTrangTx(r) && isReceiptInSelectedMonths(r))
      .map(r => ({
        id: r.id,
        desc: r.details,
        amount: Number(r.amount) || 0,
        date: r.trans_date || r.created_at,
        category: r.category || 'Chi tiêu'
      }));

    const manualTrang = manualTransactions
      .filter(t => isTrangTx(t) && t.type === 'expense' && isTxInSelectedMonths(t))
      .map(t => ({
        id: t.id,
        desc: t.desc,
        amount: Number(t.amount) || 0,
        date: t.date,
        category: t.category || 'Chi tiêu'
      }));

    const map = new Map();
    [...manualTrang, ...receiptsTrang].forEach(t => {
      const cleanId = String(t.id).replace('tx-receipt-', '').replace('vcb-', '');
      if (!map.has(cleanId)) map.set(cleanId, t);
    });
    const txs = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const spent = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const balance = trangAccountBalance - spent;

    const label = chartSelectedMonths.length === 1
      ? `Tháng ${chartSelectedMonths[0].split('-')[1]}/${chartSelectedMonths[0].split('-')[0]}`
      : chartSelectedMonths.length > 1
      ? `${chartSelectedMonths.length} tháng`
      : '';

    return {
      trangTxs: txs,
      trangSpentAmount: spent,
      trangCurrentBalance: balance,
      monthLabel: label,
    };
  }, [trangAccountBalance, bankReceipts, manualTransactions, chartSelectedMonths]);

  return (
    <div className="calendar-container-depth p-5 bg-[#06080e] rounded-3xl space-y-4 border-2 border-transparent [background:linear-gradient(#06080e,#06080e)_padding-box,linear-gradient(135deg,#c084fc,#a855f7,#7e22ce)_border-box] shadow-[0_0_25px_rgba(168,85,247,0.35)]">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg shadow-[0_0_8px_rgba(168,85,247,0.35)] shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <h3 className="text-[15px] font-black text-purple-400 text-glow-purple uppercase tracking-wider">Tài Khoản Trang</h3>
          {monthLabel && (
            <span className="text-[11px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-lg">
              {monthLabel}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onEditBalance}
          className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:scale-[1.02]"
          title="Thiết lập hoặc sửa số dư ban đầu của Trang"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Sửa số dư</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-[#0b0e1a] border border-purple-500/20 rounded-2xl flex flex-col justify-center text-left">
          <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider">Số dư ban đầu</span>
          <span className="text-xs font-black text-white mt-1">{formatVND(trangAccountBalance)}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowTrangTxList(prev => !prev)}
          className="p-3 bg-[#0b0e1a] hover:bg-[#101426] border border-rose-500/20 hover:border-rose-500/40 rounded-2xl flex flex-col justify-center text-left transition-all cursor-pointer group select-none"
          title="Bấm để xem hoặc ẩn danh sách giao dịch chi trả của Trang trong tháng này"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">
              Trang đã chi trả ({trangTxs.length})
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-rose-400 transition-transform duration-200 ${showTrangTxList ? 'rotate-180' : ''}`} />
          </div>
          <span className="text-xs font-black text-rose-400 mt-1">-{formatVND(trangSpentAmount)}</span>
        </button>
        <div className="p-3 bg-purple-950/30 border border-purple-400/40 rounded-2xl flex flex-col justify-center text-left shadow-[0_0_15px_rgba(168,85,247,0.25)]">
          <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider text-glow-purple">Số dư hiện tại</span>
          <span className={`text-xs font-black mt-1 ${trangCurrentBalance >= 0 ? 'text-emerald-400 text-glow-green' : 'text-rose-400 text-glow-red'}`}>
            {formatVND(trangCurrentBalance)}
          </span>
        </div>
      </div>

      {showTrangTxList && (
        <div className="mt-2 pt-3 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-300">
              Chi tiết chi trả của Trang {monthLabel ? `(${monthLabel})` : ''}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              Tổng cộng: <span className="text-rose-400 font-black">-{formatVND(trangSpentAmount)}</span>
            </span>
          </div>

          {trangTxs.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 bg-[#0b0e1a] rounded-xl border border-white/5">
              Không có giao dịch chi trả nào của Trang trong {monthLabel || 'thời gian đã chọn'}.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {trangTxs.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 bg-[#0b0e1a] border border-white/5 hover:border-purple-500/30 rounded-xl transition-all"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-xs font-bold text-white truncate">{t.desc || 'Giao dịch chi tiêu'}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{t.date ? formatDateVN(t.date) : ''}</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-purple-300 font-medium">{t.category}</span>
                    </div>
                  </div>
                  <div className="text-xs font-black text-rose-400 shrink-0">
                    -{formatVND(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrangAccountCard;
