/**
 * Utility: Convert numeric amount to Vietnamese words
 * e.g. 38098 -> 'Ba mươi tám nghìn không trăm chín mươi tám đồng'
 */
function readVietnameseCurrency(n) {
  if (isNaN(n) || n === null || n === undefined) return '';
  const number = Math.round(Number(n));
  if (number === 0) return 'Không đồng';

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readGroup(group, showZeroHundreds = true) {
    const hundreds = Math.floor(group / 100);
    const tens = Math.floor((group % 100) / 10);
    const ones = group % 10;
    let res = '';

    if (hundreds > 0 || showZeroHundreds) {
      res += digits[hundreds] + ' trăm ';
    }

    if (tens > 1) {
      res += digits[tens] + ' mươi ';
      if (ones === 1) res += 'mốt ';
      else if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += digits[ones] + ' ';
    } else if (tens === 1) {
      res += 'mười ';
      if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += digits[ones] + ' ';
    } else if (tens === 0 && ones > 0) {
      if (hundreds > 0 || showZeroHundreds) res += 'lẻ ';
      res += digits[ones] + ' ';
    }

    return res.trim();
  }

  const groups = [];
  let temp = Math.abs(number);
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp > 0) {
      const isFirst = i === groups.length - 1;
      const str = readGroup(grp, !isFirst);
      result += str + ' ' + scales[i] + ' ';
    }
  }

  result = result.trim() + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatDateVN(date) {
  const d = date ? new Date(date) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function escapeXml(str) {
  if (str === null || str === undefined || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  readVietnameseCurrency,
  formatDateVN,
  escapeXml
};
