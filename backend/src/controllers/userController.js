const service = require('../services/userService');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await service.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const result = await service.createUser(req.body, req);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.status(201).json(result.user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const result = await service.updateUser(req.params.id, req.body, req, req.user);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.json(result.user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const result = await service.deleteUser(req.params.id, req, req.user);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const result = await service.resetPassword(req.params.id, req);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.json({ message: result.message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi reset mật khẩu' });
  }
};
