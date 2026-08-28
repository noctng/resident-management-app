const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res) => {
    try {
        const [apartmentCount, residentCount, occupancyCount, feedbackPending, feedbackResolved] =
            await Promise.all([
                prisma.apartments.count(),
                prisma.residents.count(),
                prisma.occupancies.count(),
                prisma.resident_feedback.count({ where: { status: 'SUBMITTED' } }),
                prisma.resident_feedback.count({ where: { status: 'RESOLVED' } }),
            ]);

        res.json({
            apartmentCount,
            residentCount,
            occupancyCount,
            feedback: {
                pending: feedbackPending,
                resolved: feedbackResolved,
            },
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Lỗi lấy dữ liệu dashboard' });
    }
};
