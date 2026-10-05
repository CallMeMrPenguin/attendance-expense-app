import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { formatNumberDots, parseNumberDots } from '@/lib/utils';
import { CategoryIcon } from './flow-constants';
import IconPickerPopover from './IconPickerPopover';

interface AddCategoryModalProps {
  isOpen: boolean;
  type: 'income' | 'expense' | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: 'income' | 'expense';
    budget: number;
    keywords: string;
    icon: string;
    note: string;
  }) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  type,
  onClose,
  onSubmit,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [newCatNote, setNewCatNote] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  if (!isOpen || !type) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cleanBudget = parseNumberDots(newCatBudget) || 0;
    onSubmit({
      name: newCatName.trim(),
      type,
      budget: cleanBudget,
      keywords: newCatKeywords.trim(),
      icon: newCatIcon.trim(),
      note: newCatNote.trim(),
    });
    setNewCatName('');
    setNewCatBudget('');
    setNewCatKeywords('');
    setNewCatIcon('');
    setNewCatNote('');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-[#070911]/96 z-[99999] flex items-center justify-center p-4 text-slate-100">
      <div className="bg-[#0f1320] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-mac-dropdown">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">
          Thêm Danh Mục {type === 'income' ? 'Thu Nhập' : 'Chi Tiêu'} Mới
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên danh mục mới *</label>
            <input
              type="text"
              placeholder="Ví dụ: Thưởng dự án, Tiền điện..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mô tả ngắn / Note</label>
            <input
              type="text"
              placeholder="Mô tả phụ hiển thị bên dưới..."
              value={newCatNote}
              onChange={(e) => setNewCatNote(e.target.value)}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              {type === 'income' ? 'Mục tiêu tháng (VND)' : 'Hạn mức ngân sách tháng (VND)'}
            </label>
            <input
              type="text"
              placeholder="0"
              value={newCatBudget}
              onChange={(e) => setNewCatBudget(formatNumberDots(parseNumberDots(e.target.value)))}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Từ khóa nhận diện (Phân cách bởi dấu phẩy)</label>
            <input
              type="text"
              placeholder="Ví dụ: xang, grab, an uong, food..."
              value={newCatKeywords}
              onChange={(e) => setNewCatKeywords(e.target.value)}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Icon đại diện</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                <span>Mở bảng chọn icon</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhập tên icon hoặc chọn từ bảng..."
                value={newCatIcon || ''}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="h-10 w-10 rounded-xl bg-[#090b10] border border-indigo-500/40 hover:border-indigo-400 flex items-center justify-center text-indigo-400 hover:text-indigo-300 shrink-0 shadow-sm transition-all cursor-pointer group"
                title="Bấm để chọn icon"
              >
                <CategoryIcon iconName={newCatIcon} className="h-5 w-5 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

          {showIconPicker && (
            <IconPickerPopover
              selectedIcon={newCatIcon}
              onSelect={(icon) => setNewCatIcon(icon)}
              onClose={() => setShowIconPicker(false)}
            />
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(92,54,245,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center"
            >
              Tạo Danh Mục
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddCategoryModal;
