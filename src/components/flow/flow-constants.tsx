import React from 'react';
import {
  HelpCircle, TrendingUp, TrendingDown, Coins, Utensils, Car, ShoppingBag, Receipt, Film, Briefcase,
  GraduationCap, Fuel, ShoppingBasket, Gamepad2, Zap, Coffee, HeartPulse, Home, Shirt, Plane,
  PiggyBank, ArrowLeftRight, ShieldCheck, Flame, Store, Laptop, Music, Smartphone, Landmark,
  BookOpen, Stethoscope, Gift, Sparkles, DollarSign, Wallet, Calendar as CalendarIcon,
  Cpu, Wrench, CreditCard, Package, Percent, Users, CalendarX, SlidersHorizontal
} from 'lucide-react';
import { Session } from '@/lib/utils';
import MaterialSymbol from '@/components/MaterialSymbol';

export interface FlowTabProps {
  currentUser: {
    id: string;
  };
  manualTransactions: any[];
  sessions: Session[];
  categoryBudgets: Record<string, number>;
  categoryTypes?: Record<string, 'income' | 'expense'>;
  categoryIcons?: Record<string, string>;
  categoryNotes?: Record<string, string>;
  categoryKeywords?: Record<string, string>;
  chartSelectedMonths: string[];
  bankReceipts?: any[];
  getActualCategoryAmount: (cat: string) => number;
  handleDeleteManualTx: (id: string) => void;
  handleOpenTxModal: (type: 'income' | 'expense' | 'saving' | 'exchange') => void;
  saveBudgets: (
    userId: string, 
    budgets: Record<string, number>, 
    keywords?: Record<string, string>, 
    catTypes?: Record<string, 'income' | 'expense'>,
    catIcons?: Record<string, string>,
    catNotes?: Record<string, string>
  ) => void;
  saveTransactions?: (userId: string, data: any[]) => void;
  toggleChartMonth?: (mStr: string) => void;
  handleClassifyReceipt?: (receiptId: string, type: 'income' | 'expense' | 'saving' | 'exchange', category: string, createRule: boolean, matchField: string, matchValue: string, note?: string) => void | Promise<void>;
  handleUnclassifyReceipt?: (receiptId: string) => void | Promise<void>;
  handleSyncReceipts?: () => Promise<void>;
  trangAccountBalance?: number;
  saveTrangAccountBalance?: (val: number) => void;
}

export const cleanString = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
};

