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

  // Common Vietcombank / Bank default transaction phrases:
  // "bui duc hung chuyen tien", "chuyen tien", "chuyen khoang", "chuyen tk", "pham thi thu trang chuyen tien", etc.
  // Match if string is composed ONLY of optional name words + (chuyen tien | chuyen khoang | chuyen tk | thanh toan)
  const defaultPattern = /^(?:[a-z0-9]+\s+)*(?:chuyen\s*tien|chuyen\s*khoang|chuyen\s*tk|thanh\s*toan)(?:\s+[a-z0-9]+)*$/i;
  
  if (defaultPattern.test(clean)) {
    // Extract non-transfer words
    const stripped = clean
      .replace(/\b(?:chuyen\s*tien|chuyen\s*khoang|chuyen\s*tk|thanh\s*toan|chuyen|tien|khoang|tk)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If stripped text is empty or looks like a typical person name (up to 4 name components without specific keywords), it's default!
    // Specific keywords like "an", "cho", "nuoc", "dien", "shopee", "xang", "hoc phi", etc. are NOT standard name words.
    // Standard name words are words like "bui", "duc", "hung", "pham", "thi", "thu", "trang", "nguyen", "van", "a", "tran", "hoang", etc.
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

const testCases = [
  { text: 'BUI DUC HUNG chuyen tien', expected: true },
  { text: 'bui duc hung chuyen tien', expected: true },
  { text: 'PHAM THI THU TRANG chuyen tien', expected: true },
  { text: 'chuyen tien', expected: true },
  { text: 'chuyen khoang', expected: true },
  { text: 'BUI DUC HUNG chuyen tien an', expected: false },
  { text: 'BUI DUC HUNG chuyen tien mua do', expected: false },
  { text: 'BUI DUC HUNG chuyen tien cho', expected: false },
  { text: 'tra tien dien', expected: false },
  { text: 'thanh toan tien nuoc', expected: false },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const res = isDefaultTransferDetails(tc.text);
  const ok = res === tc.expected;
  if (ok) {
    passed++;
    console.log(`[PASS] "${tc.text}" => default=${res}`);
  } else {
    failed++;
    console.log(`[FAIL] "${tc.text}" => got default=${res}, expected ${tc.expected}`);
  }
}

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
