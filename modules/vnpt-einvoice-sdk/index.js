const VnptEInvoiceClient = require('./lib/client');
const { buildInvoiceXml, buildCustomerXml } = require('./lib/xmlBuilder');
const { readVietnameseCurrency, formatDateVN, escapeXml } = require('./lib/currencyHelper');

module.exports = {
  VnptEInvoiceClient,
  buildInvoiceXml,
  buildCustomerXml,
  readVietnameseCurrency,
  formatDateVN,
  escapeXml,
};
