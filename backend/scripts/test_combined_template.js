const { generateCombinedBillEmail } = require('../src/templates/combinedBillEmail');
const fs = require('fs');
const path = require('path');

const dummyData = {
    residentName: 'Nguyen Van A',
    apartmentCode: 'A101',
    month: 10,
    year: 2023,
    water_old_reading: 100,
    water_new_reading: 110,
    water_usage: 10,
    water_cost: 150000,
    electricity_old_reading: 200,
    electricity_new_reading: 250,
    electricity_usage: 50,
    electricity_cost: 100000,
    management_fee_breakdown: {
        management_fee: 500000,
        internet_fee: 200000,
        cable_tv_fee: 0,
        parking_car_fee: 1000000,
        parking_motorbike_fee: 0,
        security_fee: 0,
        cleaning_fee: 0,
    },
    management_fee_cost: 1700000,
    grand_total: 1950000,
    dueDate: '15/11/2023',
    transferContent: 'A101 T10/2023',
    bankAccount: {
        accountName: 'BQL TOA NHA',
        accountNumber: '99998888',
        bankName: 'MB BANK',
    },
    qrCodeUrl: 'https://via.placeholder.com/150',
};

try {
    const html = generateCombinedBillEmail(dummyData);
    const outputPath = path.join(__dirname, 'test_output_combined_bill.html');
    fs.writeFileSync(outputPath, html);
    console.log('Successfully generated HTML template at:', outputPath);
    console.log('Sample content preview:', html.substring(0, 200));
} catch (error) {
    console.error('Error generating template:', error);
}
