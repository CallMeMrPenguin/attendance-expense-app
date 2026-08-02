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

async function testSettingsSave() {
  const tableId = 'flow_transactions';
  const settingId = `tbl_cfg_${tableId}`;
  const layout = {
    order: ['date', 'desc', 'category', 'amount', 'actions'],
    visibility: { date: true, desc: true, category: true, amount: true, actions: true },
    alignments: { date: 'left', desc: 'left', category: 'center', amount: 'center', actions: 'center' },
    sizing: { date: 110, desc: 250, category: 160, amount: 140, actions: 80 }
  };

  const { data: prof } = await supabase.from('profiles').select('id, teacher_name').limit(1).single();

  const { data, error } = await supabase.from('category_budgets').upsert({
    id: settingId,
    user_id: prof.id,
    teacher_name: prof.teacher_name,
    category: `__TABLE_SETTINGS_${tableId}__`,
    amount: 0,
    type: 'settings',
    icon: 'SlidersHorizontal',
    note: JSON.stringify(layout),
    updated_at: new Date().toISOString()
  }).select();

  console.log('Save result:', { data, error });

  const { data: fetched } = await supabase.from('category_budgets').select('*').eq('id', settingId).single();
  console.log('Fetched settings back from Supabase:', fetched);
  if (fetched && fetched.note) {
    console.log('✅ Parsed layout from Supabase:', JSON.parse(fetched.note));
  }
}

testSettingsSave().catch(console.error);
