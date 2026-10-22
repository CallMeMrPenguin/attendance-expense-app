const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(process.cwd(), 'data/local.db'));

console.log('=== PHÂN TÍCH CHI TIẾT SỐ TIỀN 33TR VÀ CÁC NGUỒN TÍNH TOÁN ===\n');

// 1. Phân tích Schedule Tab (Chấm công) tháng 2026-10
console.log('--- 1. PHÂN TÍCH CHẤM CÔNG (SESSIONS) THÁNG 2026-10 ---');
const sessions = db.prepare(`SELECT * FROM sessions WHERE month_year = '2026-10'`).all();
console.log(`Tổng số ca tháng 2026-10: ${sessions.length}`);

// Tính theo từng giáo viên
const teachers = ['ADMIN', 'Phạm Thị Thu Trang'];
for (const t of teachers) {
  const tSessions = sessions.filter(s => s.teacher_name === t);
  let completed = 0;
  let cancelled = 0;
  let pending = 0;
  let earned = 0;
  let projected = 0;

  tSessions.forEach(s => {
    const p = Number(s.price) || 0;
    if (s.status === 'Đã làm' || s.status === 'Đã dạy') {
      completed++;
      earned += p;
    } else if (s.status === 'Hủy') {
      cancelled++;
    } else {
      pending++;
    }
    if (s.status !== 'Hủy') {
      projected += p;
    }
  });

  console.log(`\n[Giáo viên: ${t}]`);
  console.log(` - Tổng ca: ${tSessions.length} (Đã làm: ${completed}, Chưa làm: ${pending}, Hủy: ${cancelled})`);
  console.log(` - Thực nhận (Đã làm): ${earned.toLocaleString('vi-VN')} đ`);
  console.log(` - Dự kiến tổng (Không hủy): ${projected.toLocaleString('vi-VN')} đ`);
  console.log(` - Tổng nếu tính cả ca Hủy: ${tSessions.reduce((a, s) => a + (Number(s.price)||0), 0).toLocaleString('vi-VN')} đ`);
}

// Tổng toàn bộ các giáo viên tháng 2026-10:
let allEarned = 0;
let allProjected = 0;
let allRawSum = 0;
sessions.forEach(s => {
  const p = Number(s.price) || 0;
  if (s.status === 'Đã làm' || s.status === 'Đã dạy') allEarned += p;
  if (s.status !== 'Hủy') allProjected += p;
  allRawSum += p;
});
console.log('\n[TỔNG HỢP TẤT CẢ GIÁO VIÊN THÁNG 2026-10]');
console.log(` - Thực nhận (earned): ${allEarned.toLocaleString('vi-VN')} đ`);
console.log(` - Dự kiến (projected): ${allProjected.toLocaleString('vi-VN')} đ`);
console.log(` - Tổng thô: ${allRawSum.toLocaleString('vi-VN')} đ`);

// Từng lịch làm trong tháng 2026-10
console.log('\n--- TỪNG LỊCH TRÌNH THÁNG 2026-10 (JOB_NAME) ---');
const jobSummary = {};
sessions.forEach(s => {
  const key = `${s.job_name} (${s.teacher_name})`;
  if (!jobSummary[key]) {
    jobSummary[key] = {
      count: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
      pricePerSession: s.price,
      duration: s.duration,
      earned: 0,
      projected: 0,
      rawSum: 0
    };
  }
  const j = jobSummary[key];
  j.count++;
  const p = Number(s.price) || 0;
  j.rawSum += p;
  if (s.status === 'Đã làm' || s.status === 'Đã dạy') {
    j.completed++;
    j.earned += p;
  } else if (s.status === 'Hủy') {
    j.cancelled++;
  } else {
    j.pending++;
  }
  if (s.status !== 'Hủy') j.projected += p;
});
console.table(jobSummary);

// 2. Phân tích Dòng tiền / Tài chính (FlowTab) tháng 2026-10
console.log('\n--- 2. PHÂN TÍCH TÀI CHÍNH / DÒNG TIỀN (MANUAL_TRANSACTIONS) THÁNG 2026-10 ---');
const incomeTx = db.prepare(`SELECT * FROM manual_transactions WHERE date LIKE '2026-10%' AND type = 'income'`).all();
console.log(`Số giao dịch income tháng 2026-10: ${incomeTx.length}`);
let totalIncomeTx = 0;
incomeTx.forEach(t => {
  totalIncomeTx += Number(t.amount) || 0;
  console.log(` - [${t.date}] ${t.category.padEnd(12)}: ${t.desc_text.padEnd(25)} = ${Number(t.amount).toLocaleString('vi-VN')} đ`);
});
console.log(`=> TỔNG THU NHẬP DÒNG TIỀN (manual_transactions): ${totalIncomeTx.toLocaleString('vi-VN')} đ (khoảng 33.68 tr)`);

// 3. Kiểm tra FlowTab projectedIncome
console.log('\n--- 3. FLOWTAB PROJECTED INCOME CALCULATION ---');
// In FlowTab:
// sessionsIncome = sessions.filter(s => s.status !== 'Hủy' && date in 2026-10).reduce(sum + s.price)
// otherCategoryTargets = categoryBudgets for income categories (excluding Gia Sư/Giáo Dục if hasSessions)
const categoryBudgets = {};
db.prepare(`SELECT category, amount, type FROM category_budgets`).all().forEach(cb => {
  categoryBudgets[cb.category] = cb.amount;
});
console.log('Category Budgets:', categoryBudgets);
