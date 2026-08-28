const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

/**
 * Generate management fee ID
 */
function generateFeeId() {
    return `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate management fees for an apartment
 */
async function calculateManagementFee(apartmentId, month, year, config, extraData = {}) {
    // Get apartment info
    const aptResult = await pool.query('SELECT area FROM apartments WHERE id = $1', [apartmentId]);

    if (aptResult.rows.length === 0) {
        throw new Error('Apartment not found');
    }

    const area = parseFloat(aptResult.rows[0].area);
    const managementFee = area * parseFloat(config.management_fee_per_sqm);

    // Determine enabled fees from config
    const enabled = config.enabled_fees || {};
    const isEnabled = (key) => enabled[key] !== false; // Default true if missing

    const parkingCarQty = isEnabled('parking_car') ? extraData.parking_car_quantity || 0 : 0;
    const parkingMotorbikeQty = isEnabled('parking_motorbike')
        ? extraData.parking_motorbike_quantity || 0
        : 0;

    const parkingCarFee = parkingCarQty * parseFloat(config.parking_car_fee);
    const parkingMotorbikeFee = parkingMotorbikeQty * parseFloat(config.parking_motorbike_fee);

    const internetFee =
        isEnabled('internet') && extraData.has_internet ? parseFloat(config.internet_fee) : 0;
    const cableTvFee =
        isEnabled('cable_tv') && extraData.has_cable_tv ? parseFloat(config.cable_tv_fee) : 0;
    const securityFee =
        isEnabled('security') && extraData.has_security !== false
            ? parseFloat(config.security_fee)
            : 0;
    const cleaningFee =
        isEnabled('cleaning') && extraData.has_cleaning !== false
            ? parseFloat(config.cleaning_fee)
            : 0;

    const managementFeeAmount = isEnabled('management') ? managementFee : 0;

    // Use calculated managementFeeAmount instead of raw managementFee
    const totalAmount =
        managementFeeAmount +
        internetFee +
        cableTvFee +
        securityFee +
        cleaningFee +
        parkingCarFee +
        parkingMotorbikeFee;

    return {
        area,
        management_fee_per_sqm: config.management_fee_per_sqm,
        management_fee: managementFee,
        internet_fee: internetFee,
        cable_tv_fee: cableTvFee,
        security_fee: securityFee,
        cleaning_fee: cleaningFee,
        parking_car_quantity: parkingCarQty,
        parking_car_fee: parkingCarFee,
        parking_motorbike_quantity: parkingMotorbikeQty,
        parking_motorbike_fee: parkingMotorbikeFee,
        total_amount: totalAmount,
    };
}

/**
 * Generate management fee for a single apartment
 */
exports.generateFee = async (req, res) => {
    const {
        apartment_id,
        month,
        year,
        parking_car_quantity,
        parking_motorbike_quantity,
        has_internet,
        has_cable_tv,
        note,
    } = req.body;
    const userId = req.user.id;

    try {
        // Validate input
        if (!apartment_id || !month || !year) {
            return res.status(400).json({ error: 'apartment_id, month, and year are required' });
        }

        if (month < 1 || month > 12) {
            return res.status(400).json({ error: 'Month must be between 1 and 12' });
        }

        // Check if fee already exists
        const existingFee = await pool.query(
            'SELECT id FROM management_fees WHERE apartment_id = $1 AND month = $2 AND year = $3',
            [apartment_id, month, year]
        );

        if (existingFee.rows.length > 0) {
            return res
                .status(400)
                .json({ error: 'Management fee for this apartment and month already exists' });
        }

        // Get current fee config
        const configResult = await pool.query(
            'SELECT * FROM fee_config ORDER BY effective_from DESC LIMIT 1'
        );

        if (configResult.rows.length === 0) {
            return res
                .status(400)
                .json({ error: 'No fee configuration found. Please configure fees first.' });
        }

        const config = configResult.rows[0];

        // Calculate fees
        const feeData = await calculateManagementFee(apartment_id, month, year, config, {
            parking_car_quantity: parking_car_quantity || 0,
            parking_motorbike_quantity: parking_motorbike_quantity || 0,
            has_internet: has_internet !== false, // Default true
            has_cable_tv: has_cable_tv !== false, // Default true
        });

        // Insert new fee
        const result = await pool.query(
            `INSERT INTO management_fees (
        id, apartment_id, month, year,
        area, management_fee_per_sqm, management_fee,
        internet_fee, cable_tv_fee, security_fee, cleaning_fee,
        parking_car_quantity, parking_car_fee,
        parking_motorbike_quantity, parking_motorbike_fee,
        total_amount, status, note, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
            [
                generateFeeId(),
                apartment_id,
                month,
                year,
                feeData.area,
                feeData.management_fee_per_sqm,
                feeData.management_fee,
                feeData.internet_fee,
                feeData.cable_tv_fee,
                feeData.security_fee,
                feeData.cleaning_fee,
                feeData.parking_car_quantity,
                feeData.parking_car_fee,
                feeData.parking_motorbike_quantity,
                feeData.parking_motorbike_fee,
                feeData.total_amount,
                'PENDING',
                note || null,
                userId,
            ]
        );

        // Log activity
        const aptCode = await pool.query('SELECT code FROM apartments WHERE id = $1', [
            apartment_id,
        ]);
        await pool.query(
            `INSERT INTO activity_logs (id, user_id, username, action, target_type, target_id, target_name, details, created_at)
       VALUES ($1, $2, $3, 'CREATE', 'MANAGEMENT_FEE', $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
                `log_${Date.now()}`,
                userId,
                req.user.username,
                result.rows[0].id,
                `${aptCode.rows[0]?.code} - ${month}/${year}`,
                `Created management fee: ${feeData.total_amount.toLocaleString('vi-VN')} VND`,
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error generating management fee:', error);
        res.status(500).json({ error: error.message || 'Failed to generate management fee' });
    }
};

/**
 * Bulk generate management fees for all apartments
 */
exports.bulkGenerateFees = async (req, res) => {
    const { month, year, apartment_settings } = req.body;
    const userId = req.user.id;

    try {
        // Validate input
        if (!month || !year) {
            return res.status(400).json({ error: 'month and year are required' });
        }

        if (month < 1 || month > 12) {
            return res.status(400).json({ error: 'Month must be between 1 and 12' });
        }

        // Get current fee config
        const configResult = await pool.query(
            'SELECT * FROM fee_config ORDER BY effective_from DESC LIMIT 1'
        );

        if (configResult.rows.length === 0) {
            return res.status(400).json({ error: 'No fee configuration found' });
        }

        const config = configResult.rows[0];

        // Get all apartments
        const apartmentsResult = await pool.query('SELECT id, code, area FROM apartments');
        const apartments = apartmentsResult.rows;

        const results = {
            success: [],
            failed: [],
            skipped: [],
        };

        for (const apartment of apartments) {
            try {
                // Check if already exists
                const existing = await pool.query(
                    'SELECT id FROM management_fees WHERE apartment_id = $1 AND month = $2 AND year = $3',
                    [apartment.id, month, year]
                );

                if (existing.rows.length > 0) {
                    results.skipped.push({
                        apartment_id: apartment.id,
                        apartment_code: apartment.code,
                        reason: 'Already exists',
                    });
                    continue;
                }

                // Get settings for this apartment (if provided)
                const settings = apartment_settings?.[apartment.id] || {};

                // Calculate fees
                const feeData = await calculateManagementFee(apartment.id, month, year, config, {
                    parking_car_quantity: settings.parking_car_quantity || 0,
                    parking_motorbike_quantity: settings.parking_motorbike_quantity || 0,
                    has_internet: settings.has_internet !== false,
                    has_cable_tv: settings.has_cable_tv !== false,
                });

                // Insert
                const result = await pool.query(
                    `INSERT INTO management_fees (
            id, apartment_id, month, year,
            area, management_fee_per_sqm, management_fee,
            internet_fee, cable_tv_fee, security_fee, cleaning_fee,
            parking_car_quantity, parking_car_fee,
            parking_motorbike_quantity, parking_motorbike_fee,
            total_amount, status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING *`,
                    [
                        generateFeeId(),
                        apartment.id,
                        month,
                        year,
                        feeData.area,
                        feeData.management_fee_per_sqm,
                        feeData.management_fee,
                        feeData.internet_fee,
                        feeData.cable_tv_fee,
                        feeData.security_fee,
                        feeData.cleaning_fee,
                        feeData.parking_car_quantity,
                        feeData.parking_car_fee,
                        feeData.parking_motorbike_quantity,
                        feeData.parking_motorbike_fee,
                        feeData.total_amount,
                        'PENDING',
                        userId,
                    ]
                );

                results.success.push({
                    apartment_id: apartment.id,
                    apartment_code: apartment.code,
                    fee_id: result.rows[0].id,
                    total_amount: feeData.total_amount,
                });
            } catch (error) {
                results.failed.push({
                    apartment_id: apartment.id,
                    apartment_code: apartment.code,
                    error: error.message,
                });
            }
        }

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (id, user_id, username, action, target_type, details, created_at)
       VALUES ($1, $2, $3, 'CREATE', 'MANAGEMENT_FEE', $4, CURRENT_TIMESTAMP)`,
            [
                `log_${Date.now()}`,
                userId,
                req.user.username,
                `Bulk generated fees for ${month}/${year}: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`,
            ]
        );

        res.status(201).json(results);
    } catch (error) {
        console.error('Error bulk generating fees:', error);
        res.status(500).json({ error: 'Failed to bulk generate fees' });
    }
};

