/**
 * VietQR Dynamic Generator
 * Standard VietQR Image Generator: https://www.vietqr.io/
 */

/**
 * Generate VietQR Payment Image URL
 * @param {Object} options
 * @param {string} options.bankCode - Bank Code (e.g. 'VCB', 'TCB', 'MB', 'BIDV', 'ICB', 'ACB', 'VPB')
 * @param {string} options.accountNumber - Bank Account Number
 * @param {number} [options.amount] - Payment amount in VND
 * @param {string} [options.memo] - Content of bank transfer (Nội dung chuyển khoản)
 * @param {string} [options.accountName] - Account holder name
 * @param {'compact'|'compact2'|'qr_only'|'print'} [options.template='compact2'] - Display template
 * @returns {string} Fully formed VietQR image URL
 */
function generateVietQRUrl(options = {}) {
  const {
    bankCode,
    accountNumber,
    amount,
    memo,
    accountName,
    template = 'compact2'
  } = options;

  if (!bankCode || !accountNumber) {
    throw new Error('[VietQR] bankCode and accountNumber are required.');
  }

  const cleanBank = bankCode.trim().toUpperCase();
  const cleanAccount = accountNumber.trim();
  const baseUrl = `https://img.vietqr.io/image/${cleanBank}-${cleanAccount}-${template}.png`;

  const params = new URLSearchParams();

  if (amount && Number(amount) > 0) {
    params.append('amount', String(Math.round(amount)));
  }

  if (memo) {
    params.append('addInfo', memo.trim());
  }

  if (accountName) {
    params.append('accountName', accountName.trim());
  }

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

/**
 * Format standard memo / description for payments
 * @param {string} prefix - e.g. 'DH', 'HD', 'CAN', 'BILL'
 * @param {string} id - Order ID, Apartment Code, etc.
 * @param {string|number} [month] - Month (1-12)
 * @param {string|number} [year] - Year (e.g. 2026)
 * @returns {string} Standardized transfer memo string
 */
function formatPaymentMemo(prefix, id, month, year) {
  const cleanPrefix = prefix ? prefix.trim().toUpperCase() : 'PAY';
  const cleanId = String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  if (month && year) {
    const m = String(month).padStart(2, '0');
    return `${cleanPrefix} ${cleanId} ${m}${year}`;
  }
  return `${cleanPrefix} ${cleanId}`;
}

module.exports = {
  generateVietQRUrl,
  formatPaymentMemo,
};
