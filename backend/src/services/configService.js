const { logActivity } = require('../utils/logger');
const repo = require('../repositories/configRepository');

// Helper: build config map từ settings array
const buildConfigMap = (settings) => {
  const config = {};
  settings.forEach((s) => (config[s.key] = s.value));
  return config;
};

// Helper: upsert many settings, skip masked password
const upsertSettings = async (config, keys, description) => {
  for (const key of keys) {
    if (config[key] !== undefined) {
      await repo.upsert(key, config[key], description);
    }
  }
};

const AMENITY_TYPES = ['GOLF_3D', 'HORSE_RIDING', 'MUSEUM', 'ZEN_GARDEN', 'SAUNA', 'ARCHERY', 'GYM', 'YOGA'];

// ============ EMAIL ============
const getEmailConfig = async () => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_FROM', 'SMTP_SECURE'];
  const settings = await repo.findByKeys(keys);
  const config = buildConfigMap(settings);
  config.SMTP_PASS = '********';
  return config;
};

const updateEmailConfig = async (config, user) => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_FROM', 'SMTP_SECURE'];
  await upsertSettings(config, keys, 'Email Config');
  if (config.SMTP_PASS && config.SMTP_PASS !== '********') {
    await repo.upsert('SMTP_PASS', config.SMTP_PASS, 'Email Password');
  }
  await logActivity(user, 'CẬP_NHẬT_CẤU_HÌNH', 'SYSTEM', 'EMAIL', 'Email Settings', 'Cập nhật cấu hình email');
  return { message: 'Cập nhật thành công' };
};

// ============ QR ============
const getQRConfig = async () => {
  const keys = ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE', 'QR_SEPAY_VA', 'QR_SEPAY_BANK_CODE'];
  const settings = await repo.findByKeys(keys);
  return buildConfigMap(settings);
};

const updateQRConfig = async (config, user) => {
  const keys = ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE', 'QR_SEPAY_VA', 'QR_SEPAY_BANK_CODE'];
  await upsertSettings(config, keys, 'QR Payment Config');
  await logActivity(user, 'CẬP_NHẬT_CẤU_HÌNH', 'SYSTEM', 'QR', 'QR Payment Settings', 'Cập nhật cấu hình QR Code thanh toán');
  return { message: 'Cập nhật thành công' };
};

const getQRConfigPublic = getQRConfig;

// ============ AMENITY LIMITS ============
const buildAmenityLimits = (settings) => {
  const limits = {};
  for (const type of AMENITY_TYPES) {
    const key = `AMENITY_LIMIT_${type}`;
    const setting = settings.find((s) => s.key === key);
    limits[type] = {
      monthlyLimit: setting ? parseInt(setting.value, 10) : 0,
      description: setting?.description || '',
    };
  }
  return limits;
};

const getAmenityLimits = async () => {
  const settings = await repo.findByPrefix('AMENITY_LIMIT_');
  return buildAmenityLimits(settings);
};

const getAmenityLimitsPublic = getAmenityLimits;

const updateAmenityLimits = async (limits, user) => {
  for (const type of AMENITY_TYPES) {
    if (limits[type] !== undefined) {
      const key = `AMENITY_LIMIT_${type}`;
      const monthlyLimit = parseInt(limits[type].monthlyLimit, 10) || 0;
      const description = limits[type].description || '';
      await repo.upsert(key, monthlyLimit, description || 'Amenity Usage Limit');
    }
  }
  await logActivity(user, 'CẬP_NHẬT_CẤU_HÌNH', 'SYSTEM', 'AMENITY_LIMITS', 'Amenity Usage Limits', 'Cập nhật cấu hình lượt sử dụng tiện ích');
  return { message: 'Cập nhật thành công' };
};

