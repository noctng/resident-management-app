const { escapeXml } = require('./currencyHelper');
const { buildInvoiceXml, buildCustomerXml } = require('./xmlBuilder');

class VnptEInvoiceClient {
  /**
   * @param {Object} options
   * @param {string} options.serviceUrl - e.g. https://.../PublishService.asmx
   * @param {string} options.username - ServiceRole username
   * @param {string} options.password - ServiceRole password
   * @param {string} [options.account] - Admin Portal account
   * @param {string} [options.acpass] - Admin Portal password
   * @param {string} [options.pattern] - e.g. 1/002
   * @param {string} [options.serial] - e.g. C26TAA
   * @param {number} [options.convert=0] - 0 for Unicode, 1 for TCVN3
   */
  constructor(options = {}) {
    this.serviceUrl = options.serviceUrl || '';
    this.username = options.username || '';
    this.password = options.password || '';
    this.account = options.account || options.username || '';
    this.acpass = options.acpass || options.password || '';
    this.pattern = options.pattern || '1/002';
    this.serial = options.serial || 'C26TAA';
    this.convert = options.convert !== undefined ? options.convert : 0;
  }

  /**
   * Low-level SOAP request caller
   */
  async callWebService(actionName, params) {
    if (!this.serviceUrl) {
      throw new Error('Chưa cấu hình serviceUrl cho VNPT WebService');
    }

    let bodyContent = '';
    Object.entries(params).forEach(([k, v]) => {
      bodyContent += `<${k}>${escapeXml(v)}</${k}>`;
    });

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${actionName} xmlns="http://tempuri.org/">
      ${bodyContent}
    </${actionName}>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(this.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"http://tempuri.org/${actionName}"`,
      },
      body: soapEnvelope,
    });

    const textResponse = await response.text();
    const resultRegex = new RegExp(`<${actionName}Result>([\\s\\S]*?)</${actionName}Result>`, 'i');
    const match = textResponse.match(resultRegex);

    if (match && match[1]) {
      return match[1].trim();
    }
    return textResponse.trim();
  }

  /**
   * Test Connection with all 4 credentials + pattern + serial
   */
  async testConnection() {
    const raw = await this.callWebService('PublishInvFkey', {
      Account: this.account,
      ACpass: this.acpass,
      lsFkey: 'TEST_PING_CONNECTION',
      username: this.username,
      password: this.password,
      pattern: this.pattern,
      serial: this.serial,
    });

    // ERR:6 or ERR:15 or OK:# means credentials & pattern/serial are 100% VALID!
    if (raw && (raw.includes('ERR:6') || raw.includes('ERR:15') || raw.startsWith('OK') || raw.includes('OK:#'))) {
      return {
        success: true,
        code: 'OK',
        raw,
        message: 'Kết nối thành công đến máy chủ VNPT E-Invoice! Tài khoản và Mẫu số/Ký hiệu hợp lệ 100%.',
      };
    }

    if (raw.startsWith('ERR:20')) {
      return {
        success: false,
        code: 'ERR:20',
        raw,
        message: 'Mẫu số (Pattern) hoặc Ký hiệu (Serial) không khớp với dải hóa đơn đã đăng ký tại VNPT.',
      };
    }

    if (raw.startsWith('ERR:1')) {
      return {
        success: false,
        code: 'ERR:1',
        raw,
        message: 'Tài khoản Admin Portal (Account hoặc ACpass) không đúng hoặc không có quyền.',
      };
    }

    if (raw.startsWith('ERR:7')) {
      return {
        success: false,
        code: 'ERR:7',
        raw,
        message: 'Tài khoản ServiceRole (Username hoặc Password) không đúng.',
      };
    }

    return {
      success: false,
      raw,
      message: `Phản hồi từ VNPT: ${raw}`,
    };
  }

  /**
   * Import & Publish Invoice (ImportAndPublishInv)
   */
  async importAndPublishInvoice(invData) {
    const xmlInvData = buildInvoiceXml(invData);
    const raw = await this.callWebService('ImportAndPublishInv', {
      Account: this.account,
      ACpass: this.acpass,
      xmlInvData,
      username: this.username,
      password: this.password,
      pattern: this.pattern,
      serial: this.serial,
      convert: this.convert,
    });

    if (raw.startsWith('OK:')) {
      return {
        success: true,
        raw,
        pattern: this.pattern,
        serial: this.serial,
        result: raw,
        message: 'Đã phát hành hóa đơn điện tử thành công trên VNPT E-Invoice',
      };
    }

    return {
      success: false,
      raw,
      message: `Lỗi phát hành hóa đơn VNPT: ${raw}`,
    };
  }
}

module.exports = VnptEInvoiceClient;
