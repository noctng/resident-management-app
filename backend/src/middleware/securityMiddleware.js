const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Rate limiter helper
const createLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
        max: options.max || 100, // Default: 100 requests per windowMs
        message: options.message || 'Too many requests from this IP, please try again later.',
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
};

// 1. Helmet: Secure HTTP headers
// 1. Helmet: Secure HTTP headers
// Disable strict CSP and allow cross-origin resources for API usage
const securityHeaders = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable CSP for API to avoid conflicts
});

// 2. Global API Rate Limiter
const apiLimiter = createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // Limit each IP to 200 requests per minute
    message: { message: 'Too many requests, please try again later.' },
});

// 3. Login Rate Limiter (Stricter)
const authLimiter = createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per 15 minutes
    message: { message: 'Too many login attempts, please try again later.' },
});

module.exports = {
    securityHeaders,
    apiLimiter,
    authLimiter,
};
