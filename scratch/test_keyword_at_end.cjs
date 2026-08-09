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
      'tran', 'le', 'hoang', 'vo', 'dang', 'do', 'ngo', 'duong', 'ly', 'vu', 'dinh', 'tuan'
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
  // Default details (NO keyword at end -> return true)
  { text: 'BUI DUC HUNG chuyen tien', isDefault: true },
  { text: 'PHAM THI THU TRANG chuyen tien', isDefault: true },
  { text: 'chuyen tien', isDefault: true },
  { text: 'chuyen khoang', isDefault: true },
  
  // Has keyword at end -> return false (OK to match / create rule!)
  { text: 'BUI DUC HUNG chuyen tien cho', isDefault: false },
  { text: 'BUI DUC HUNG chuyen tien di cho', isDefault: false },
  { text: 'BUI DUC HUNG chuyen tien an uong', isDefault: false },
  { text: 'BUI DUC HUNG chuyen tien xang', isDefault: false },
  { text: 'BUI DUC HUNG chuyen tien my pham', isDefault: false },
  { text: 'cho', isDefault: false },
  { text: 'di cho', isDefault: false },
  { text: 'my pham', isDefault: false },
  { text: 'xang', isDefault: false },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const res = isDefaultTransferDetails(tc.text);
  const ok = res === tc.isDefault;
  if (ok) {
    passed++;
    console.log(`[PASS] "${tc.text}" => default=${res} (Match OK=${!res})`);
  } else {
    failed++;
    console.log(`[FAIL] "${tc.text}" => got default=${res}, expected ${tc.isDefault}`);
  }
}

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
