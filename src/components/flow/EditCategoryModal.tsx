import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Sparkles } from 'lucide-react';
import { formatNumberDots, parseNumberDots } from '@/lib/utils';
import { CategoryIcon } from './flow-constants';
import IconPickerPopover from './IconPickerPopover';

interface EditCategoryModalProps {
  isOpen: boolean;
  category: any;
  onClose: () => void;
  onSave: (cat: any) => void;
  onDelete: (type: 'income' | 'expense', index: number, name: string) => void;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  category,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editingCat, setEditingCat] = useState<any>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (category) {
      setEditingCat({ ...category });
    }
  }, [category]);

  if (!isOpen || !editingCat) return null;

  return createPortal(
    <div className="fixed inset-0 bg-[#070911]/96 z-[99999] flex items-center justify-center p-4 text-slate-100">
      <div className="bg-[#0f1320] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-mac-dropdown">
        <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">
          Sửa danh mục: {editingCat.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
        </h3>

        <div className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên danh mục</label>
            <input
              type="text"
              value={editingCat.name || ''}
              onChange={(e) => setEditingCat((prev: any) => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mô tả phụ / Note (Hiển thị bên dưới tên)</label>
            <input
              type="text"
              value={editingCat.note || ''}
              onChange={(e) => setEditingCat((prev: any) => prev ? { ...prev, note: e.target.value } : null)}
              placeholder="Ví dụ: Điện, nước, internet..."
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              {editingCat.type === 'income' ? 'Mục tiêu (đ)' : 'Hạn mức (đ)'}
            </label>
            <input
              type="text"
              value={formatNumberDots(editingCat.budget || 0)}
              onChange={(e) => setEditingCat((prev: any) => prev ? { ...prev, budget: parseNumberDots(e.target.value) } : null)}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Từ khóa nhận diện (Phân cách bởi dấu phẩy)</label>
            <input
              type="text"
              value={editingCat.keywords || ''}
              onChange={(e) => setEditingCat((prev: any) => prev ? { ...prev, keywords: e.target.value } : null)}
              placeholder="Ví dụ: xang, grab, an uong, food..."
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
                value={editingCat.icon || ''}
                onChange={(e) => setEditingCat((prev: any) => prev ? { ...prev, icon: e.target.value } : null)}
                className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="h-10 w-10 rounded-xl bg-[#090b10] border border-indigo-500/40 hover:border-indigo-400 flex items-center justify-center text-indigo-400 hover:text-indigo-300 shrink-0 shadow-sm transition-all cursor-pointer group"
                title="Bấm để chọn icon"
              >
                <CategoryIcon iconName={editingCat.icon} className="h-5 w-5 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

          {showIconPicker && (
            <IconPickerPopover
              selectedIcon={editingCat.icon || ''}
              onSelect={(icon) => setEditingCat((prev: any) => prev ? { ...prev, icon } : null)}
              onClose={() => setShowIconPicker(false)}
            />
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onDelete(editingCat.type, editingCat.index, editingCat.name)}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              title="Xóa danh mục này"
            >
              <Trash2 className="h-4 w-4" />
              <span>Xóa</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(editingCat);
                onClose();
              }}
              className="flex-1 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(92,54,245,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center"
            >
              Cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditCategoryModal;
