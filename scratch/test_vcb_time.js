function parseVietcombankEmail(html, text) {
  const content = (html || '') + '\n' + (text || '');
  if (!content) return null;

  const tablePairs = {};
  if (html) {
    const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rowMatches) {
      const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [])
        .map(c => c.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim());
      if (cells.length >= 2) {
        tablePairs[cells[0].toLowerCase()] = cells[1];
        if (cells.length >= 4) {
          tablePairs[cells[2].toLowerCase()] = cells[3];
        }
      }
    }
  }

  const cleanText = content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ');

  const getFieldValue = (labelPatterns) => {
    for (const pattern of labelPatterns) {
      const lowerPat = pattern.toLowerCase();
      for (const k of Object.keys(tablePairs)) {
        if (k.includes(lowerPat)) {
          return tablePairs[k];
        }
      }
    }
    for (const pattern of labelPatterns) {
      const regex = new RegExp(`${pattern}\\s*[:\\s]+\\s*([^\\n\\r<]{1,120})`, 'i');
      const match = cleanText.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  };

  const orderNumberRaw = getFieldValue(['số lệnh giao dịch', 'order number']);
  const orderNumber = orderNumberRaw.replace(/[^0-9]/g, '');

  const amountStr = getFieldValue(['số tiền', 'amount']);
  let amount = 0;
  const amountMatch = amountStr.match(/([0-9\.\,]+)\s*(VND|VNĐ|đ)?/i);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, '').replace(/\./g, '')) || 0;
  }

  // Improved Date & Time Parsing
  let transDateRaw = getFieldValue(['ngày, giờ giao dịch', 'ngày giờ giao dịch', 'ngày giao dịch', 'trans. date', 'trans date', 'thời gian']);
  if (!transDateRaw) {
    transDateRaw = cleanText;
  }

  let transDate = new Date().toISOString().split('T')[0];
  let transTime = '';

  const dateMatch = transDateRaw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split('/');
    transDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const timeMatch = transDateRaw.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (timeMatch) {
    transTime = timeMatch[1];
  }

  return {
    orderNumber,
    transDate,
    transTime,
    amount,
    remitterName: getFieldValue(['tên người chuyển tiền', 'remitter\'s name', 'remitter name']),
    beneficiaryName: getFieldValue(['tên người hưởng', 'beneficiary name']),
    details: getFieldValue(['nội dung chuyển tiền', 'details of payment'])
  };
}

const htmlSample = `
<table border="0">
  <tr><td>Ngày, giờ giao dịch / Trans. Date, Time</td><td>18/07/2026 14:23:45</td></tr>
  <tr><td>Tên người chuyển tiền / Remitter's name</td><td>BUI DUC HUNG</td></tr>
  <tr><td>Tên người hưởng / Beneficiary Name</td><td>PHAM THI THU TRANG</td></tr>
  <tr><td>Số tiền / Amount</td><td>5,000 VND</td></tr>
  <tr><td>Số lệnh giao dịch / Order Number</td><td>15172535165</td></tr>
  <tr><td>Nội dung chuyển tiền / Details of Payment</td><td>BUI DUC HUNG chuyen tien cho PHAM THI THU TRANG tiet kiem</td></tr>
</table>
`;

console.log('Test Result:', parseVietcombankEmail(htmlSample, ''));
