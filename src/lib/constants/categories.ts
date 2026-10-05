export const cleanString = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
};

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  'Lương': 'Briefcase',
  'Giáo dục': 'GraduationCap',
  'Đầu tư': 'TrendingUp',
  'Gia Sư': 'GraduationCap',
  'Ăn uống': 'Utensils',
  'Di chuyển': 'Car',
  'Shopping': 'ShoppingBag',
  'Hóa đơn': 'Receipt',
  'Giải trí': 'Film',
  'Xăng': 'Car',
  'Đi Chợ': 'ShoppingBag',
  'Khác': 'Coins'
};

export const DEFAULT_CATEGORY_NOTES: Record<string, string> = {
  'Lương': 'Thu nhập cố định hàng tháng',
  'Giáo dục': 'Giảng dạy, chấm công',
  'Đầu tư': 'Cổ tức, lợi nhuận',
  'Gia Sư': 'Học phí gia sư',
  'Ăn uống': 'Nhà hàng, siêu thị, thực phẩm',
  'Di chuyển': 'Xe máy, taxi, xăng xe',
  'Shopping': 'Quần áo, đồ dùng cá nhân',
  'Hóa đơn': 'Điện, nước, internet',
  'Giải trí': 'Xem phim, du lịch, giải trí',
  'Xăng': 'Nhiên liệu đi lại',
  'Đi Chợ': 'Thực phẩm, chợ tươi',
  'Khác': 'Các khoản chi phí khác'
};

export const DEFAULT_CATEGORY_KEYWORDS: Record<string, string> = {
  'Lương': 'luong, salary',
  'Giáo dục': 'day hoc, cham cong, giang day',
  'Đầu tư': 'dau tu, chung khoan, co tuc',
  'Gia Sư': 'gia su, hoc phi',
  'Ăn uống': 'an uong, food, cafe, coffee, nha hang',
  'Di chuyển': 'di chuyen, grab, be, taxi',
  'Shopping': 'shopping, mua sam, shopee, lazada, tiki',
  'Hóa đơn': 'hoa don, dien, nuoc, internet, cuoc',
  'Giải trí': 'giai tri, cgv, cinema, du lich',
  'Xăng': 'xang, cay xang, petrolimex',
  'Đi Chợ': 'di cho, sieu thi, winmart, bach hoa xanh',
  'Khác': 'khac'
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
