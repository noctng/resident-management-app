const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).

// --- residents ---
async function listAll() {
    return prisma.residents.findMany({ orderBy: { name: 'asc' } });
}

async function findById(id) {
    return prisma.residents.findUnique({ where: { id } });
}

async function create(data) {
    return prisma.residents.create({ data });
}

async function update(id, data) {
    return prisma.residents.update({ where: { id }, data });
}

async function updateStatus(id, isActive) {
    return prisma.residents.update({
        where: { id },
        data: { is_active: isActive },
        select: { id: true, is_active: true },
    });
}

async function updateAmenityAccess(id, canUseAmenities) {
    return prisma.residents.update({
        where: { id },
        data: { can_use_amenities: canUseAmenities },
        select: { id: true, can_use_amenities: true },
    });
}

async function remove(id) {
    return prisma.residents.delete({ where: { id } });
}

// Cư dân có số điện thoại (dùng cho sync tài khoản)
async function findWithPhone() {
    return prisma.residents.findMany({
        where: { AND: [{ phone_number: { not: null } }, { phone_number: { not: '' } }] },
        select: { id: true },
    });
}

// --- resident_accounts ---
async function listAccountsWithResident() {
    return prisma.resident_accounts.findMany({
        include: {
            residents: {
                select: { id: true, name: true, phone_number: true, is_active: true },
            },
        },
        orderBy: { residents: { name: 'asc' } },
    });
}

async function createAccount(residentId, passwordHash) {
    return prisma.resident_accounts.create({
        data: { resident_id: residentId, password_hash: passwordHash },
    });
}

async function createAccountsMany(residentIds, passwordHash) {
    return prisma.resident_accounts.createMany({
        data: residentIds.map((id) => ({ resident_id: id, password_hash: passwordHash })),
        skipDuplicates: true,
    });
}

async function updateAccountPassword(residentId, passwordHash) {
    return prisma.resident_accounts.update({
        where: { resident_id: residentId },
        data: { password_hash: passwordHash, updated_at: new Date() },
    });
}

// --- delete cascade (transaction) ---
function deleteResidentCascade(id, dummyResidentId) {
    return prisma.$transaction([
        prisma.resident_feedback.updateMany({
            where: { resident_id: id },
            data: { resident_id: dummyResidentId },
        }),
        prisma.amenity_usage.updateMany({
            where: { resident_id: id },
            data: { resident_id: null },
        }),
        prisma.resident_accounts.deleteMany({ where: { resident_id: id } }),
        prisma.occupancies.deleteMany({ where: { resident_id: id } }),
        prisma.residents.delete({ where: { id } }),
    ]);
}

module.exports = {
    listAll,
    findById,
    create,
    update,
    updateStatus,
    updateAmenityAccess,
    remove,
    findWithPhone,
    listAccountsWithResident,
    createAccount,
    createAccountsMany,
    updateAccountPassword,
    deleteResidentCascade,
};
