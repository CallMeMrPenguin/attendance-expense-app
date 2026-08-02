const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
  }
}

const supabase = createClient(url, key);

const DEFAULT_CATEGORY_ICONS = {
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

const DEFAULT_CATEGORY_NOTES = {
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

const DEFAULT_CATEGORY_KEYWORDS = {
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

async function fixDbDefaults() {
  console.log('=== Updating Supabase DB Category Metadata with Rich Defaults ===');
  const { data: rows, error } = await supabase.from('category_budgets').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  const updatedRecords = [];

  for (const r of rows) {
    let type = ['Lương', 'Giáo dục', 'Đầu tư', 'Gia Sư'].includes(r.category) ? 'income' : 'expense';
    let icon = DEFAULT_CATEGORY_ICONS[r.category] || (type === 'income' ? 'TrendingUp' : 'Coins');
    let note = DEFAULT_CATEGORY_NOTES[r.category] || (type === 'income' ? 'Thu nhập khác' : 'Chi phí khác');
    let kw = DEFAULT_CATEGORY_KEYWORDS[r.category] || '';

    if (r.keywords && typeof r.keywords === 'string' && r.keywords.startsWith('{')) {
      try {
        const parsed = JSON.parse(r.keywords);
        if (parsed.type) type = parsed.type;
        if (parsed.icon && parsed.icon !== 'Coins' && parsed.icon !== 'TrendingUp') {
          icon = parsed.icon;
        }
        if (parsed.note && parsed.note !== 'Thu nhập' && parsed.note !== 'Chi phí') {
          note = parsed.note;
        }
        if (parsed.kw && parsed.kw.trim() !== '') {
          kw = parsed.kw;
        }
      } catch (e) {}
    }

    const metaStr = JSON.stringify({ type, kw, icon, note });
    updatedRecords.push({
      ...r,
      keywords: metaStr,
      updated_at: new Date().toISOString()
    });
  }

  console.log('Records to update:', updatedRecords.length);
  const { data: upsertData, error: upErr } = await supabase.from('category_budgets').upsert(updatedRecords, { onConflict: 'id' }).select('*');
  if (upErr) {
    console.error('Upsert Error:', upErr);
  } else {
    console.log('✅ Successfully updated Supabase database categories:');
    upsertData.forEach(d => {
      console.log(`- "${d.category}": keywords=${d.keywords}`);
    });
  }
}

fixDbDefaults().catch(console.error);
