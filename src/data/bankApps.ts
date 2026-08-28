/**
 * Vietnamese banking app deeplinks from VietQR.io
 * Source: https://api.vietqr.io/v2/android-app-deeplinks
 *
 * Deeplink format: https://dl.vietqr.io/pay?ba=ACCOUNT@BANK&am=AMOUNT&tn=INFO&app=APPID&bn=NAME
 * bankCode matches QR_BANK_CODE in system config (VietQR standard)
 */

export interface BankApp {
  appId: string;
  appName: string;
  bankName: string;
  /** VietQR bank code — matches QR_BANK_CODE in system config */
  bankCode: string;
}

export interface PaymentDeeplinkParams {
  /** Account number (Số tài khoản) */
  accountNumber: string;
  /** Bank code (e.g. VCB, MB, TCB) */
  bankCode: string;
  /** Amount in VND */
  amount: number;
  /** Transfer content (Nội dung CK) */
  transferContent: string;
  /** Account holder name (Tên chủ tài khoản) */
  accountName?: string;
  /** Return URL after payment success */
  returnUrl?: string;
}

export const bankApps: BankApp[] = [
  { appId: 'vcb', appName: 'Vietcombank', bankName: 'Vietcombank', bankCode: 'VCB' },
  { appId: 'mb', appName: 'MB Bank', bankName: 'MB Bank', bankCode: 'MB' },
  { appId: 'tcb', appName: 'Techcombank', bankName: 'Techcombank', bankCode: 'TCB' },
  { appId: 'bidv', appName: 'BIDV', bankName: 'BIDV', bankCode: 'BIDV' },
  { appId: 'acb', appName: 'ACB One', bankName: 'ACB', bankCode: 'ACB' },
  { appId: 'vpb', appName: 'VPBank NEO', bankName: 'VPBank', bankCode: 'VPB' },
  { appId: 'tpb', appName: 'TPBank', bankName: 'TPBank', bankCode: 'TPB' },
  { appId: 'icb', appName: 'VietinBank iPay', bankName: 'VietinBank', bankCode: 'ICB' },
  { appId: 'vib-2', appName: 'MyVIB 2.0', bankName: 'VIB', bankCode: 'VIB' },
  { appId: 'ocb', appName: 'OCB OMNI', bankName: 'OCB', bankCode: 'OCB' },
  { appId: 'shb', appName: 'SHB Mobile', bankName: 'SHB', bankCode: 'SHB' },
  { appId: 'msb', appName: 'MSB mBanking', bankName: 'MSB', bankCode: 'MSB' },
  { appId: 'hdb', appName: 'HDBank', bankName: 'HDBank', bankCode: 'HDB' },
  { appId: 'scb', appName: 'SCB', bankName: 'SCB', bankCode: 'SCB' },
  { appId: 'lpb', appName: 'Liên Việt 24h', bankName: 'LienVietPostBank', bankCode: 'LPB' },
  { appId: 'seab', appName: 'SeAMobile', bankName: 'SeABank', bankCode: 'SEAB' },
  { appId: 'cake', appName: 'Cake by VPBank', bankName: 'Cake by VPBank', bankCode: 'CAKE' },
  { appId: 'timo', appName: 'Timo', bankName: 'Timo', bankCode: 'TIMO' },
];

/**
 * Get the deeplink URL to open a banking app with full payment params
 * Format: https://dl.vietqr.io/pay?ba=STK@BANK&am=AMOUNT&tn=INFO&app=APPID&bn=NAME
 *
 * @param appId - Banking app ID (e.g. 'vcb', 'mb', 'tcb')
 * @param params - Payment parameters
 */
export function getBankAppDeeplink(appId: string, params?: PaymentDeeplinkParams): string {
  const url = new URL('https://dl.vietqr.io/pay');
  url.searchParams.set('app', appId);

  if (params) {
    // ba = "accountNumber@bankCode" format
    const accountRef = `${params.accountNumber}@${params.bankCode.toUpperCase()}`;
    url.searchParams.set('ba', accountRef);

    if (params.amount > 0) {
      url.searchParams.set('am', params.amount.toString());
    }
    if (params.transferContent) {
      url.searchParams.set('tn', params.transferContent);
    }
    if (params.accountName) {
      url.searchParams.set('bn', params.accountName);
    }
    if (params.returnUrl) {
      url.searchParams.set('url', params.returnUrl);
    }
  }

  return url.toString();
}

/**
 * Find matching bank app(s) for a given QR_BANK_CODE from config
 */
export function findBankAppsByCode(bankCode: string): BankApp[] {
  const code = bankCode.toUpperCase();
  return bankApps.filter((app) => app.bankCode === code);
}

/**
 * Get all available bank apps
 */
export function getAllBankApps(): BankApp[] {
  return bankApps;
}

/**
 * Get the primary (first) bank app for a given bank code
 */
export function getPrimaryBankApp(bankCode: string): BankApp | null {
  const apps = findBankAppsByCode(bankCode);
  return apps.length > 0 ? apps[0] : null;
}
