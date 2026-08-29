const bcrypt = require('bcrypt');
const { generateRandomId } = require('../utils/helpers');
const { logAudit } = require('../utils/serverLogger');
const repo = require('../repositories/userRepository');

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Mk@12345';

const getAllUsers = async () => repo.findAll();

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

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
};
