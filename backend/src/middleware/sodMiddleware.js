// Separation of Duties (SoD) guard — Blueprint A.4 nguyên tắc tách nhiệm vụ
// "Hệ thống chặn cấu hình gán vai trò vi phạm SoD"
// Quy tắc: cùng 1 user không được vừa thực hiện action gốc vừa action phê duyệt
// trên cùng 1 tài nguyên (creator != approver; meter_reader != period_closer; drafter != signer)

// Định nghĩa cặp xung đột: action A mâu thuẫn với action B trên cùng module
const SOD_RULES = [
  // Người lập phiếu thu ≠ người duyệt hoàn tiền
  { module: 'unified_billing', conflict: ['C', 'A'] },
  { module: 'billing', conflict: ['C', 'A'] },
  // Người ghi chỉ số công tơ ≠ người chốt kỳ
  { module: 'meter_reading', conflict: ['C', 'A'] },
  { module: 'utilities', conflict: ['C', 'A'] },
  // Người soạn HĐ ≠ người trình ký
  { module: 'contracts', conflict: ['U', 'A'] },
  // Duyệt giữ chỗ ≠ tạo giữ chỗ (cùng user)
  { module: 'deposits', conflict: ['C', 'A'] },
];

// Kiểm tra SoD tại runtime: user đã thực hiện action `doneAction` trên module này trước đó?
// Nếu tài nguyên được tạo/bởi chính user này mà đang gọi action xung đột -> chặn.
// req.sodContext = { module, action, ownerId } do controller gán trước khi gọi next().
const enforceSoD = (req, res, next) => {
  const ctx = req.sodContext;
  if (!ctx) return next(); // không áp dụng SoD cho route này

  const rule = SOD_RULES.find((r) => r.module === ctx.module);
  if (!rule) return next();

  // Nếu user hiện tại CHÍNH LÀ owner (người tạo/sửa) và đang gọi action xung đột -> 403
  if (ctx.ownerId && req.user && ctx.ownerId === req.user.id) {
    const [a, b] = rule.conflict;
    if (ctx.action === a || ctx.action === b) {
      return res.status(403).json({
        message: 'Vi phạm nguyên tắc tách nhiệm vụ (SoD): người thực hiện không được vừa tạo/vừa duyệt cùng một hồ sơ.',
      });
    }
  }
  return next();
};

// Hàm helper để controller gán context: req.sodContext = makeSoD(module, action, ownerId)
const makeSoD = (module, action, ownerId) => ({ module, action, ownerId });

module.exports = { enforceSoD, makeSoD, SOD_RULES };
