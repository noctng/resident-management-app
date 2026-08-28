const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');
const { saveImg } = require('../utils/fileHelpers');
const { sendPushToApartment } = require('../services/pushService');

const ff = (r) => ({
    id: r.id,
    residentId: r.resident_id,
    residentName: r.residents ? r.residents.name : null,
    apartmentId: r.apartment_id,
    apartmentCode: r.apartments ? r.apartments.code : null,
    content: r.content,
    imageData: (r.image_data || []).filter(Boolean),
    status: r.status,
    submittedAt: r.submitted_at,
    adminResponseContent: r.admin_response_content,
    adminResponseImageData: (r.admin_response_image_data || []).filter(Boolean),
    resolvedByUsername: r.users ? r.users.username : null,
    resolvedAt: r.resolved_at,
});

exports.getAllFeedback = async (req, res) => {
    try {
        const feedback = await prisma.resident_feedback.findMany({
            include: {
                residents: { select: { name: true } },
                apartments: { select: { code: true } },
                users: { select: { username: true } },
            },
            orderBy: { submitted_at: 'desc' },
        });
        res.json(feedback.map(ff));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.getFeedbackByApartment = async (req, res) => {
    try {
        const feedback = await prisma.resident_feedback.findMany({
            where: { apartment_id: req.params.apartmentId },
            orderBy: { submitted_at: 'desc' },
            // Note: Original didn't join for names here, but we can if we want consistent formatter format.
            // ff expects relations. Let's include them.
            include: {
                residents: { select: { name: true } },
                apartments: { select: { code: true } },
                users: { select: { username: true } },
            },
        });
        res.json(feedback.map(ff));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.createFeedback = async (req, res) => {
    try {
        const { residentId, apartmentId, content } = req.body;
        const id = `feedback_${generateRandomId()}`;
        const ims = (req.files || []).map((f, i) => saveImg(f, id, i, 'pic'));

        const newFeedback = await prisma.resident_feedback.create({
            data: {
                id,
                resident_id: residentId,
                apartment_id: apartmentId,
                content,
                image_data: ims,
            },
            include: {
                residents: { select: { name: true } },
                apartments: { select: { code: true } },
            },
        });

        res.status(201).json(ff(newFeedback));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.resolveFeedback = async (req, res) => {
    try {
        const ims = (req.files || []).map((f, i) => saveImg(f, req.params.id, i, 'res'));

        const resolvedFeedback = await prisma.resident_feedback.update({
            where: { id: req.params.id },
            data: {
                status: 'RESOLVED',
                admin_response_content: req.body.adminResponseContent,
                admin_response_image_data: ims,
                resolved_by_user_id: req.user.id,
                resolved_at: new Date(),
            },
            include: {
                residents: { select: { name: true } },
                apartments: { select: { code: true } },
                users: { select: { username: true } },
            },
        });

        res.json(ff(resolvedFeedback));

        // Push notification to apartment residents
        sendPushToApartment(resolvedFeedback.apartment_id, {
            title: '📢 Phản ánh của bạn đã được xử lý',
            body: resolvedFeedback.admin_response_content
                ? `BQL: "${resolvedFeedback.admin_response_content.slice(0, 100)}"`
                : `Phản ánh về "${resolvedFeedback.content.slice(0, 60)}" đã được BQL giải quyết xong.`,
            url: '/?tab=feedback',
            tag: `feedback-${resolvedFeedback.id}`,
        }).catch(console.error);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};
