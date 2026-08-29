/**
 * feeConfigService — nghiệp vụ cấu hình phí. Không truy cập DB trực tiếp (gọi repo).
 */
const repo = require('../repositories/feeConfigRepository');

function httpError(message, status) {
    const e = new Error(message);
    e.status = status;
    return e;
}

async function getCurrentConfig() {
    const row = await repo.findCurrent();
    if (!row) throw httpError('No fee configuration found', 404);
    return row;
}

async function getConfigHistory() {
    return repo.findHistory();
}

async function getConfigAtDate(date) {
    const row = await repo.findEffectiveAt(date || new Date());
    if (!row) {
        throw httpError('No fee configuration found for the specified date', 404);
    }
    return row;
}

async function updateConfig(payload, user) {
    const {
        management_fee_per_sqm,
        internet_fee,
        cable_tv_fee,
        parking_car_fee,
        parking_motorbike_fee,
        security_fee,
        cleaning_fee,
        effective_from,
        enabled_fees,
    } = payload || {};

    if (
        management_fee_per_sqm < 0 ||
        internet_fee < 0 ||
        cable_tv_fee < 0 ||
        parking_car_fee < 0 ||
        parking_motorbike_fee < 0 ||
        security_fee < 0 ||
        cleaning_fee < 0
    ) {
        throw httpError('Fee amounts must be non-negative', 400);
    }

    const created = await repo.create([
        management_fee_per_sqm,
        internet_fee,
        cable_tv_fee,
        parking_car_fee,
        parking_motorbike_fee,
        security_fee,
        cleaning_fee,
        effective_from || new Date(),
        user.id,
        enabled_fees || {},
    ]);

    await repo.logActivity({
        id: `log_${Date.now()}`,
        userId: user.id,
        username: user.username,
        details: `Updated fee configuration: Management ${management_fee_per_sqm}/m², Internet ${internet_fee}, Cable TV ${cable_tv_fee}, Security ${security_fee}, Cleaning ${cleaning_fee}, Car parking ${parking_car_fee}, Motorbike ${parking_motorbike_fee}`,
    });

    return created;
}

module.exports = {
    getCurrentConfig,
    getConfigHistory,
    getConfigAtDate,
    updateConfig,
};
