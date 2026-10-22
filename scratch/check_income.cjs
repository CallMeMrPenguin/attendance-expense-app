const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(process.cwd(), 'data/local.db'));

console.log('=== KIỂM TRA THU NHẬP THÁNG 10/2026 VÀ CÁC THÁNG GẦN ĐÂY ===\n');

// 1. Kiểm tra trong sessions (Chấm công / Ca dạy)
console.log('--- 1. SESSIONS THEO THÁNG ---');
const sessionsByMonth = db.prepare(`
  SELECT month_year, count(*) as session_count, 
         SUM(duration * price) as total_by_duration_price,
         SUM(price) as total_by_price
  FROM sessions 
  GROUP BY month_year 
  ORDER BY month_year DESC
`).all();
console.table(sessionsByMonth);

// Chi tiết sessions tháng 10/2026
console.log('\n--- SESSIONS THÁNG 2026-10 THEO GIÁO VIÊN ---');
const sessions2026_10 = db.prepare(`
  SELECT teacher_name, count(*) as count, 
         SUM(duration * price) as sum_dur_price,
         SUM(price) as sum_price
  FROM sessions 
  WHERE month_year = '2026-10'
  GROUP BY teacher_name
`).all();
console.table(sessions2026_10);

// Chi tiết sessions tháng 10/2026 theo job_name
console.log('\n--- SESSIONS THÁNG 2026-10 THEO JOB_NAME ---');
const sessionsJob2026_10 = db.prepare(`
  SELECT job_name, teacher_name, count(*) as count, 
         SUM(duration * price) as sum_dur_price,
         SUM(price) as sum_price,
         group_concat(DISTINCT status) as statuses
  FROM sessions 
  WHERE month_year = '2026-10'
  GROUP BY job_name, teacher_name
`).all();
console.table(sessionsJob2026_10);

// 2. Kiểm tra trong manual_transactions (Thu chi tài chính)
console.log('\n--- 2. MANUAL_TRANSACTIONS THEO THÁNG ---');
const txByMonth = db.prepare(`
  SELECT SUBSTR(date, 1, 7) as month, type, count(*) as count, SUM(amount) as total_amount
  FROM manual_transactions 
  GROUP BY SUBSTR(date, 1, 7), type
  ORDER BY month DESC
`).all();
console.table(txByMonth);

// Chi tiết income trong manual_transactions tháng 2026-10
console.log('\n--- MANUAL_TRANSACTIONS INCOME THÁNG 2026-10 ---');
const txIncome2026_10 = db.prepare(`
  SELECT id, desc_text, amount, category, date, type
  FROM manual_transactions 
  WHERE type = 'income' AND date LIKE '2026-10%'
`).all();
console.table(txIncome2026_10);

// 3. Kiểm tra bank_receipts tháng 2026-10
console.log('\n--- 3. BANK_RECEIPTS THEO THÁNG ---');
const receiptsByMonth = db.prepare(`
  SELECT SUBSTR(trans_date, 1, 7) as month, type, status, count(*) as count, SUM(amount) as total_amount
  FROM bank_receipts 
  GROUP BY SUBSTR(trans_date, 1, 7), type, status
  ORDER BY month DESC
`).all();
console.table(receiptsByMonth);

// Chi tiết income trong bank_receipts tháng 2026-10
console.log('\n--- BANK_RECEIPTS INCOME THÁNG 2026-10 ---');
const receiptsIncome2026_10 = db.prepare(`
  SELECT id, details, amount, category, trans_date, status, type
  FROM bank_receipts 
  WHERE type = 'income' AND trans_date LIKE '2026-10%'
`).all();
console.table(receiptsIncome2026_10);