// ============ AI ============
const getAIConfig = async () => {
  const settings = await repo.findByKeys(['AI_BASE_URL', 'AI_MODEL']);
  const config = buildConfigMap(settings);
  const keyRecord = await repo.findByKey('AI_API_KEY');
  config.AI_API_KEY = keyRecord?.value ? '********' : '';
  config.AI_HAS_KEY = !!keyRecord?.value;
  return config;
};

const updateAIConfig = async (config, user) => {
  const upsert = async (key, value, description) => {
    await repo.upsert(key, value, description);
  };
  if (config.AI_BASE_URL !== undefined) await upsert('AI_BASE_URL', config.AI_BASE_URL, 'AI Base URL (OpenAI-compatible)');
  if (config.AI_MODEL !== undefined) await upsert('AI_MODEL', config.AI_MODEL, 'AI Model Name');
  if (config.AI_API_KEY && config.AI_API_KEY !== '********') {
    await upsert('AI_API_KEY', config.AI_API_KEY, 'AI API Key');
  }
  await logActivity(user, 'CẬP_NHẬT_CẤU_HÌNH', 'SYSTEM', 'AI_CONFIG', 'AI Config', 'Cập nhật cấu hình AI phân tích đồng hồ');
  return { message: 'Cập nhật cấu hình AI thành công' };
};

// ============ SEPAY ============
const getSepayConfig = async () => {
  const keys = [
    'SEPAY_ENABLED', 'SEPAY_WEBHOOK_URL', 'SEPAY_BANK_ACCOUNT', 'SEPAY_BANK_NAME',
    'SEPAY_AUTO_MATCH_UTILITY', 'SEPAY_AUTO_MATCH_UNIFIED', 'SEPAY_AUTO_MATCH_MANAGEMENT', 'SEPAY_SYNTAX_PREFIX',
  ];
  const settings = await repo.findByKeys(keys);
  const config = {
    SEPAY_ENABLED: true,
    SEPAY_AUTO_MATCH_UTILITY: true,
    SEPAY_AUTO_MATCH_UNIFIED: true,
    SEPAY_AUTO_MATCH_MANAGEMENT: true,
    SEPAY_SYNTAX_PREFIX: 'CAN,EW,UB,HD',
  };
  settings.forEach((s) => {
    if (s.key.startsWith('SEPAY_AUTO_MATCH_') || s.key === 'SEPAY_ENABLED') {
      config[s.key] = s.value === 'true';
    } else {
      config[s.key] = s.value;
    }
  });
  const apiKeyRecord = await repo.findByKey('SEPAY_API_KEY');
  config.SEPAY_API_KEY = apiKeyRecord?.value ? '********' : '';
  const secretKeyRecord = await repo.findByKey('SEPAY_WEBHOOK_SECRET');
  config.SEPAY_WEBHOOK_SECRET = secretKeyRecord?.value ? '********' : '';
  return config;
};

const updateSepayConfig = async (config, user) => {
  const keys = [
    'SEPAY_ENABLED', 'SEPAY_WEBHOOK_URL', 'SEPAY_BANK_ACCOUNT', 'SEPAY_BANK_NAME',
    'SEPAY_AUTO_MATCH_UTILITY', 'SEPAY_AUTO_MATCH_UNIFIED', 'SEPAY_AUTO_MATCH_MANAGEMENT', 'SEPAY_SYNTAX_PREFIX',
  ];
  await upsertSettings(config, keys, 'SePay Webhook Config');
  if (config.SEPAY_API_KEY && config.SEPAY_API_KEY !== '********') {
    await repo.upsert('SEPAY_API_KEY', config.SEPAY_API_KEY, 'SePay API Key');
  }
  if (config.SEPAY_WEBHOOK_SECRET && config.SEPAY_WEBHOOK_SECRET !== '********') {
    await repo.upsert('SEPAY_WEBHOOK_SECRET', config.SEPAY_WEBHOOK_SECRET, 'SePay Webhook Secret');
  }
  await logActivity(user, 'CẬP_NHẬT_CẤU_HÌNH', 'SYSTEM', 'SEPAY_CONFIG', 'SePay Config', 'Cập nhật cấu hình SePay Webhooks gạch nợ tự động');
  return { message: 'Cập nhật cấu hình SePay thành công' };
};

