const { TOKEN_COOKIE_NAME, COOKIE_OPTIONS } = require('../config/auth');
const { logAudit } = require('../utils/serverLogger');
const service = require('../services/authService');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await service.login(username, password, req);

    if (!result.success) return res.status(result.status).json({ message: result.message });

    res.cookie(result.cookie.name, result.token, {
      ...COOKIE_OPTIONS,
      maxAge: result.cookie.maxAge,
    });

    res.json({
      message: 'Đăng nhập thành công.',
      user: result.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.logout = (req, res) => {
  if (req.user || req.resident) {
    logAudit({
      req,
      action: 'USER_LOGOUT',
      targetType: 'Auth',
      details: 'Người dùng đăng xuất khỏi hệ thống',
      statusCode: 200,
    });
  }
  res.clearCookie(TOKEN_COOKIE_NAME, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: '/',
  });
  res.status(200).json({ message: 'Đăng xuất thành công.' });
};

exports.getSession = async (req, res) => {
  try {
    const result = await service.getSession(req.user, req.resident);
    if (result) return res.json(result);
    res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.residentLogin = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    const result = await service.residentLogin(phoneNumber, password, req);

    if (!result.success) return res.status(result.status).json({ message: result.message });

    res.cookie(result.cookie.name, result.token, {
      ...COOKIE_OPTIONS,
      maxAge: result.cookie.maxAge,
    });

    res.json({
      resident: result.resident,
      apartments: result.apartments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.changeResidentPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await service.changeResidentPassword(req.params.residentId, currentPassword, newPassword, req);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.json({ message: result.message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.changeUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await service.changeUserPassword(req.user.id, currentPassword, newPassword, req);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.json({ message: result.message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
