# PDF Export Feature - Setup Guide

## 1. Install Dependencies

```bash
cd backend
npm install puppeteer
```

**Note:** Puppeteer will download Chromium (~300MB) automatically during installation.

## 2. API Endpoint

### Export Invoice to PDF

```
GET /api/management-fees/:id/pdf
```

**Response:**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="HoaDon_XXX_MM-YYYY.pdf"`

**Example:**

```bash
curl -X GET http://localhost:3002/api/management-fees/fee_123/pdf \
  -b "cookies.txt" \
  --output invoice.pdf
```

## 3. Frontend Integration

The "Tải PDF" button has been added to `MonthlyInvoiceModal.tsx`.

**Usage:**

1. Open invoice detail modal
2. Click "📄 Tải PDF" button
3. PDF will download automatically

## 4. PDF Template Features

The generated PDF includes:

- ✅ Professional invoice design with gradient header
- ✅ Apartment information section
- ✅ Detailed fee breakdown table
- ✅ Payment status and information
- ✅ Invoice number (`HDyearmonth-apartment_code`)
- ✅ Signature section for legal purposes
- ✅ Print-ready format (A4)

## 5. Customization

To customize the PDF template, edit:

```
backend/src/templates/invoicePDFTemplate.js
```

You can modify:

- Colors and branding
- Header/footer content
- Table structure
- Font sizes and styles

## 6. Performance Considerations

**Puppeteer** can be resource-intensive. Consider:

### Option 1: Use puppeteer (Current)

- Pros: Full HTML/CSS support, high quality
- Cons: Memory intensive, slower
- Best for: Low to medium traffic

### Option 2: Switch to PDFKit (Alternative)

```bash
npm install pdfkit
```

- Pros: Faster, lighter weight
- Cons: More manual layout coding
- Best for: High traffic production

## 7. Troubleshooting

**Error: "Failed to launch browser"**

```bash
# Linux: Install dependencies
sudo apt-get install -y libgbm-dev

# Windows: Should work out of the box
```

**Error: "Timeout waiting for browser"**

- Increase timeout in `pdfService.js`
- Check server memory allocation
- Consider using headless mode

**PDF is blank or incomplete:**

- Check if HTML template is valid
- Ensure `waitUntil: 'networkidle0'` in page.setContent
- Verify data is being passed correctly

## 8. Production Deployment

For production environments:

1. **Use Environment Variable:**

```env
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

2. **Docker:** Use `browserless/chrome` image

```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

3. **Serverless:** Consider using Vercel's `@vercel/og` or AWS Lambda with Chrome Layer

## 9. Security

- ✅ PDF generation requires authentication
- ✅ Only admin users can export PDFs
- ✅ No sensitive system data exposed in PDF
- ✅ Files are generated on-demand (not stored)

## 10. Testing

Test PDF generation:

```bash
# 1. Get a fee ID
curl http://localhost:3002/api/management-fees?month=1&year=2026 \
  -b "cookies.txt"

# 2. Download PDF
curl http://localhost:3002/api/management-fees/FEE_ID/pdf \
  -b "cookies.txt" \
  --output test_invoice.pdf

# 3. Verify PDF
# Open test_invoice.pdf and check content
```
