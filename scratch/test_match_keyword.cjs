const cleanString = (str) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
};

const matchKeyword = (cleanDetails, kw) => {
  const cleanedKw = cleanString(kw);
  const cleanedText = cleanString(cleanDetails);
  if (!cleanedKw || !cleanedText) return false;

  const trimmedText = cleanedText.replace(/[\s,._:;-]+$/, '');
  const escapedKw = cleanedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[\\s,._:;-])${escapedKw}[\\s,._:;-]*$`, 'm');

  return regex.test(trimmedText);
};

const testCases = [
  { details: 'A chuyen khoan cho B', kw: 'cho', expected: false },
  { details: 'Nguyen Van A chuyen khoan cho Tran Van B', kw: 'cho', expected: false },
  { details: 'chuyen khoan cho anh nam', kw: 'cho', expected: false },
  { details: 'Tien di cho', kw: 'cho', expected: true },
  { details: 'Chuyen tien cho', kw: 'cho', expected: true },
  { details: 'Chuyen tien đi chợ', kw: 'cho', expected: true },
  { details: 'di cho', kw: 'cho', expected: true },
  { details: 'cho', kw: 'cho', expected: true },
  { details: 'Tien di cho.', kw: 'cho', expected: true },
  { details: 'di cho 500k', kw: 'cho', expected: false },
  { details: 'Tien di cho', kw: 'di cho', expected: true },
  { details: 'A chuyen khoan cho B', kw: 'di cho', expected: false },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = matchKeyword(tc.details, tc.kw);
  const isCorrect = result === tc.expected;
  if (isCorrect) {
    passed++;
    console.log(`[PASS] details="${tc.details}" | kw="${tc.kw}" => ${result}`);
  } else {
    failed++;
    console.log(`[FAIL] details="${tc.details}" | kw="${tc.kw}" => got ${result}, expected ${tc.expected}`);
  }
}

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
