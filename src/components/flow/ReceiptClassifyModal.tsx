import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';
import { formatVND, isHungTrangVcbTransfer, formatDateTimeVN } from '@/lib/utils';
import MaterialSymbol from '@/components/MaterialSymbol';
import CustomSelect from '@/components/CustomSelect';
import { useToast } from '@/context/ToastContext';
import { isDefaultTransferDetails } from './flow-constants';

interface ReceiptClassifyModalProps {
  isOpen: boolean;
  receipt: any;
  onClose: () => void;
  incomeCats: Array<{ name: string; note?: string }>;
  expenseCats: Array<{ name: string; note?: string }>;
  onClassify: (
    receiptId: string,
    type: 'income' | 'expense' | 'saving' | 'exchange',
    category: string,
    createRule: boolean,
    matchField: string,
    matchValue: string,
    note?: string
  ) => Promise<void> | void;
  onUnclassify?: (receiptId: string) => Promise<void> | void;
}

export const ReceiptClassifyModal: React.FC<ReceiptClassifyModalProps> = ({
  isOpen,
  receipt,
  onClose,
  incomeCats,
  expenseCats,
  onClassify,
  onUnclassify,
}) => {
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'saving' | 'exchange'>('expense');
  const [selectedCat, setSelectedCat] = useState<string>('Ăn uống');
  const [createRule, setCreateRule] = useState<boolean>(false);
  const [matchField, setMatchField] = useState<'credit_account' | 'sender_name' | 'remitter_name' | 'details' | 'remitter_beneficiary_details'>('details');
  const [matchValue, setMatchValue] = useState<string>('');
  const [receiptNote, setReceiptNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (receipt) {
      const isInternal = isHungTrangVcbTransfer(receipt);
      const initialType: 'income' | 'expense' | 'saving' | 'exchange' = 
        receipt.type || (isInternal ? 'exchange' : 'expense');
      
      setSelectedType(initialType);
      
      if (receipt.category) {
        setSelectedCat(receipt.category);
      } else if (initialType === 'exchange') {
        setSelectedCat('Trao đổi');
      } else if (initialType === 'income') {
        setSelectedCat(incomeCats[0]?.name || 'Lương');
      } else if (initialType === 'saving') {
        setSelectedCat('Tiết kiệm khẩn cấp');
      } else {
        setSelectedCat(expenseCats[0]?.name || 'Ăn uống');
      }

      setReceiptNote(receipt.note || '');
      setCreateRule(false);

      if (isInternal) {
        setMatchField('remitter_beneficiary_details');
        setMatchValue(receipt.details || '');
      } else if (receipt.details) {
        setMatchField('details');
        setMatchValue(receipt.details);
      } else if (receipt.credit_account) {
        setMatchField('credit_account');
        setMatchValue(receipt.credit_account);
      } else {
        setMatchField('sender_name');
        setMatchValue(receipt.sender_name || receipt.remitter_name || '');
      }
    }
  }, [receipt, incomeCats, expenseCats]);

  if (!isOpen || !receipt) return null;

  return createPortal(
    <div className="fixed inset-0 bg-[#070911]/96 z-[99999] flex items-center justify-center p-4 text-slate-100">
      <div className="bg-[#0f1320] border border-amber-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-mac-dropdown">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-sm font-black text-amber-400 tracking-wider uppercase mb-1">
          Phân Loại Biên Lai Ngân Hàng
        </h3>
        <p className="text-xs text-slate-400 font-semibold mb-4">
          {(receipt.sender_name || receipt.remitter_name || (receipt.debit_account?.includes('9981397845') ? 'PHAM THI THU TRANG' : 'BUI DUC HUNG'))} ➔ {receipt.beneficiary_name || 'Vietcombank'}
        </p>

        <div className="bg-[#090b10] p-3 rounded-xl border border-white/5 space-y-1 mb-4 text-xs font-semibold">
          <div className="flex justify-between">
            <span className="text-slate-400">Số tiền:</span>
            <span className="text-amber-400 font-black">{formatVND(receipt.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Nội dung:</span>
            <span className="text-slate-200 truncate max-w-[200px]">{receipt.details}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mã lệnh GD:</span>
            <span className="text-slate-300">{receipt.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Thời gian GD:</span>
            <span className="text-amber-300 font-bold">{formatDateTimeVN(receipt.trans_date)}</span>
          </div>
        </div>

        <div className="space-y-4 text-left">
          {isHungTrangVcbTransfer(receipt) && (
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/25 rounded-xl flex items-center gap-2 text-xs text-cyan-300 font-semibold">
              <MaterialSymbol icon="sync_alt" size={16} />
              <span>Giao dịch lưu thông tiền nội bộ giữa Bùi Đức Hùng VCB và Phạm Thị Thu Trang VCB.</span>
            </div>
          )}

          {/* Type selection with 4-way animated sliding tab toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Loại Giao Dịch</label>
            <div className="relative flex bg-[#0d1018] p-1 rounded-xl border border-white/10 text-xs shrink-0 font-bold select-none w-full">
              <div
                className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${
                  selectedType === 'expense'
                    ? 'bg-rose-500 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                    : selectedType === 'income'
                    ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                    : selectedType === 'saving'
                    ? 'bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.4)]'
                    : 'bg-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.4)]'
                }`}
                style={{
                  left: `calc( (100% / 4) * ${selectedType === 'expense' ? 0 : selectedType === 'income' ? 1 : selectedType === 'saving' ? 2 : 3} + 1px )`,
                  width: 'calc( (100% / 4) - 2px )',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedType('expense');
                  if (!expenseCats.some(c => c.name === selectedCat)) {
                    setSelectedCat(expenseCats[0]?.name || 'Ăn uống');
                  }
                }}
                className={`flex-1 relative z-10 py-1.5 text-center text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors cursor-pointer ${
                  selectedType === 'expense' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('income');
                  if (!incomeCats.some(c => c.name === selectedCat)) {
                    setSelectedCat(incomeCats[0]?.name || 'Lương');
                  }
                }}
                className={`flex-1 relative z-10 py-1.5 text-center text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors cursor-pointer ${
                  selectedType === 'income' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Thu nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('saving');
                  setSelectedCat('Tiết kiệm khẩn cấp');
                }}
                className={`flex-1 relative z-10 py-1.5 text-center text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors cursor-pointer ${
                  selectedType === 'saving' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tiết kiệm
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('exchange');
                  setSelectedCat('Trao đổi');
                }}
                className={`flex-1 relative z-10 py-1.5 text-center text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors cursor-pointer ${
                  selectedType === 'exchange' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Trao đổi
              </button>
            </div>
          </div>

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Chọn Danh Mục</label>
            {selectedType === 'exchange' ? (
              <div className="w-full bg-[#0d1018] border border-cyan-500/30 text-xs font-bold text-cyan-300 rounded-xl px-3.5 py-2.5">
                Trao đổi (Lưu thông nội bộ)
              </div>
            ) : (
              <CustomSelect
                value={selectedCat}
                onChange={(val) => setSelectedCat(val)}
                options={
                  selectedType === 'saving'
                    ? [
                        { value: 'Tiết kiệm khẩn cấp', label: 'Tiết kiệm khẩn cấp' },
                        { value: 'Tích lũy dài hạn', label: 'Tích lũy dài hạn' },
                        { value: 'Tiết kiệm khác', label: 'Tiết kiệm khác' },
                      ]
                    : selectedType === 'income'
                    ? incomeCats.map(cat => ({
                        value: cat.name,
                        label: cat.note ? `${cat.name} (${cat.note})` : cat.name,
                      }))
                    : expenseCats.map(cat => ({
                        value: cat.name,
                        label: cat.note ? `${cat.name} (${cat.note})` : cat.name,
                      }))
                }
                placeholder="Chọn danh mục"
              />
            )}
            {selectedType === 'exchange' && (
              <p className="text-[10px] text-cyan-400/90 font-medium mt-1">
                Giao dịch loại Trao đổi không tính vào Tổng Thu nhập hay Tổng Chi tiêu.
              </p>
            )}
          </div>

          {/* Note input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Ghi chú (Note)</label>
            <input
              type="text"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              placeholder="Nhập ghi chú thêm cho giao dịch (tùy chọn)..."
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-semibold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Auto-classification Rule Settings */}
          <div className="p-3 bg-[#090b10] rounded-xl border border-amber-500/20 space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkCreateRule"
                checked={createRule}
                onChange={(e) => setCreateRule(e.target.checked)}
                className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
              />
              <label htmlFor="chkCreateRule" className="text-xs font-bold text-amber-300 cursor-pointer select-none">
                Tự động phân loại biên lai tương tự sau này
              </label>
            </div>

            {createRule && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase">Khớp theo trường</label>
                  <CustomSelect
                    value={matchField}
                    onChange={(val) => {
                      const f = val as any;
                      setMatchField(f);
                      if (f === 'credit_account') setMatchValue(receipt.credit_account || '');
                      else if (f === 'details' || f === 'remitter_beneficiary_details') setMatchValue(receipt.details || '');
                      else if (f === 'remitter_name') setMatchValue(receipt.remitter_name || '');
                    }}
                    options={[
                      { value: 'credit_account', label: 'Số tài khoản nhận (Credit Account Number)' },
                      { value: 'sender_name', label: 'Tên / STK Người gửi (Sender Name)' },
                      { value: 'remitter_beneficiary_details', label: 'BÙI ĐỨC HÙNG ➔ PHẠM THỊ THU TRANG (Khớp theo Nội dung)' },
                      { value: 'details', label: 'Nội dung chuyển tiền (Details of Payment)' },
                    ]}
                    placeholder="Chọn trường khớp"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase">Từ khóa nhận diện</label>
                  <input
                    type="text"
                    value={matchValue}
                    onChange={(e) => setMatchValue(e.target.value)}
                    placeholder="Nhập từ khóa khớp..."
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-semibold text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-2">
            {(receipt.status === 'classified' || receipt.category) && onUnclassify && (
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  if (onUnclassify && receipt) {
                    setIsSaving(true);
                    await onUnclassify(receipt.id);
                    setIsSaving(false);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Bỏ phân loại</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                if (onClassify && receipt) {
                  setIsSaving(true);
                  const isDefaultMatch = (matchField === 'details' || matchField === 'remitter_beneficiary_details') && isDefaultTransferDetails(matchValue);
                  const willCreateRule = createRule && !isDefaultMatch;

                  if (createRule && isDefaultMatch) {
                    showToast('Không tạo quy tắc tự động cho nội dung mặc định!', 'info');
                  }

                  await onClassify(
                    receipt.id,
                    selectedType,
                    selectedCat,
                    willCreateRule,
                    matchField,
                    matchValue,
                    receiptNote
                  );
                  setIsSaving(false);
                  onClose();
                }
              }}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu & Phân loại'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReceiptClassifyModal;
