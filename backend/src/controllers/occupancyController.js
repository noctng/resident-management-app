const prisma = require('../config/prisma');

exports.getAllOccupancies = async (req, res) => {
    try {
        const occupancies = await prisma.occupancies.findMany();
        res.json(
            occupancies.map((o) => ({ apartmentId: o.apartment_id, residentId: o.resident_id }))
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.addOccupancy = async (req, res) => {
    try {
        await prisma.occupancies.create({
            data: {
                apartment_id: req.body.apartmentId,
                resident_id: req.body.residentId,
            },
        });
        res.status(201).json(req.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.removeOccupancy = async (req, res) => {
    try {
        await prisma.occupancies.delete({
            where: {
                apartment_id_resident_id: {
                    apartment_id: req.params.apartmentId,
                    resident_id: req.params.residentId,
                },
            },
        });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};
