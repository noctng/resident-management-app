require('dotenv').config();

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || 'default-super-secret-admin-key-change-me';
const JWT_RESIDENT_SECRET =
    process.env.JWT_RESIDENT_SECRET || 'default-super-secret-resident-key-change-me';
const TOKEN_COOKIE_NAME = 'auth_token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 1 day default
};

module.exports = {
    JWT_ADMIN_SECRET,
    JWT_RESIDENT_SECRET,
    TOKEN_COOKIE_NAME,
    COOKIE_OPTIONS,
};
