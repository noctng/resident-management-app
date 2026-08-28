const { escapeXml, formatDateVN, readVietnameseCurrency } = require('./currencyHelper');

/**
 * Build standard Customer XML for VNPT UpdateCus API
 */
function buildCustomerXml(customer) {
  const cusType = customer.taxCode ? '1' : '0';
  return `<Customers>
  <Customer>
    <Name>${escapeXml(customer.name || customer.code || 'Khách hàng')}</Name>
    <Code>${escapeXml(customer.code)}</Code>
    <TaxCode>${escapeXml(customer.taxCode || '')}</TaxCode>
    <Address>${escapeXml(customer.address || '')}</Address>
    <BankAccountName>${escapeXml(customer.bankAccountName || '')}</BankAccountName>
    <BankName>${escapeXml(customer.bankName || '')}</BankName>
    <BankNumber>${escapeXml(customer.bankNumber || '')}</BankNumber>
    <Email>${escapeXml(customer.email || '')}</Email>
    <Phone>${escapeXml(customer.phone || '')}</Phone>
    <CusType>${cusType}</CusType>
  </Customer>
</Customers>`;
}

/**
 * Build standard Invoice XML for VNPT ImportAndPublishInv API (Thông tư 78)
 */
function buildInvoiceXml({
  fkey,
  customerCode,
  buyerName,
  companyName,
  customerName,
  customerAddress,
  customerPhone,
  customerTaxCode,
  customerEmail,
  month,
  year,
  products = [],
  totalBeforeVat,
  vatRate = 8,
  vatAmount,
  grandTotal,
  paymentMethod = 'Chuyển khoản',
  paymentStatus = 1,
  arisingDate,
}) {
  const kindOfService = month && year ? `${String(month).padStart(2, '0')}/${year}` : formatDateVN(new Date()).slice(3);
  const dateStr = arisingDate ? formatDateVN(arisingDate) : formatDateVN(new Date());
  const amountInWords = readVietnameseCurrency(grandTotal);

  let productsXml = '';
  products.forEach((p) => {
    const pQty = p.quantity || 1;
    const pPrice = Math.round(p.price || 0);
    const pTotal = Math.round(p.amount !== undefined ? p.amount : pQty * pPrice);
    const pVatRate = p.vatRate !== undefined ? p.vatRate : (vatRate !== undefined ? vatRate : 8);
    const pVatAmount = p.vatAmount !== undefined ? p.vatAmount : Math.round((pTotal * pVatRate) / 100);
    const pAmount = p.grandTotal !== undefined ? Math.round(p.grandTotal) : (pTotal + pVatAmount);

    productsXml += `
        <Product>
          <ProdName>${escapeXml(p.name)}</ProdName>
          <ProdUnit>${escapeXml(p.unit || '')}</ProdUnit>
          <ProdQuantity>${pQty}</ProdQuantity>
          <ProdPrice>${pPrice}</ProdPrice>
          <Amount>${pAmount}</Amount>
          <Total>${pTotal}</Total>
          <VATRate>${pVatRate}</VATRate>
          <VATAmount>${pVatAmount}</VATAmount>
          <IsSum>0</IsSum>
        </Product>`;
  });

  return `<Invoices>
  <Inv>
    <key>${escapeXml(fkey)}</key>
    <Invoice>
      <CusCode>${escapeXml(customerCode)}</CusCode>
      <CusName>${escapeXml(companyName || customerName || customerCode)}</CusName>
      <Buyer>${escapeXml(buyerName || customerName || '')}</Buyer>
      <CusAddress>${escapeXml(customerAddress || '')}</CusAddress>
      <CusPhone>${escapeXml(customerPhone || '')}</CusPhone>
      <CusTaxCode>${escapeXml(customerTaxCode || '')}</CusTaxCode>
      <PaymentMethod>${escapeXml(paymentMethod)}</PaymentMethod>
      <KindOfService>${escapeXml(kindOfService)}</KindOfService>
      <Products>${productsXml}
      </Products>
      <Total>${Math.round(totalBeforeVat)}</Total>
      <DiscountAmount>0</DiscountAmount>
      <VATRate>${vatRate}</VATRate>
      <VATAmount>${Math.round(vatAmount)}</VATAmount>
      <Amount>${Math.round(grandTotal)}</Amount>
      <AmountInWords>${escapeXml(amountInWords)}</AmountInWords>
      <ArisingDate>${dateStr}</ArisingDate>
      <PaymentStatus>${paymentStatus}</PaymentStatus>
      <EmailDeliver>${escapeXml(customerEmail || '')}</EmailDeliver>
    </Invoice>
  </Inv>
</Invoices>`;
}

module.exports = {
  buildCustomerXml,
  buildInvoiceXml
};