export const matchKeyword = (cleanDetails: string, kw: string): boolean => {
  const cleanedKw = cleanString(kw);
  const cleanedText = cleanString(cleanDetails);
  if (!cleanedKw || !cleanedText) return false;

  const trimmedText = cleanedText.replace(/[\s,._:;-]+$/, '');
  const escapedKw = cleanedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[\\s,._:;-])${escapedKw}[\\s,._:;-]*$`, 'm');

  return regex.test(trimmedText);
};

export const isDefaultTransferDetails = (text: string): boolean => {
  const clean = cleanString(text);
  if (!clean) return true;

  const defaultPattern = /^(?:[a-z0-9]+\s+)*(?:chuyen\s*tien|chuyen\s*khoang|chuyen\s*tk|thanh\s*toan)(?:\s+[a-z0-9]+)*$/i;
  
  if (defaultPattern.test(clean)) {
    const stripped = clean
      .replace(/\b(?:chuyen\s*tien|chuyen\s*khoang|chuyen\s*tk|thanh\s*toan|chuyen|tien|khoang|tk)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const nameWords = new Set([
      'bui', 'duc', 'hung', 'pham', 'thi', 'thu', 'trang', 'nguyen', 'van', 'a', 'b', 'c',
      'tran', 'le', 'hoang', 'vo', 'dang', 'do', 'ngo', 'duong', 'ly', 'vu', 'dinh', 'tuan'
    ]);

    const remainingWords = stripped.split(' ').filter(Boolean);
    const hasNonNameWord = remainingWords.some(w => !nameWords.has(w));
    
    if (!hasNonNameWord) {
      return true;
    }
  }
  
  return false;
};

// Curated high-performance icon map for tree-shakeable, instant SVG rendering
export const ICON_COMPONENT_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  utensils: Utensils,
  food: Utensils,
  coffee: Coffee,
  car: Car,
  fuel: Fuel,
  xang: Fuel,
  shoppingbag: ShoppingBag,
  shirt: Shirt,
  shoppingbasket: ShoppingBasket,
  store: Store,
  receipt: Receipt,
  bill: Receipt,
  zap: Zap,
  film: Film,
  gamepad2: Gamepad2,
  coins: Coins,
  briefcase: Briefcase,
  salary: Briefcase,
  graduationcap: GraduationCap,
  education: GraduationCap,
  trendingup: TrendingUp,
  trendingdown: TrendingDown,
  piggybank: PiggyBank,
  savings: PiggyBank,
  arrowleftright: ArrowLeftRight,
  exchange: ArrowLeftRight,
  heartpulse: HeartPulse,
  health: HeartPulse,
  home: Home,
  plane: Plane,
  travel: Plane,
  shieldcheck: ShieldCheck,
  flame: Flame,
  laptop: Laptop,
  music: Music,
  smartphone: Smartphone,
  landmark: Landmark,
  bookopen: BookOpen,
  stethoscope: Stethoscope,
  gift: Gift,
  sparkles: Sparkles,
  dollarsign: DollarSign,
  wallet: Wallet,
  calendar: CalendarIcon,
  helpcircle: HelpCircle,
  cpu: Cpu,
  wrench: Wrench,
  creditcard: CreditCard,
  package: Package,
  percent: Percent,
  users: Users,
  calendarx: CalendarX,
  slidershorizontal: SlidersHorizontal,
  house: Home
};

export const CategoryIcon = React.memo(({ iconName, className }: { iconName: string, className?: string }) => {
  if (!iconName) return <HelpCircle className={className} />;
  
  const key = iconName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const Component = ICON_COMPONENT_MAP[key];
  if (Component) {
    return <Component className={className} />;
  }

  // Fallback to Material Symbol
  return <MaterialSymbol icon={iconName} className={className} size={16} />;
});
CategoryIcon.displayName = 'CategoryIcon';

export const CATEGORY_VIBRANT_PALETTE = [
  '#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#06b6d4', 
  '#f43f5e', '#14b8a6', '#a855f7', '#f97316', '#eab308', '#84cc16', 
  '#6366f1', '#d946ef', '#0284c7', '#fb7185', '#2dd4bf', '#c084fc', 
  '#fbbf24', '#38bdf8', '#fb923c', '#a3e635', '#e879f9', '#64748b'
];

export function getCategoryPaletteColor(catName: string, catIndex: number, type: 'income' | 'expense' = 'expense'): string {
  const knownMap: Record<string, string> = {
    'Lương': '#10b981',
    'Giáo dục': '#06b6d4',
    'Đầu tư': '#8b5cf6',
    'Ăn uống': '#f59e0b',
    'Di chuyển': '#3b82f6',
    'Shopping': '#ec4899',
    'Hóa đơn': '#a855f7',
    'Giải trí': '#f43f5e'
  };
  if (knownMap[catName]) return knownMap[catName];
  const offset = type === 'income' ? 0 : 3;
  const idx = (catIndex + offset) % CATEGORY_VIBRANT_PALETTE.length;
  return CATEGORY_VIBRANT_PALETTE[idx];
}

export const formatAbbreviatedVND = (value: number): string => {
  if (value === 0) return '0';
  const isNegative = value < 0;
  const absVal = Math.abs(value);
  
  let result = '';
  if (absVal >= 1000000) {
    const mil = Math.floor(absVal / 1000000);
    const rem = absVal % 1000000;
    if (rem === 0) {
      result = `${mil}M`;
    } else {
      const cents = Math.round(rem / 10000);
      if (cents === 0) {
        result = `${mil}M`;
      } else {
        const centsStr = cents < 10 ? `0${cents}` : `${cents}`;
        const trimmedCents = centsStr.replace(/0+$/, '');
        result = `${mil}M${trimmedCents}`;
      }
    }
  } else if (absVal >= 1000) {
    const k = Math.floor(absVal / 1000);
    const rem = absVal % 1000;
    if (rem === 0) {
      result = `${k}K`;
    } else {
      const cents = Math.round(rem / 10);
      if (cents === 0) {
        result = `${k}K`;
      } else {
        const centsStr = cents < 10 ? `0${cents}` : `${cents}`;
        const trimmedCents = centsStr.replace(/0+$/, '');
        result = `${k}K${trimmedCents}`;
      }
    }
  } else {
    result = `${absVal}`;
  }
  
  return isNegative ? `-${result}` : result;
};

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  'Lương': 'Briefcase',
  'Giáo dục': 'GraduationCap',
  'Đầu tư': 'TrendingUp',
  'Gia Sư': 'GraduationCap',
  'Thu Nợ': 'Receipt',
  'Ăn uống': 'Utensils',
  'Di chuyển': 'Car',
  'Xăng': 'Fuel',
  'Đi Chợ': 'ShoppingBasket',
  'Shopping': 'ShoppingBag',
  'Quần Áo': 'Shirt',
  'Mỹ Phẩm': 'Sparkles',
  'Làm Mặt': 'Sparkles',
  'Hóa đơn': 'Receipt',
  'Hóa Đơn': 'Receipt',
  'Photo': 'BookOpen',
  'Giải trí': 'Film',
  'Giải Trí': 'Film',
  'Công Nghệ': 'Cpu',
  'Gia Đình': 'Home',
  'Bảo Dưỡng Xe': 'Wrench',
  'Trả Nợ': 'CreditCard',
  'Nhu Yếu Phẩm': 'ShoppingBag',
  'Đăng Ký Gói': 'Package',
  'Sai Số': 'Percent',
  'Chỉnh Sửa Sai Số': 'Percent',
  'Trao đổi': 'ArrowLeftRight',
  'Tiết kiệm': 'PiggyBank',
  'Tiết kiệm khẩn cấp': 'ShieldCheck',
  'Tích lũy dài hạn': 'PiggyBank',
  'Sức khỏe': 'HeartPulse',
  'Nhà cửa': 'Home',
  'Cà phê': 'Coffee',
  'Du lịch': 'Plane',
  'Khác': 'Coins'
};

export const DEFAULT_CATEGORY_NOTES: Record<string, string> = {
  'Lương': 'Thu nhập cố định hàng tháng',
  'Giáo dục': 'Giảng dạy, chấm công',
  'Đầu tư': 'Cổ tức, lợi nhuận',
  'Gia Sư': 'Học phí gia sư',
  'Ăn uống': 'Nhà hàng, quán ăn, thực phẩm',
  'Di chuyển': 'Xe cộ, xăng, bảo dưỡng',
  'Shopping': 'Mua sắm cá nhân, đồ dùng',
  'Hóa đơn': 'Điện, nước, internet, dịch vụ',
  'Giải trí': 'Xem phim, du lịch, cafe',
  'Trao đổi': 'Giao dịch qua lại, không tính thu chi',
  'Tiết kiệm': 'Tích lũy tài sản cá nhân',
  'Tiết kiệm khẩn cấp': 'Quỹ dự phòng phát sinh',
  'Tích lũy dài hạn': 'Đầu tư và tích sản lâu dài'
};
