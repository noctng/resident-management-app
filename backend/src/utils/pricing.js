const fs = require('fs');
const path = require('path');

const PRICING_CONFIG_PATH = path.join(__dirname, '../../pricing.json');
let pricingConfig = {};

const loadPricingConfig = () => {
    try {
        if (!fs.existsSync(PRICING_CONFIG_PATH)) {
            // Default config if file doesn't exist
            pricingConfig = {
                water: { residentialRate: 14900, businessRate: 17140 },
                residentialElectricity: [],
                businessElectricity: { normalRate: 0, offPeakRate: 0, peakRate: 0, averageRate: 0 },
                vat: { electricity: 8, water: 5 },
            };
            return;
        }
        const rawData = fs.readFileSync(PRICING_CONFIG_PATH);
        pricingConfig = JSON.parse(rawData);
        console.log('Pricing configuration loaded successfully.');
    } catch (error) {
        console.error('FATAL: Could not load pricing configuration from pricing.json.', error);
        // Do not exit process here, just log error, to avoid crashing the whole server during module load if file is bad
    }
};

// Load immediately on module load
loadPricingConfig();

const getPricingConfig = () => pricingConfig;

const updatePricingConfig = (newConfig) => {
    fs.writeFileSync(PRICING_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    pricingConfig = newConfig;
};

const calculateTieredCost = (consumption, tiers) => {
    let cost = 0;
    let remainingConsumption = consumption;
    let lastLimit = 0;

    for (const tier of tiers) {
        if (remainingConsumption <= 0) break;
        const tierConsumptionLimit = tier.limit === null ? Infinity : tier.limit - lastLimit;
        const consumptionInTier = Math.min(remainingConsumption, tierConsumptionLimit);
        cost += consumptionInTier * tier.rate;
        remainingConsumption -= consumptionInTier;
        lastLimit = tier.limit === null ? lastLimit : tier.limit;
    }
    return cost;
};

const calculateWaterCost = (consumption, waterType = 'RESIDENTIAL', configOverride = null) => {
    if (consumption <= 0) return 0;
    const cfg = configOverride || pricingConfig;
    const { residentialRate, businessRate } = cfg.water;
    const vatRate = (cfg.vat?.water || 0) / 100;

    // Cả sinh hoạt và kinh doanh đều áp dụng rule 16m³:
    // - 16 m³ đầu tính theo residentialRate (giá sinh hoạt)
    // - Phần vượt tính theo businessRate (giá kinh doanh)
    const RESIDENTIAL_LIMIT = 16;
    const residentialPart = Math.min(consumption, RESIDENTIAL_LIMIT);
    const businessPart = Math.max(0, consumption - RESIDENTIAL_LIMIT);
    const baseCost = (residentialPart * residentialRate) + (businessPart * businessRate);

    return Math.round(baseCost * (1 + vatRate));
};

const calculateResidentialElectricityCost = (consumption, configOverride = null) => {
    if (consumption <= 0) return 0;
    const cfg = configOverride || pricingConfig;
    const vatRate = (cfg.vat?.electricity || 0) / 100;
    const baseCost = calculateTieredCost(consumption, cfg.residentialElectricity);
    return Math.round(baseCost * (1 + vatRate));
};

const calculateBusinessElectricityCost = (consumption, configOverride = null) => {
    if (consumption <= 0) return 0;
    const cfg = configOverride || pricingConfig;
    // Use normalRate for billing (giờ bình thường)
    const rate = cfg.businessElectricity.normalRate || cfg.businessElectricity.averageRate;
    const vatRate = (cfg.vat?.electricity || 0) / 100;
    const baseCost = consumption * rate;
    return Math.round(baseCost * (1 + vatRate));
};

module.exports = {
    loadPricingConfig,
    getPricingConfig,
    updatePricingConfig,
    calculateWaterCost,
    calculateResidentialElectricityCost,
    calculateBusinessElectricityCost,
};
