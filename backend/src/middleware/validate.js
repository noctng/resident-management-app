const { z } = require('zod');

/**
 * Middleware factory for Zod validation
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {string} source - 'body', 'query', or 'params' (default: 'body')
 */
const validate =
    (schema, source = 'body') =>
    (req, res, next) => {
        try {
            const data = req[source];
            const parsedData = schema.parse(data);
            req[source] = parsedData; // Replace with parsed data (strips unknown keys if strictly defined)
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Support both .errors (Zod v3 legacy) and .issues (Zod v3.x newer)
                const issues = error.issues || error.errors || [];
                return res.status(400).json({
                    message: 'Dữ liệu không hợp lệ',
                    errors: issues.map((e) => ({
                        path: (e.path || []).join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };

module.exports = validate;
