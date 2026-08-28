const bcrypt = require('bcrypt');
const repo = require('../repositories/residentRepository');
const { generateRandomId } = require('../utils/helpers');

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Abc@12345';
const DUMMY_RESIDENT_ID = 'res_deleted';

// Map entity (snake_case Prisma) → DTO (camelCase trả frontend). GIỮ NGUYÊN shape cũ.
function toDTO(r) {
    return {
        id: r.id,
        name: r.name,
        dob: r.dob,
        idNumber: r.id_number,
        zaloId: r.zalo_id,
        phoneNumber: r.phone_number,
        isActive: r.is_active,
        email: r.email,
        relationshipStatus: r.relationship_status,
        canUseAmenities: r.can_use_amenities,
        companyName: r.company_name,
        buyerName: r.buyer_name,
        taxCode: r.tax_code,
        invoiceAddress: r.invoice_address,
    };
}

async function getAllResidents() {
    const residents = await repo.listAll();
    return residents.map(toDTO);
}

async function createResident(body) {
    const {
        name, dob, idNumber, zaloId, phoneNumber, isActive, email,
        relationshipStatus, canUseAmenities, companyName, buyerName, taxCode, invoiceAddress,
    } = body;

    const id = `res_${generateRandomId()}`;

    const newResident = await repo.create({
        id,
        name,
        dob: typeof dob === 'string' ? new Date(dob) : dob,
        id_number: idNumber,
        zalo_id: zaloId || null,
        phone_number: phoneNumber || null,
        is_active: isActive !== false,
        email: email || null,
        relationship_status: relationshipStatus || 'FAMILY',
        can_use_amenities: canUseAmenities !== false,
        company_name: companyName ? companyName.trim() : null,
        buyer_name: buyerName ? buyerName.trim() : null,
        tax_code: taxCode ? taxCode.trim() : null,
        invoice_address: invoiceAddress ? invoiceAddress.trim() : null,
    });

    if (phoneNumber) {
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
        await repo.createAccount(id, hash).catch(() => {}); // bỏ qua duplicate
    }

    return toDTO(newResident);
}

async function updateResident(id, body) {
    const {
        name, dob, idNumber, phoneNumber, zaloId, email,
        relationshipStatus, companyName, buyerName, taxCode, invoiceAddress,
    } = body;

    const cleanName = name?.trim();
    const cleanIdNumber = idNumber?.trim();
    const cleanEmail = email && email.trim() !== '' ? email.trim() : null;

    const updated = await repo.update(id, {
        name: cleanName,
        dob: dob ? new Date(dob) : undefined,
        id_number: cleanIdNumber,
        phone_number: phoneNumber || null,
        zalo_id: zaloId || null,
        email: cleanEmail,
        relationship_status: relationshipStatus,
        company_name: companyName !== undefined ? (companyName?.trim() || null) : undefined,
        buyer_name: buyerName !== undefined ? (buyerName?.trim() || null) : undefined,
        tax_code: taxCode !== undefined ? (taxCode?.trim() || null) : undefined,
        invoice_address: invoiceAddress !== undefined ? (invoiceAddress?.trim() || null) : undefined,
    });

    if (updated.phone_number) {
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
        try {
            await repo.createAccount(id, hash);
        } catch (e) {
            // Bỏ qua unique constraint nếu account đã tồn tại
        }
    }

    return toDTO(updated);
}

async function updateResidentStatus(id, isActive) {
    return repo.updateStatus(id, isActive);
}

async function updateAmenityAccess(id, canUseAmenities) {
    return repo.updateAmenityAccess(id, canUseAmenities);
}

async function getAllResidentAccounts() {
    const accounts = await repo.listAccountsWithResident();
    return accounts
        .filter((a) => a.residents && a.residents.phone_number && a.residents.is_active)
        .map((a) => ({
            id: a.residents.id,
            name: a.residents.name,
            phoneNumber: a.residents.phone_number,
        }));
}

async function syncResidentAccounts() {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    const candidates = await repo.findWithPhone();

    if (candidates.length === 0) {
        return { message: 'Không có cư dân nào cần tạo tài khoản.' };
    }

    const result = await repo.createAccountsMany(candidates.map((c) => c.id), hash);
    return { message: `Đồng bộ xong. Đã tạo ${result.count} tài khoản.` };
}

async function resetResidentPassword(residentId) {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    await repo.updateAccountPassword(residentId, hash);
    return { message: 'Đã reset mật khẩu.' };
}

async function deleteResident(id) {
    const resident = await repo.findById(id);
    if (!resident) {
        const err = new Error('Không tìm thấy cư dân');
        err.status = 404;
        throw err;
    }

    if (resident.relationship_status === 'OWNER') {
        const err = new Error(
            'Không thể xóa cư dân là chủ sở hữu (Chủ hộ). Vui lòng chuyển quyền chủ sở hữu sang người khác trước khi xóa.'
        );
        err.status = 400;
        throw err;
    }

    // Đảm bảo dummy resident tồn tại để ẩn danh feedback
    const dummyExists = await repo.findById(DUMMY_RESIDENT_ID);
    if (!dummyExists) {
        await repo.create({
            id: DUMMY_RESIDENT_ID,
            name: 'Cư dân đã xóa',
            relationship_status: 'FAMILY',
            is_active: false,
            can_use_amenities: false,
        });
    }

    await repo.deleteResidentCascade(id, DUMMY_RESIDENT_ID);
    return { message: 'Đã xóa cư dân thành công.' };
}

module.exports = {
    toDTO,
    getAllResidents,
    createResident,
    updateResident,
    updateResidentStatus,
    updateAmenityAccess,
    getAllResidentAccounts,
    syncResidentAccounts,
    resetResidentPassword,
    deleteResident,
};