/**
 * Get management fees with filters
 */
exports.getFees = async (req, res) => {
    const { month, year, status, apartment_code, page = 1, limit = 50 } = req.query;

    try {
        let query = `
      SELECT 
        mf.*,
        a.code as apartment_code,
        a.house_type,
        a.floor
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;

        if (month) {
            query += ` AND mf.month = $${paramIndex++}`;
            params.push(month);
        }

        if (year) {
            query += ` AND mf.year = $${paramIndex++}`;
            params.push(year);
        }

        if (status) {
            query += ` AND mf.status = $${paramIndex++}`;
            params.push(status);
        }

        if (apartment_code) {
            query += ` AND a.code ILIKE $${paramIndex++}`;
            params.push(`%${apartment_code}%`);
        }

        query += ' ORDER BY mf.year DESC, mf.month DESC, a.code';

        // Pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `
      SELECT COUNT(*) as total
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      WHERE 1=1
    `;
        const countParams = [];
        let countIndex = 1;

        if (month) {
            countQuery += ` AND mf.month = $${countIndex++}`;
            countParams.push(month);
        }

        if (year) {
            countQuery += ` AND mf.year = $${countIndex++}`;
            countParams.push(year);
        }

        if (status) {
            countQuery += ` AND mf.status = $${countIndex++}`;
            countParams.push(status);
        }

        if (apartment_code) {
            countQuery += ` AND a.code ILIKE $${countIndex++}`;
            countParams.push(`%${apartment_code}%`);
        }

        const countResult = await pool.query(countQuery, countParams);

        res.json({
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                totalPages: Math.ceil(countResult.rows[0].total / limit),
            },
        });
    } catch (error) {
        console.error('Error getting management fees:', error);
        res.status(500).json({ error: 'Failed to get management fees' });
    }
};

/**
 * Get fee by ID
 */
exports.getFeeById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
        mf.*,
        a.code as apartment_code,
        a.house_type,
        a.floor,
        u.username as created_by_username
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      LEFT JOIN users u ON mf.created_by = u.id
      WHERE mf.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Management fee not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting management fee:', error);
        res.status(500).json({ error: 'Failed to get management fee' });
    }
};

/**
 * Update payment status
 */
exports.updatePaymentStatus = async (req, res) => {
    const { id } = req.params;
    const { status, payment_method, payment_date, note } = req.body;
    const userId = req.user.id;

    try {
        // Validate status
        const validStatuses = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await pool.query(
            `UPDATE management_fees 
       SET status = $1, 
           payment_method = $2, 
           payment_date = $3,
           note = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
            [status, payment_method || null, payment_date || null, note || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Management fee not found' });
        }

        // Log activity
        const fee = result.rows[0];
        const aptCode = await pool.query('SELECT code FROM apartments WHERE id = $1', [
            fee.apartment_id,
        ]);

        await pool.query(
            `INSERT INTO activity_logs (id, user_id, username, action, target_type, target_id, target_name, details, created_at)
       VALUES ($1, $2, $3, 'UPDATE', 'MANAGEMENT_FEE', $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
                `log_${Date.now()}`,
                userId,
                req.user.username,
                id,
                `${aptCode.rows[0]?.code} - ${fee.month}/${fee.year}`,
                `Updated payment status to ${status}`,
            ]
        );

        if (status === 'PAID') {
            const { sendPaymentThankYou } = require('../services/notificationService');
            sendPaymentThankYou({
                apartmentId: fee.apartment_id,
                amount: Number(fee.total_amount),
                month: fee.month,
                year: fee.year,
                paymentMethod: payment_method || 'Chuyển khoản / Tiền mặt',
                paymentDate: payment_date || new Date(),
            }).catch(console.error);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
};

/**
 * Delete management fee
 */
exports.deleteFee = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Get fee info before deleting
        const feeResult = await pool.query(
            `SELECT mf.*, a.code as apartment_code 
       FROM management_fees mf
       JOIN apartments a ON mf.apartment_id = a.id
       WHERE mf.id = $1`,
            [id]
        );

        if (feeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Management fee not found' });
        }

        const fee = feeResult.rows[0];

        // Delete
        await pool.query('DELETE FROM management_fees WHERE id = $1', [id]);

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (id, user_id, username, action, target_type, target_id, target_name, details, created_at)
       VALUES ($1, $2, $3, 'DELETE', 'MANAGEMENT_FEE', $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
                `log_${Date.now()}`,
                userId,
                req.user.username,
                id,
                `${fee.apartment_code} - ${fee.month}/${fee.year}`,
                `Deleted management fee: ${fee.total_amount.toLocaleString('vi-VN')} VND`,
            ]
        );

        res.json({ message: 'Management fee deleted successfully' });
    } catch (error) {
        console.error('Error deleting management fee:', error);
        res.status(500).json({ error: 'Failed to delete management fee' });
    }
};

/**
 * Get summary statistics
 */
exports.getSummary = async (req, res) => {
    const { month, year } = req.query;

    try {
        if (!month || !year) {
            return res.status(400).json({ error: 'month and year are required' });
        }

        const result = await pool.query(
            `SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_amount ELSE 0 END) as debt_amount,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
      FROM management_fees
      WHERE month = $1 AND year = $2`,
            [month, year]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting summary:', error);
        res.status(500).json({ error: 'Failed to get summary' });
    }
};

/**
 * Export invoice to PDF
 */
exports.exportToPDF = async (req, res) => {
    const { id } = req.params;
    const { generateInvoicePDF } = require('../services/pdfService');

    try {
        // Get fee details with apartment and resident info
        const result = await pool.query(
            `SELECT 
                mf.*,
                a.code as apartment_code,
                a.house_type,
                a.floor,
                r.name as resident_name
            FROM management_fees mf
            JOIN apartments a ON mf.apartment_id = a.id
            LEFT JOIN occupancies o ON a.id = o.apartment_id
            LEFT JOIN residents r ON o.resident_id = r.id AND r.is_active = true
            WHERE mf.id = $1
            LIMIT 1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Management fee not found' });
        }

        const fee = result.rows[0];

        // Generate PDF
        const { buffer, filename } = await generateInvoicePDF(fee);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(filename)}"`
        );
        res.setHeader('Content-Length', buffer.length);

        // Send PDF
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        res.status(500).json({ error: 'Failed to export to PDF' });
    }
};
