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

async function syncSeparateCols() {
  console.log('=== Syncing Supabase category_budgets with clean separate columns ===');
  const { data: rows, error } = await supabase.from('category_budgets').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  const defaultMeta = {
    'Lương': { type: 'income', icon: 'Briefcase', note: 'Thu nhập cố định hàng tháng', kw: 'luong, salary' },
    'Giáo dục': { type: 'income', icon: 'GraduationCap', note: 'Giảng dạy, chấm công', kw: 'day hoc, cham cong, giang day' },
    'Đầu tư': { type: 'income', icon: 'TrendingUp', note: 'Cổ tức, lợi nhuận', kw: 'dau tu, chung khoan, co tuc' },
    'Ăn uống': { type: 'expense', icon: 'Utensils', note: 'Nhà hàng, siêu thị, thực phẩm', kw: 'an uong, food, cafe, coffee, nha hang' },
    'Xăng': { type: 'expense', icon: 'Car', note: 'Nhiên liệu đi lại', kw: 'xang, cay xang, petrolimex' },
    'Đi Chợ': { type: 'expense', icon: 'ShoppingBag', note: 'Thực phẩm, chợ tươi', kw: 'di cho, sieu thi, winmart, bach hoa xanh' }
  };

  const updatedRecords = [];

  for (const r of rows) {
    const meta = defaultMeta[r.category] || { type: 'expense', icon: 'Coins', note: 'Chi phí khác', kw: '' };
    
    let type = r.type || meta.type;
    let icon = r.icon || meta.icon;
    let note = r.note || meta.note;
    let kw = meta.kw;

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

    updatedRecords.push({
      ...r,
      type: type,
      icon: icon,
      note: note,
      keywords: kw,
      updated_at: new Date().toISOString()
    });
  }

  const { data: upsertData, error: upErr } = await supabase.from('category_budgets').upsert(updatedRecords, { onConflict: 'id' }).select('*');
  if (upErr) {
    console.error('Upsert error:', upErr);
  } else {
    console.log('✅ Successfully updated Supabase category_budgets rows:');
    upsertData.forEach(d => {
      console.log(`- "${d.category}": type=${d.type}, icon=${d.icon}, note=${d.note}, keywords=${d.keywords}`);
    });
  }
}

syncSeparateCols().catch(console.error);
