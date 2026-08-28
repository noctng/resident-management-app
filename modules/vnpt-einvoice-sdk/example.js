const { VnptEInvoiceClient } = require('./index');

async function run() {
  const client = new VnptEInvoiceClient({
    serviceUrl: 'https://trungnguyen-daklak-tt78admindemo.vnpt-invoice.com.vn/PublishService.asmx',
    username: 'trungnguyenservices',
    password: 'Tng@123456',
    account: 'trungnguyen_pos',
    acpass: 'Tng@123456',
    pattern: '1/002',
    serial: 'C26TAA',
  });

  console.log('=== 1. KIỂM TRA KẾT NỐI VNPT ===');
  const testRes = await client.testConnection();
  console.log(testRes);

  console.log('\n=== 2. PHÁT HÀNH HÓA ĐƠN THỬ NGHIỆM ===');
  const invData = {
    fkey: 'TEST_INV_' + Date.now(),
    customerCode: 'CAN03-01',
    customerName: 'Hoàng Anh Tú',
    customerAddress: 'Căn hộ CAN03-01, Khu đô thị Thành Phố Cà Phê, Buôn Ma Thuột',
    customerPhone: '0901234567',
    customerEmail: 'info@thanhphocaphe.vn',
    month: 5,
    year: 2026,
    products: [
      {
        name: 'Tiền điện sinh hoạt kỳ 05/2026',
        unit: 'kWh',
        quantity: 10,
        price: 2500,
        amount: 25000,
      },
      {
        name: 'Tiền nước sinh hoạt kỳ 05/2026',
        unit: 'm³',
        quantity: 1,
        price: 10276,
        amount: 10276,
      }
    ],
    totalBeforeVat: 35276,
    vatRate: 8,
    vatAmount: 2822,
    grandTotal: 38098,
    paymentMethod: 'Chuyển khoản / VietQR',
    paymentStatus: 1,
  };

  const publishRes = await client.importAndPublishInvoice(invData);
  console.log(publishRes);
}

run().catch(console.error);
