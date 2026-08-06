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

function parseTxRow(t) {
  const rawDesc = t.desc_text || t.desc || '';
  const isRecurring = !!(t.isRecurring || t.is_recurring || /^\[(CỐ ĐỊNH|RECURRING)\]/i.test(rawDesc));
  const desc = rawDesc.replace(/^\[(CỐ ĐỊNH|RECURRING)\]\s*/i, '');
  return {
    id: t.id,
    desc,
    amount: Number(t.amount) || 0,
    type: t.type,
    category: t.category,
    date: t.date,
    isRecurring
  };
}

function formatTxRecord(t, userId, teacherName) {
  const isRecurring = !!(t.isRecurring || t.is_recurring);
  let cleanDesc = (t.desc || '').replace(/^\[(CỐ ĐỊNH|RECURRING)\]\s*/i, '');
  const desc_text = isRecurring ? `[CỐ ĐỊNH] ${cleanDesc}` : cleanDesc;
  return {
    id: t.id || `tx-${Date.now()}-${Math.random()}`,
    user_id: userId,
    teacher_name: teacherName,
    desc_text,
    amount: Number(t.amount) || 0,
    type: t.type,
    category: t.category,
    date: t.date
  };
}

async function testRecurringSync() {
  const testId = 'tx-test-recurring-123';
  const testTxFixed = {
    id: testId,
    desc: 'Lương cố định tháng',
    amount: 15000000,
    type: 'income',
    category: 'Lương',
    date: '2026-08-01',
    isRecurring: true
  };

  // 1. Save as Cố định
  const recFixed = formatTxRecord(testTxFixed, '2d3a11e1-4d71-474c-b8df-abb85394e9c8', 'Admin');
  console.log('Formatted record for fixed:', recFixed);
  const { error: err1 } = await supabase.from('manual_transactions').upsert([recFixed], { onConflict: 'id' });
  if (err1) console.error('Save error fixed:', err1);

  // 2. Fetch and parse
  const { data: fetch1 } = await supabase.from('manual_transactions').select('*').eq('id', testId);
  const parsed1 = parseTxRow(fetch1[0]);
  console.log('Fetched & parsed fixed:', parsed1);

  // 3. Update to Tạm thời
  const testTxTemp = { ...parsed1, isRecurring: false };
  const recTemp = formatTxRecord(testTxTemp, '2d3a11e1-4d71-474c-b8df-abb85394e9c8', 'Admin');
  console.log('Formatted record for temp:', recTemp);
  const { error: err2 } = await supabase.from('manual_transactions').upsert([recTemp], { onConflict: 'id' });
  if (err2) console.error('Save error temp:', err2);

  // 4. Fetch and parse again
  const { data: fetch2 } = await supabase.from('manual_transactions').select('*').eq('id', testId);
  const parsed2 = parseTxRow(fetch2[0]);
  console.log('Fetched & parsed temp:', parsed2);

  // Clean up test row
  await supabase.from('manual_transactions').delete().eq('id', testId);
  console.log('Test complete and cleaned up.');
}

testRecurringSync().catch(console.error);
