const svc = require('../services/announcementService');

exports.getPublished = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await svc.listPublished({ limit, offset });
    res.json(result);
  } catch (err) {
    console.error('[Announcements] getPublished error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.getById = async (req, res) => {
  try {
    const post = await svc.getById(req.params.id, Boolean(req.user?.isAdmin));
    res.json(post);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await svc.listAll();
    res.json(result);
  } catch (err) {
    console.error('[Announcements] getAll error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.create = async (req, res) => {
  try {
    const post = await svc.create(req.body, req.user.id);
    res.status(201).json(post);
  } catch (err) {
    console.error('[Announcements] create error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await svc.getById(req.params.id, true);
    const updated = await svc.update(req.params.id, req.body, existing);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

exports.publish = async (req, res) => {
  try {
    const updated = await svc.publish(req.params.id);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

exports.unpublish = async (req, res) => {
  try {
    const updated = await svc.unpublish(req.params.id);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

exports.uploadMedia = async (req, res) => {
  try {
    const result = await svc.uploadMedia(req.body.image_base64);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi upload ảnh' });
  }
};

exports.remove = async (req, res) => {
  try {
    await svc.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('[Announcements] delete error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
