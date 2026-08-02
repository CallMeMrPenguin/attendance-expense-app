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

async function populateAllRows() {
  console.log('=== Populating separate columns (type, icon, note) for all rows in Supabase ===');
  
  const records = [
    {
      id: 'Lương',
      user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
      teacher_name: 'Admin',
      category: 'Lương',
      amount: 15000000,
      type: 'income',
      icon: 'Briefcase',
      note: 'Thu nhập cố định hàng tháng',
      updated_at: new Date().toISOString()
    },
    {
      id: 'Giáo dục',
      user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
      teacher_name: 'Admin',
      category: 'Giáo dục',
      amount: 10000000,
      type: 'income',
      icon: 'GraduationCap',
      note: 'Giảng dạy, chấm công',
      updated_at: new Date().toISOString()
    },
    {
      id: 'Đầu tư',
      user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
      teacher_name: 'Admin',
      category: 'Đầu tư',
      amount: 5000000,
      type: 'income',
      icon: 'TrendingUp',
      note: 'Cổ tức, lợi nhuận',
      updated_at: new Date().toISOString()
    },
    {
      id: 'Ăn uống',
      user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
      teacher_name: 'Admin',
      category: 'Ăn uống',
      amount: 4000000,
      type: 'expense',
      icon: 'Utensils',
      note: 'Nhà hàng, siêu thị, thực phẩm',
      updated_at: new Date().toISOString()
    },
    {
      id: 'Xăng',
      user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
      teacher_name: 'Admin',
      category: 'Xăng',
      amount: 500000,
      type: 'expense',
      icon: 'Car',
      note: 'Nhiên liệu đi lại',
      updated_at: new Date().toISOString()
    },
    {
      id: 'Đi Chợ',
      user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
      teacher_name: 'Admin',
      category: 'Đi Chợ',
      amount: 1500000,
      type: 'expense',
      icon: 'ShoppingBag',
      note: 'Thực phẩm, chợ tươi',
      updated_at: new Date().toISOString()
    }
  ];

  const { data, error } = await supabase.from('category_budgets').upsert(records, { onConflict: 'id' }).select('*');
  if (error) {
    console.error('Populate error:', error);
  } else {
    console.log('✅ ALL ROWS SUCCESSFULLY POPULATED WITH SEPARATE COLUMNS!');
    console.log(data);
  }
}

populateAllRows().catch(console.error);