// ============ HANDBOOK SETTINGS ============
const getHandbookInfo = async (statBackend, statNginx, exists) => {
  const keys = [
    'HANDBOOK_TITLE', 'HANDBOOK_SUBTITLE', 'HANDBOOK_HOTLINE_SECURITY',
    'HANDBOOK_HOTLINE_TECHNICAL', 'HANDBOOK_HOTLINE_FEEDBACK',
    'HANDBOOK_FILENAME', 'HANDBOOK_FILESIZE', 'HANDBOOK_UPDATED_AT',
  ];
  const settings = await repo.findByKeys(keys);
  const map = buildConfigMap(settings);
  const stat = statBackend || statNginx;
  return {
    title: map.HANDBOOK_TITLE || 'Sổ Tay Cư Dân - Khu Đô Thị Thành Phố Cà Phê',
    subtitle: map.HANDBOOK_SUBTITLE || 'Cẩm nang quy chuẩn nội quy khu đô thị, hướng dẫn sử dụng tiện ích cao cấp, chính sách tài chính & danh bạ cứu hộ khẩn cấp 24/7 do Ban Quản Lý ban hành.',
    hotlineSecurity: map.HANDBOOK_HOTLINE_SECURITY || '0262 3999 888',
    hotlineTechnical: map.HANDBOOK_HOTLINE_TECHNICAL || '0901 234 567',
    hotlineFeedback: map.HANDBOOK_HOTLINE_FEEDBACK || '0262 3999 999',
    fileName: map.HANDBOOK_FILENAME || 'So_Tay_Cu_Dan_TP_Ca_Phe_2026.pdf',
    fileSize: map.HANDBOOK_FILESIZE ? Number(map.HANDBOOK_FILESIZE) : (stat ? stat.size : 0),
    updatedAt: map.HANDBOOK_UPDATED_AT || (stat ? stat.mtime : new Date()),
    url: '/api/config/handbook/file',
    exists: Boolean(exists),
  };
};

const updateHandbookSettings = async (body, user) => {
  const { title, subtitle, hotlineSecurity, hotlineTechnical, hotlineFeedback } = body;
  const upsert = async (key, value, description) => {
    if (value !== undefined) await repo.upsert(key, value, description);
  };
  await upsert('HANDBOOK_TITLE', title, 'Tiêu đề Sổ Tay Cư Dân');
  await upsert('HANDBOOK_SUBTITLE', subtitle, 'Mô tả Sổ Tay Cư Dân');
  await upsert('HANDBOOK_HOTLINE_SECURITY', hotlineSecurity, 'Hotline An Ninh 24/7');
  await upsert('HANDBOOK_HOTLINE_TECHNICAL', hotlineTechnical, 'Hotline Kỹ Thuật');
  await upsert('HANDBOOK_HOTLINE_FEEDBACK', hotlineFeedback, 'Hotline Tiếp Nhận Phản Ánh');
  await logActivity(user, 'CẬP_NHẬT_CẤU_HÌNH', 'SYSTEM', 'HANDBOOK', 'Hotlines', 'Cập nhật thông tin hotline và tiêu đề Sổ Tay Cư Dân');
  return { message: 'Cập nhật thông tin Sổ Tay Cư Dân thành công' };
};

const getAmenityTypes = () => AMENITY_TYPES;

module.exports = {
  getEmailConfig,
  updateEmailConfig,
  getQRConfig,
  updateQRConfig,
  getQRConfigPublic,
  getAmenityLimits,
  getAmenityLimitsPublic,
  updateAmenityLimits,
  getAIConfig,
  updateAIConfig,
  getSepayConfig,
  updateSepayConfig,
  getHandbookInfo,
  updateHandbookSettings,
  getAmenityTypes,
};
