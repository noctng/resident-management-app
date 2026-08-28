/**
 * Helper utilities for string normalization and regex parsing
 */

/**
 * Remove Vietnamese accents and special characters for reliable matching
 * @param {string} str 
 * @returns {string}
 */
function normalizeText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extract an order code or entity identifier from transfer content string
 * @param {string} content 
 * @param {string} prefix - Optional prefix like 'DH', 'HD', 'CAN', 'BILL'
 * @returns {string|null}
 */
function extractEntityCode(content, prefix = '') {
  if (!content) return null;
  const clean = content.trim();
  if (prefix) {
    const regex = new RegExp(`\\b${prefix}[a-zA-Z0-9_-]+\\b`, 'i');
    const match = clean.match(regex);
    if (match) return match[0];
  }
  return null;
}

module.exports = {
  normalizeText,
  extractEntityCode,
};
