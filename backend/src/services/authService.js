const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  JWT_ADMIN_SECRET,
  JWT_RESIDENT_SECRET,
  TOKEN_COOKIE_NAME,
  COOKIE_OPTIONS,
} = require('../config/auth');
const { logAudit } = require('../utils/serverLogger');
const repo = require('../repositories/authRepository');

const SALT_ROUNDS = 10;

const buildUserToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, role: user.role, permissions: user.permissions, type: 'admin' },
    JWT_ADMIN_SECRET,
    { expiresIn: '1d' }
  );

const buildResidentToken = (resident) =>
  jwt.sign({ id: resident.id, name: resident.name, type: 'resident' }, JWT_RESIDENT_SECRET, { expiresIn: '7d' });

// ============ LOGIN ============
const login = async (username, password, req) => {
  const user = await repo.findUserByUsername(username);

  if (!user) {
    logAudit({
      req,
      action: 'LOGIN_FAILED',
      targetType: 'Auth',
      details: `Đăng nhập thất bại: Tài khoản "${username}" không tồn tại`,
      statusCode: 401,
    });
    return { success: false, status: 401, message: 'Sai tài khoản hoặc mật khẩu.' };
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (isMatch) {
    const token = buildUserToken(user);
    logAudit({
      req,
      userId: user.id,
      username: user.username,
      action: 'USER_LOGIN',
      targetType: 'Auth',
      targetId: user.id,
      targetName: user.username,
      details: `Đăng nhập hệ thống thành công (Role: ${user.role === 0 ? 'Admin' : 'Staff'})`,
      statusCode: 200,
    });
    return {
      success: true,
      token,
      cookie: { name: TOKEN_COOKIE_NAME, maxAge: 24 * 60 * 60 * 1000 },
      user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
    };
  } else {
    logAudit({
      req,
      action: 'LOGIN_FAILED',
      targetType: 'Auth',
      targetId: user.id,
      targetName: user.username,
      details: `Đăng nhập thất bại: Sai mật khẩu cho tài khoản "${username}"`,
      statusCode: 401,
    });
    return { success: false, status: 401, message: 'Sai tài khoản hoặc mật khẩu.' };
  }
};

// ============ GET SESSION ============
const getSession = async (reqUser, reqResident) => {
  if (reqUser) {
    const user = await repo.findUserById(reqUser.id);
    if (user) return { user, userType: 'admin' };
    return null;
  } else if (reqResident) {
    const resident = await repo.findResidentById(reqResident.id);
    if (resident) {
      const apartments = resident.occupancies
        .map((o) => o.apartments)
        .sort((a, b) => a.code.localeCompare(b.code));
      return {
        user: {
          resident: { id: resident.id, name: resident.name, canUseAmenities: resident.can_use_amenities },
          apartments,
        },
        userType: 'resident',
      };
    }
  }
  return null;
};

// ============ RESIDENT LOGIN ============
const residentLogin = async (phoneNumber, password, req) => {
  const resident = await repo.findResidentByPhone(phoneNumber);
  if (!resident || !resident.is_active) {
    return { success: false, status: 401, message: 'Tài khoản không đúng hoặc bị khóa.' };
  }

  const account = await repo.findResidentAccount(resident.id);
  if (!account || !(await bcrypt.compare(password, account.password_hash))) {
    return { success: false, status: 401, message: 'Sai mật khẩu.' };
  }

  const occupancies = await repo.findOccupancies(resident.id);
  if (occupancies.length === 0) {
    return { success: false, status: 403, message: 'Bạn chưa thuộc căn hộ nào.' };
  }

  const apartments = occupancies.map((o) => o.apartments).sort((a, b) => a.code.localeCompare(b.code));
  const token = buildResidentToken(resident);

  logAudit({
    req,
    userId: resident.id,
    username: resident.phone_number,
    action: 'RESIDENT_LOGIN',
    targetType: 'Resident',
    targetId: resident.id,
    targetName: resident.name,
    details: `Cư dân đăng nhập cổng portal (Căn hộ: ${apartments.map((a) => a.code).join(', ')})`,
    statusCode: 200,
  });

  return {
    success: true,
    token,
    cookie: { name: TOKEN_COOKIE_NAME, maxAge: 7 * 24 * 60 * 60 * 1000 },
    resident: { id: resident.id, name: resident.name, canUseAmenities: resident.can_use_amenities },
    apartments,
  };
};

// ============ CHANGE RESIDENT PASSWORD ============
const changeResidentPassword = async (residentId, currentPassword, newPassword, req) => {
  if (req.resident?.id !== residentId) {
    return { success: false, status: 403, message: 'Quyền truy cập bị từ chối.' };
  }
  const account = await repo.findResidentAccount(residentId);
  if (!account) return { success: false, status: 404, message: 'Không tìm thấy tài khoản cư dân.' };

  const isMatch = await bcrypt.compare(currentPassword, account.password_hash);
  if (!isMatch) return { success: false, status: 400, message: 'Mật khẩu hiện tại không đúng.' };

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await repo.updateResidentPassword(residentId, hash);

  logAudit({
    req,
    action: 'CHANGE_PASSWORD',
    targetType: 'ResidentAccount',
    targetId: residentId,
    details: 'Cư dân đổi mật khẩu tài khoản cổng portal',
    statusCode: 200,
  });

  return { success: true, message: 'Đổi mật khẩu thành công.' };
};

// ============ CHANGE USER PASSWORD ============
const changeUserPassword = async (userId, currentPassword, newPassword, req) => {
  const user = await repo.findUserByIdRaw(userId);
  if (!user) return { success: false, status: 404, message: 'Không tìm thấy người dùng.' };

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) return { success: false, status: 400, message: 'Mật khẩu hiện tại không đúng.' };

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await repo.updateUserPassword(userId, hash);

  logAudit({
    req,
    action: 'CHANGE_PASSWORD',
    targetType: 'User',
    targetId: userId,
    targetName: user.username,
    details: 'Nhân viên đổi mật khẩu đăng nhập',
    statusCode: 200,
  });

  return { success: true, message: 'Đổi mật khẩu thành công.' };
};

module.exports = {
  buildUserToken,
  buildResidentToken,
  login,
  getSession,
  residentLogin,
  changeResidentPassword,
  changeUserPassword,
};
