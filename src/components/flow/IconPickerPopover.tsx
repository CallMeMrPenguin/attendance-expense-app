import React, { useState, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { CategoryIcon } from './flow-constants';

interface IconPickerPopoverProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

interface IconGroup {
  title: string;
  icons: { name: string; label: string }[];
}

const CURATED_ICON_GROUPS: IconGroup[] = [
  {
    title: 'Ẩm thực & Đi chợ',
    icons: [
      { name: 'Utensils', label: 'Ăn uống' },
      { name: 'Coffee', label: 'Cà phê' },
      { name: 'ShoppingBasket', label: 'Đi chợ' },
      { name: 'Store', label: 'Tạp hóa' },
    ]
  },
  {
    title: 'Mua sắm & Làm đẹp',
    icons: [
      { name: 'ShoppingBag', label: 'Shopping' },
      { name: 'Shirt', label: 'Quần áo' },
      { name: 'Sparkles', label: 'Mỹ phẩm' },
      { name: 'Flower2', label: 'Làm mặt / Spa' },
      { name: 'Gift', label: 'Quà tặng' },
    ]
  },
  {
    title: 'Di chuyển & Xe cộ',
    icons: [
      { name: 'Fuel', label: 'Xăng dầu' },
      { name: 'Car', label: 'Xe cộ' },
      { name: 'Wrench', label: 'Bảo dưỡng' },
      { name: 'Plane', label: 'Du lịch' },
    ]
  },
  {
    title: 'Hóa đơn & Nhà ở',
    icons: [
      { name: 'Receipt', label: 'Hóa đơn' },
      { name: 'Zap', label: 'Tiền điện' },
      { name: 'Home', label: 'Gia đình' },
      { name: 'Wifi', label: 'Internet' },
      { name: 'Smartphone', label: 'Gói cước / ĐT' },
    ]
  },
  {
    title: 'Công nghệ & In ấn',
    icons: [
      { name: 'Cpu', label: 'Công nghệ' },
      { name: 'Laptop', label: 'Máy tính' },
      { name: 'Printer', label: 'Photo / In ấn' },
      { name: 'BookOpen', label: 'Sách vở' },
    ]
  },
  {
    title: 'Công việc & Học tập',
    icons: [
      { name: 'Briefcase', label: 'Lương' },
      { name: 'GraduationCap', label: 'Gia sư / Học tập' },
      { name: 'Users', label: 'Đội nhóm' },
    ]
  },
  {
    title: 'Tài chính & Tiết kiệm',
    icons: [
      { name: 'Coins', label: 'Khác / Tiền' },
      { name: 'CreditCard', label: 'Trả nợ' },
      { name: 'PiggyBank', label: 'Tiết kiệm' },
      { name: 'ShieldCheck', label: 'Quỹ dự phòng' },
      { name: 'TrendingUp', label: 'Đầu tư' },
      { name: 'Percent', label: 'Sai số' },
      { name: 'ArrowLeftRight', label: 'Trao đổi' },
    ]
  },
  {
    title: 'Giải trí & Sức khỏe',
    icons: [
      { name: 'Film', label: 'Giải trí' },
      { name: 'Gamepad2', label: 'Game' },
      { name: 'Music', label: 'Âm nhạc' },
      { name: 'HeartPulse', label: 'Sức khỏe' },
      { name: 'Stethoscope', label: 'Khám bệnh' },
    ]
  }
];

export const IconPickerPopover: React.FC<IconPickerPopoverProps> = ({
  selectedIcon,
  onSelect,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return CURATED_ICON_GROUPS;
    const term = searchTerm.toLowerCase().trim();

    return CURATED_ICON_GROUPS.map(group => ({
      ...group,
      icons: group.icons.filter(
        i => i.name.toLowerCase().includes(term) || i.label.toLowerCase().includes(term)
      )
    })).filter(group => group.icons.length > 0);
  }, [searchTerm]);

  return (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 animate-mac-backdrop"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#0f1322] border border-[#212c4b] rounded-2xl p-5 shadow-2xl space-y-4 animate-mac-modal text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">Chọn Icon Cho Danh Mục</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Chọn icon đại diện riêng biệt cho từng khoản thu chi</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên icon hoặc chủ đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0d18] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        </div>

        {/* Icons Grid scrollable */}
        <div className="max-h-[340px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Không tìm thấy icon phù hợp. Bạn vẫn có thể gõ trực tiếp tên icon.
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.title} className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {group.title}
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {group.icons.map(icon => {
                    const isSelected = selectedIcon.toLowerCase() === icon.name.toLowerCase();
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => {
                          onSelect(icon.name);
                          onClose();
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                            : 'bg-[#0a0d18] border-white/5 hover:border-white/20 text-slate-300 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="relative mb-1">
                          <CategoryIcon 
                            iconName={icon.name} 
                            className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                              isSelected ? 'text-indigo-400' : 'text-slate-300 group-hover:text-white'
                            }`} 
                          />
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-indigo-500 rounded-full flex items-center justify-center">
                              <Check className="h-2 w-2 text-white" />
                            </span>
                          )}
                        </div>
                        <span className="text-[9.5px] font-bold text-center line-clamp-1">
                          {icon.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default IconPickerPopover;
