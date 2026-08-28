/**
 * SePay REST API Client
 * Used to manually fetch transactions and balance from SePay API
 * Documentation: https://docs.sepay.vn/user-api.html
 */
const https = require('https');

class SepayApiClient {
  /**
   * @param {Object} config
   * @param {string} config.apiToken - SePay API Token (from my.sepay.vn/userapi)
   * @param {string} [config.baseUrl='https://my.sepay.vn/userapi'] - SePay Base API URL
   */
  constructor(config = {}) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://my.sepay.vn/userapi';
  }

  /**
   * Internal HTTP GET request
   */
  _get(path, params = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${path}`);
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });

      const options = {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error || parsed.message || `HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Get list of bank transactions
   * @param {Object} [params]
   * @param {string} [params.account_number] - Filter by account number
   * @param {string} [params.transaction_date_min] - Filter from date (YYYY-MM-DD HH:mm:ss)
   * @param {string} [params.transaction_date_max] - Filter to date (YYYY-MM-DD HH:mm:ss)
   * @param {number} [params.limit=20] - Number of records
   * @returns {Promise<Object>}
   */
  getTransactions(params = {}) {
    return this._get('/transactions/list', params);
  }

  /**
   * Get transaction details by ID
   * @param {string|number} id - Transaction ID
   * @returns {Promise<Object>}
   */
  getTransactionDetail(id) {
    return this._get(`/transactions/details/${id}`);
  }

  /**
   * Get transaction count
   * @returns {Promise<Object>}
   */
  countTransactions(params = {}) {
    return this._get('/transactions/count', params);
  }
}

module.exports = {
  SepayApiClient,
};
