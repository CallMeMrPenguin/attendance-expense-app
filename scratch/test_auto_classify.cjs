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

function cleanString(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

function matchKeyword(cleanDetails, kw) {
  const cleanedKw = cleanString(kw);
  if (!cleanedKw) return false;
  if (cleanedKw.includes(' ')) {
    return cleanDetails.includes(cleanedKw);
  } else {
    const words = cleanDetails.split(/[\s,._-]+/).filter(Boolean);
    return words.includes(cleanedKw) || new RegExp(`\\b${cleanedKw}\\b`, 'i').test(cleanDetails);
  }
}

async function testAutoClassify() {
  console.log('Testing auto-classification logic...');
  const { data: receipts } = await supabase.from('bank_receipts').select('*');
  const { data: budgets } = await supabase.from('category_budgets').select('*');

  const defaultKeywords = {
    'Lương': 'luong',
    'Giáo dục': 'day hoc, day, cham cong, gia su',
    'Đầu tư': 'dau tu, chung khoan',
    'Khác': 'khac',
    'Di chuyển': 'xang, grab, taxi, di lai, xe',
    'Ăn uống': 'an uong, do an, food, com, nhahang, quanan, cafe, trasua, bua an, tien an, mon an',
    'Shopping': 'shopping, mua sam, shopee, lazada',
    'Hóa đơn': 'hoa don, dien nuoc, wifi',
    'Giải trí': 'giai tri, xem phim, du lich, phim, gt',
    'Xăng': 'xang, cay xang'
  };

  const parsedBudgets = (budgets || []).map(b => {
    let kwVal = b.keywords || '';
    if (typeof kwVal === 'string' && kwVal.startsWith('{')) {
      try {
        const parsed = JSON.parse(kwVal);
        kwVal = parsed.kw || '';
      } catch (e) {}
    }
    return {
      category: b.category,
      keywords: kwVal || defaultKeywords[b.category] || ''
    };
  });

  console.log('Parsed Budgets with extracted keywords:');
  console.log(parsedBudgets);

  let matchCount = 0;
  for (const r of (receipts || [])) {
    const cleanCombined = cleanString(`${r.details || ''} ${r.remitter_name || ''} ${r.beneficiary_name || ''} ${r.beneficiary_bank || ''}`);
    for (const b of parsedBudgets) {
      if (!b.keywords) continue;
      const kwList = b.keywords.split(',').map(kw => cleanString(kw)).filter(Boolean);
      for (const kw of kwList) {
        if (matchKeyword(cleanCombined, kw)) {
          matchCount++;
          console.log(`Matched Receipt [${r.id}]: "${cleanCombined}" ➔ Category [${b.category}] (Keyword: ${kw})`);
          break;
        }
      }
    }
  }

  console.log(`\nTotal matched receipts: ${matchCount} / ${(receipts || []).length}`);
}

testAutoClassify().catch(console.error);
