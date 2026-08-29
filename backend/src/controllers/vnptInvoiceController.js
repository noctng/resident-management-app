const service = require('../services/vnptInvoiceApiService');

exports.getVnptConfig = async (req, res) => {
  try {
    const config = await service.getVnptConfigMasked();
    res.json(config);
  } catch (err) {
    console.error('Lỗi tải cấu hình VNPT Invoice:', err);
    res.status(500).json({ message: 'Lỗi tải cấu hình HĐĐT VNPT' });
  }
};

exports.updateVnptConfig = async (req, res) => {
  try {
    await service.updateVnptConfig(req.body || {});
    res.json({ message: 'Cập nhật cấu hình HĐĐT VNPT thành công' });
  } catch (err) {
    console.error('Lỗi lưu cấu hình VNPT Invoice:', err);
    res.status(500).json({ message: 'Lỗi lưu cấu hình HĐĐT VNPT' });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const { status, body } = await service.testConnection();
    res.status(status).json(body);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.previewXml = async (req, res) => {
  try {
    const { type = 'utility', apartmentCode = 'CAN03-01', month = 8, year = 2026 } = req.body || {};
    const data = await service.previewXml(type, apartmentCode, month, year);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Lỗi tạo preview XML:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoiceView = async (req, res) => {
  try {
    const data = await service.getInvoiceView(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Lỗi tải bản xem hóa đơn:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadInvoicePdf = async (req, res) => {
  try {
    const { buffer, filename } = await service.downloadInvoicePdf(req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error('Lỗi xuất PDF hóa đơn:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadInvoiceXml = async (req, res) => {
  try {
    const { xml, filename } = await service.downloadInvoiceXml(req.query);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (err) {
    console.error('Lỗi xuất XML hóa đơn:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.publishInvoice = async (req, res) => {
  try {
    const { invData, realInvoiceNo, realMccqt, isSimulated } = await service.publishInvoice(req.body, req.user);
    service.logPublish(req.user, invData, realInvoiceNo, realMccqt);
    res.json({
      success: true,
      isOfficial: true,
      isSimulated,
      fkey: invData.fkey,
      invoiceNumber: realInvoiceNo,
      mccqt: realMccqt,
      message: `✅ Đã xuất Hóa Đơn Điện Tử thành công lên VNPT! (Mã Fkey: ${invData.fkey}, Số HĐ: ${realInvoiceNo})`,
    });
  } catch (err) {
    console.error('Lỗi phát hành HĐĐT VNPT:', err);
    res.status(500).json({ success: false, message: 'Lỗi phát hành hóa đơn: ' + err.message });
  }
};
