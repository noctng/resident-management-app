const bcrypt = require('bcrypt');
const { generateRandomId } = require('../utils/helpers');
const { logAudit } = require('../utils/serverLogger');
const repo = require('../repositories/userRepository');

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Mk@12345';

const getAllUsers = async () => {
  const rows = await repo.findAll();
  // Flatten userRoles -> roles: RoleInfo[]
  return rows.map((u) => ({
    ...u,
    roles: (u.userRoles || []).map((ur) => ur.roles),
  }));
};

const createUser = async (body, req) => {
  const { username, password, role, permissions } = body;

  const exist = await repo.findByUsername(username);
  if (exist) return { success: false, status: 400, message: 'Tên đăng nhập đã tồn tại.' };

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = `user_${generateRandomId()}`;
  const finalRole = role === undefined || role === null ? 1 : role;

  const newUser = await repo.create({
    id,
    username,
    password_hash: hash,
    role: finalRole,
    permissions: permissions || [],
  });

  logAudit({
    req,
    action: 'CREATE_USER',
    targetType: 'User',
    targetId: newUser.id,
    targetName: newUser.username,
    details: `Tạo tài khoản người dùng mới: "${newUser.username}" (Role: ${newUser.role === 0 ? 'Admin' : 'Staff'}, Quyền: ${(newUser.permissions || []).join(', ') || 'Không'})`,
    newValue: { role: newUser.role, permissions: newUser.permissions },
    statusCode: 201,
  });

  return { success: true, user: newUser, status: 201 };
};

const updateUser = async (id, body, req, currentUser) => {
  const { role, permissions } = body;

  if (id === currentUser.id && currentUser.role === 0 && role !== 0) {
    return { success: false, status: 400, message: 'Không thể tự hạ quyền Admin của chính mình.' };
  }

  const existingUser = await repo.findById(id);
  if (!existingUser) return { success: false, status: 404, message: 'Không tìm thấy người dùng.' };

  const updatedUser = await repo.update(id, { role, permissions });

  logAudit({
    req,
    action: 'UPDATE_USER_PERMISSION',
    targetType: 'User',
    targetId: updatedUser.id,
    targetName: updatedUser.username,
    details: `Cập nhật vai trò & quyền truy cập của "${updatedUser.username}": Role ${existingUser.role} → ${updatedUser.role}, Quyền: ${(updatedUser.permissions || []).join(', ') || 'Không'}`,
    oldValue: { role: existingUser.role, permissions: existingUser.permissions },
    newValue: { role: updatedUser.role, permissions: updatedUser.permissions },
    statusCode: 200,
  });

  return { success: true, user: updatedUser };
};

const deleteUser = async (id, req, currentUser) => {
  if (id === currentUser.id) {
    return { success: false, status: 400, message: 'Không thể tự xóa tài khoản.' };
  }

  const userToDelete = await repo.findById(id);
  if (!userToDelete) return { success: false, status: 404, message: 'Không tìm thấy người dùng.' };

  await repo.delete(id);

  logAudit({
    req,
    action: 'DELETE_USER',
    targetType: 'User',
    targetId: userToDelete.id,
    targetName: userToDelete.username,
    details: `Xóa tài khoản người dùng: "${userToDelete.username}"`,
    statusCode: 204,
  });

  return { success: true, status: 204 };
};

const resetPassword = async (id, req) => {
  const user = await repo.findByIdRaw(id);
  if (!user) return { success: false, status: 404, message: 'Không tìm thấy người dùng.' };

  if (user.username === 'admin') {
    return { success: false, status: 403, message: 'Không thể reset mật khẩu admin.' };
  }

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  await repo.updatePassword(id, hash);

  logAudit({
    req,
    action: 'RESET_PASSWORD',
    targetType: 'User',
    targetId: user.id,
    targetName: user.username,
    details: `Reset mật khẩu cho người dùng "${user.username}" về mật khẩu mặc định`,
    statusCode: 200,
  });

  return { success: true, message: `Mật khẩu đã được reset thành công. Mật khẩu mới: ${DEFAULT_PASSWORD}` };
};

// Gán vai trò RBAC (1 user nhiều vai trò) — thay thế toàn bộ user_roles
const updateUserRoles = async (id, roles, req) => {
  const user = await repo.findUserByIdRaw(id);
  if (!user) return { success: false, status: 404, message: 'Không tìm thấy người dùng.' };

  // Validate role codes tồn tại
  const valid = await prisma.roles.findMany({ where: { code: { in: roles } }, select: { code: true } });
  const validCodes = valid.map((r) => r.code);
  const invalid = roles.filter((c) => !validCodes.includes(c));
  if (invalid.length > 0) {
    return { success: false, status: 400, message: `Vai trò không hợp lệ: ${invalid.join(', ')}` };
  }

  // Thay thế user_roles
  await prisma.user_roles.deleteMany({ where: { user_id: id } });
  if (roles.length > 0) {
    await prisma.user_roles.createMany({
      data: roles.map((code) => ({ user_id: id, role_code: code })),
    });
  }

  // Nếu chứa ADMIN/MANAGER -> đồng bộ role Int cũ = 0/1 để compat
  let legacyRole = user.role;
  if (roles.includes('ADMIN')) legacyRole = 0;
  else if (roles.includes('MANAGER')) legacyRole = 1;
  if (legacyRole !== user.role) {
    await repo.updateUserRole ? repo.updateUserRole(id, legacyRole) : null;
  }

  logAudit({
    req,
    userId: req.user?.id,
    username: req.user?.username,
    action: 'UPDATE_USER_ROLES',
    targetType: 'User',
    targetId: user.id,
    targetName: user.username,
    details: `Gán vai trò RBAC: ${roles.join(', ') || '(none)'}`,
    statusCode: 200,
  });

  const updated = await repo.findUserByIdRaw(id);
  return { success: true, user: updated };
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  updateUserRoles,
};
