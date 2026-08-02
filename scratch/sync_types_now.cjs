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

async function syncTypesNow() {
  console.log('=== Updating Supabase Table "type", "icon", "note" Columns ===');
  const { data: rows, error } = await supabase.from('category_budgets').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  const defaultTypes = {
    'Lương': 'income',
    'Giáo dục': 'income',
    'Đầu tư': 'income',
    'Gia Sư': 'income',
    'Ăn uống': 'expense',
    'Di chuyển': 'expense',
    'Shopping': 'expense',
    'Hóa đơn': 'expense',
    'Giải trí': 'expense',
    'Xăng': 'expense',
    'Đi Chợ': 'expense',
    'Khác': 'expense'
  };

  const defaultIcons = {
    'Lương': 'Briefcase',
    'Giáo dục': 'GraduationCap',
    'Đầu tư': 'TrendingUp',
    'Ăn uống': 'Utensils',
    'Xăng': 'Car',
    'Đi Chợ': 'ShoppingBag'
  };

  const defaultNotes = {
    'Lương': 'Thu nhập cố định hàng tháng',
    'Giáo dục': 'Giảng dạy, chấm công',
    'Đầu tư': 'Cổ tức, lợi nhuận',
    'Ăn uống': 'Nhà hàng, siêu thị, thực phẩm',
    'Xăng': 'Nhiên liệu đi lại',
    'Đi Chợ': 'Thực phẩm, chợ tươi'
  };

  const updatedRecords = [];

  for (const r of rows) {
    let type = defaultTypes[r.category] || 'expense';
    let icon = defaultIcons[r.category] || (type === 'income' ? 'TrendingUp' : 'Coins');
    let note = defaultNotes[r.category] || (type === 'income' ? 'Thu nhập khác' : 'Chi phí khác');
    let kw = '';

    if (r.keywords && typeof r.keywords === 'string' && r.keywords.startsWith('{')) {
      try {
        const parsed = JSON.parse(r.keywords);
        if (parsed.type) type = parsed.type;
        if (parsed.icon) icon = parsed.icon;
        if (parsed.note) note = parsed.note;
        if (parsed.kw !== undefined) kw = parsed.kw;
      } catch (e) {}
    } else if (r.keywords && typeof r.keywords === 'string') {
      kw = r.keywords;
    }

    const metaStr = JSON.stringify({ type, kw, icon, note });

    updatedRecords.push({
      ...r,
      type: type,
      icon: icon,
      note: note,
      keywords: metaStr,
      updated_at: new Date().toISOString()
    });
  }

  const { data: upsertData, error: upErr } = await supabase.from('category_budgets').upsert(updatedRecords, { onConflict: 'id' }).select('*');
  if (upErr) {
    console.error('Upsert error:', upErr);
  } else {
    console.log('✅ Successfully updated Supabase table rows:');
    upsertData.forEach(d => {
      console.log(`- "${d.category}": type=${d.type}, icon=${d.icon}, note=${d.note}`);
    });
  }
}

syncTypesNow().catch(console.error);
