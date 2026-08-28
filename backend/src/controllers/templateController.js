const prisma = require('../config/prisma');

exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await prisma.email_templates.findMany({
            orderBy: { code: 'asc' },
        });
        res.json(templates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi tải danh sách mẫu email' });
    }
};

exports.updateTemplate = async (req, res) => {
    const { code } = req.params;
    const { subject, body } = req.body;
    try {
        const updated = await prisma.email_templates.update({
            where: { code },
            data: { subject, body },
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi cập nhật mẫu email' });
    }
};
