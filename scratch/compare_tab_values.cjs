const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';
let serviceKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = trimmed.split('=')[1].trim();
  }
}

const client = createClient(url, serviceKey || key);

async function compareTabValues() {
  console.log('=== COMPARING DASHBOARD TAB VS FLOW TAB NUMBERS ===\n');

  const { data: manualTxs } = await client.from('manual_transactions').select('*');
  const { data: sessions } = await client.from('sessions').select('*');
  const { data: receipts } = await client.from('bank_receipts').select('*');

  console.log(`manual_transactions count: ${manualTxs ? manualTxs.length : 0}`);
  console.log(`sessions count: ${sessions ? sessions.length : 0}`);
  console.log(`bank_receipts count: ${receipts ? receipts.length : 0}\n`);

  const monthStr = '2026-08';

  // 1. Manual Income for August 2026
  const augManualInc = (manualTxs || [])
    .filter(t => t.type === 'income' && t.date && t.date.startsWith(monthStr))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // 2. Manual Expense for August 2026
  const augManualExp = (manualTxs || [])
    .filter(t => t.type === 'expense' && t.date && t.date.startsWith(monthStr))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // 3. Teaching Sessions Earnings for August 2026
  const augSessionsEarned = (sessions || [])
    .filter(s => (s.status === 'Đã làm' || s.status === 'Đã dạy') && (s.month_year === monthStr || (s.date && s.date.startsWith(monthStr))))
    .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  // 4. Preceding Roll-over Surplus (months < 2026-08)
  const prevManualInc = (manualTxs || [])
    .filter(t => t.type === 'income' && t.date && t.date.substring(0, 7) < monthStr)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const prevManualExp = (manualTxs || [])
    .filter(t => t.type === 'expense' && t.date && t.date.substring(0, 7) < monthStr)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const rollOver = Math.max(0, prevManualInc - prevManualExp);

  // DASHBOARD TAB CALCULATIONS:
  const dashboardIncome = augSessionsEarned + augManualInc + rollOver;
  const dashboardExpense = augManualExp;
  const dashboardNet = dashboardIncome - dashboardExpense;

  // FLOW TAB CALCULATIONS:
  // FlowTab totals currently in UI:
  const flowTabManualInc = augManualInc;
  const flowTabCategoryActualsInc = augManualInc + augSessionsEarned; // (since we updated getActualCategoryAmount)
  const flowTabExpense = augManualExp;
  const flowTabNetDirect = flowTabManualInc - flowTabExpense;
  const flowTabNetWithSessions = flowTabCategoryActualsInc - flowTabExpense;

  console.log(`--- August 2026 Figures ---`);
  console.log(`Manual Income Transactions: ${augManualInc.toLocaleString()} VND`);
  console.log(`Manual Expense Transactions: ${augManualExp.toLocaleString()} VND`);
  console.log(`Teaching Sessions Earnings:  ${augSessionsEarned.toLocaleString()} VND`);
  console.log(`Preceding Roll-over Balance: ${rollOver.toLocaleString()} VND\n`);

  console.log(`📊 DASHBOARD TAB:`);
  console.log(`  ├─ Income:  ${dashboardIncome.toLocaleString()} VND (Sessions + Manual Income + Roll-over)`);
  console.log(`  ├─ Expense: ${dashboardExpense.toLocaleString()} VND`);
  console.log(`  └─ Net:     ${dashboardNet.toLocaleString()} VND\n`);

  console.log(`🌊 FLOW TAB (Dòng Tiền):`);
  console.log(`  ├─ Income (Manual Only): ${flowTabManualInc.toLocaleString()} VND`);
  console.log(`  ├─ Income (Category Actuals with Sessions): ${flowTabCategoryActualsInc.toLocaleString()} VND`);
  console.log(`  ├─ Expense: ${flowTabExpense.toLocaleString()} VND`);
  console.log(`  └─ Net (Manual Only): ${flowTabNetDirect.toLocaleString()} VND`);
  console.log(`  └─ Net (With Sessions): ${flowTabNetWithSessions.toLocaleString()} VND`);
}

compareTabValues().catch(console.error);
