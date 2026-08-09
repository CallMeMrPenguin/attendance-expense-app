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

const cleanString = (str) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
};

const isDefaultTransferDetails = (text) => {
  const clean = cleanString(text);
  if (!clean) return true;

  const defaultPattern = /^(?:[a-z0-9]+\s+)*(?:chuyen\s*tien|chuyen\s*khoang|chuyen\s*tk|thanh\s*toan)(?:\s+[a-z0-9]+)*$/i;
  
  if (defaultPattern.test(clean)) {
    const stripped = clean
      .replace(/\b(?:chuyen\s*tien|chuyen\s*khoang|chuyen\s*tk|thanh\s*toan|chuyen|tien|khoang|tk)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const nameWords = new Set([
      'bui', 'duc', 'hung', 'pham', 'thi', 'thu', 'trang', 'nguyen', 'van', 'a', 'b', 'c',
      'tran', 'le', 'hoang', 'vo', 'dang', 'do', 'ngo', 'duong', 'ly', 'vu', 'dinh', 'tuan',
      'anh', 'minh', 'nam', 'ha', 'linh', 'mai', 'phuong', 'quan', 'son', 'thang', 'thanh'
    ]);

    const remainingWords = stripped.split(' ').filter(Boolean);
    const hasNonNameWord = remainingWords.some(w => !nameWords.has(w));
    
    if (!hasNonNameWord) {
      return true;
    }
  }
  
  return false;
};

async function cleanDefaultRules() {
  console.log('Fetching rules from Supabase...');
  const { data: rules } = await client.from('receipt_rules').select('*');
  console.log(`Total rules in DB: ${rules ? rules.length : 0}`);

  const defaultRules = (rules || []).filter(r => {
    if (r.match_field === 'details' || r.match_field === 'remitter_beneficiary_details') {
      return isDefaultTransferDetails(r.match_value);
    }
    return false;
  });

  console.log(`Found ${defaultRules.length} rules matching default transfer details:`);
  defaultRules.forEach(r => {
    console.log(`  Rule ID: ${r.id} | Field: ${r.match_field} | Value: "${r.match_value}" | Target: ${r.target_category}`);
  });

  if (defaultRules.length > 0) {
    const idsToDelete = defaultRules.map(r => r.id);
    const { error } = await client.from('receipt_rules').delete().in('id', idsToDelete);
    if (error) {
      console.error('Error deleting default rules:', error.message);
    } else {
      console.log(`Successfully deleted ${idsToDelete.length} default transfer detail rules from DB!`);
    }
  }
}

cleanDefaultRules().catch(console.error);
