const svc = require('../services/feedbackService');

// GET /api/feedback — List all feedback
exports.getAllFeedback = async (req, res) => {
  try {
    const result = await svc.getAllFeedback();
    res.json(result);
  } catch (err) {
    console.error('[Feedback] getAllFeedback error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// GET /api/feedback/apartment/:apartmentId — List feedback for a specific apartment
exports.getFeedbackByApartment = async (req, res) => {
  try {
    const result = await svc.getFeedbackByApartment(req.params.apartmentId);
    res.json(result);
  } catch (err) {
    console.error('[Feedback] getFeedbackByApartment error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// POST /api/feedback — Create feedback (with optional image uploads)
exports.createFeedback = async (req, res) => {
  try {
    const feedback = await svc.createFeedback(req.body, req.files);
    res.status(201).json(feedback);
  } catch (err) {
    console.error('[Feedback] createFeedback error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// PUT /api/feedback/:id/resolve — Resolve feedback (admin response + optional images)
exports.resolveFeedback = async (req, res) => {
  try {
    const feedback = await svc.resolveFeedback(
      req.params.id,
      req.body,
      req.files,
      req.user.id
    );
    res.json(feedback);
  } catch (err) {
    console.error('[Feedback] resolveFeedback error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
