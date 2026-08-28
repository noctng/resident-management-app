const puppeteer = require('puppeteer');
const { generateInvoicePDFTemplate } = require('../templates/invoicePDFTemplate');

/**
 * Generate PDF from HTML template
 */
async function generatePDF(htmlContent, options = {}) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm',
            },
            ...options,
        });

        return pdfBuffer;
    } catch (error) {
        console.error('[PDF] Error generating PDF:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Generate invoice PDF from fee data
 */
async function generateInvoicePDF(feeData) {
    const {
        id,
        apartment_code,
        house_type,
        floor,
        area,
        resident_name,
        month,
        year,
        management_fee,
        management_fee_per_sqm,
        internet_fee,
        cable_tv_fee,
        security_fee,
        cleaning_fee,
        parking_car_quantity,
        parking_car_fee,
        parking_motorbike_quantity,
        parking_motorbike_fee,
        total_amount,
        status,
        payment_date,
        payment_method,
        created_at,
    } = feeData;

    // Build fees array for table
    const fees = [];

    if (Number(management_fee) > 0) {
        fees.push({
            name: 'Phí Quản Lý',
            unitPrice: `${Number(management_fee_per_sqm).toLocaleString('vi-VN')} VND/m²`,
            quantity: `${area} m²`,
            amount: Number(management_fee),
        });
    }

    if (Number(internet_fee) > 0) {
        fees.push({
            name: 'Phí Internet',
            unitPrice: `${Number(internet_fee).toLocaleString('vi-VN')} VND`,
            quantity: '1',
            amount: Number(internet_fee),
        });
    }

    if (Number(cable_tv_fee) > 0) {
        fees.push({
            name: 'Phí Truyền Hình',
            unitPrice: `${Number(cable_tv_fee).toLocaleString('vi-VN')} VND`,
            quantity: '1',
            amount: Number(cable_tv_fee),
        });
    }

    if (Number(security_fee) > 0) {
        fees.push({
            name: 'Phí Bảo Vệ',
            unitPrice: `${Number(security_fee).toLocaleString('vi-VN')} VND`,
            quantity: '1',
            amount: Number(security_fee),
        });
    }

    if (Number(cleaning_fee) > 0) {
        fees.push({
            name: 'Phí Vệ Sinh',
            unitPrice: `${Number(cleaning_fee).toLocaleString('vi-VN')} VND`,
            quantity: '1',
            amount: Number(cleaning_fee),
        });
    }

    if (Number(parking_car_fee) > 0) {
        const unitFee = Number(parking_car_fee) / Number(parking_car_quantity);
        fees.push({
            name: 'Phí Gửi Xe Ô Tô',
            unitPrice: `${unitFee.toLocaleString('vi-VN')} VND/xe`,
            quantity: `${parking_car_quantity} xe`,
            amount: Number(parking_car_fee),
        });
    }

    if (Number(parking_motorbike_fee) > 0) {
        const unitFee = Number(parking_motorbike_fee) / Number(parking_motorbike_quantity);
        fees.push({
            name: 'Phí Gửi Xe Máy',
            unitPrice: `${unitFee.toLocaleString('vi-VN')} VND/xe`,
            quantity: `${parking_motorbike_quantity} xe`,
            amount: Number(parking_motorbike_fee),
        });
    }

    // Generate invoice number
    const invoiceNumber = `HD${year}${String(month).padStart(2, '0')}-${apartment_code}`;

    // Generate HTML
    const htmlContent = generateInvoicePDFTemplate({
        apartmentCode: apartment_code,
        houseType: house_type,
        floor,
        area,
        residentName: resident_name,
        month,
        year,
        fees,
        totalAmount: Number(total_amount),
        status,
        paymentDate: payment_date,
        paymentMethod: payment_method,
        invoiceNumber,
        createdDate: created_at,
    });

    // Generate PDF
    const pdfBuffer = await generatePDF(htmlContent);

    return {
        buffer: pdfBuffer,
        filename: `HoaDon_${apartment_code}_${month}-${year}.pdf`,
    };
}

module.exports = {
    generatePDF,
    generateInvoicePDF,
};
