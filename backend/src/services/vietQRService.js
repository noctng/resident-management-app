/**
 * VietQR Service
 * Generates VietQR payment QR code URLs for bank transfers
 * Documentation: https://www.vietqr.io/danh-sach-api
 */

/**
 * Generate VietQR URL for payment
 * @param {string} bankCode - Bank code (e.g., 'VCB', 'TCB', 'ACB')
 * @param {string} accountNumber - Bank account number
 * @param {number} amount - Transfer amount in VND
 * @param {string} transferContent - Transfer description/content
 * @returns {string} VietQR image URL
 */
const generateQRCodeURL = (bankCode, accountNumber, amount, transferContent, accountName) => {
    if (!bankCode || !accountNumber) {
        throw new Error('Bank code and account number are required');
    }

    // VietQR API format: https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT_NUMBER}-{TEMPLATE}.png
    const template = 'compact2'; // Use compact2 template for better display
    const baseUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png`;

    // Build query parameters
    const params = new URLSearchParams();

    if (amount && amount > 0) {
        params.append('amount', amount.toString());
    }

    if (transferContent) {
        // VietQR supports addInfo parameter for transfer content
        params.append('addInfo', transferContent);
    }

    if (accountName) {
        params.append('accountName', accountName);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Format transfer content for utility bills
 * @param {string} apartmentCode - Apartment code (e.g., 'A101')
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2026)
 * @returns {string} Formatted transfer content
 */
const formatUtilityTransferContent = (apartmentCode, month, year) => {
    const monthStr = month.toString().padStart(2, '0');
    return `EW-${apartmentCode}-${monthStr} ${year}`;
};

module.exports = {
    generateQRCodeURL,
    formatUtilityTransferContent,
};
