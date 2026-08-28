const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

/**
 * Get current fee configuration
 */
exports.getCurrentConfig = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM fee_config ORDER BY effective_from DESC LIMIT 1'
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No fee configuration found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting fee config:', error);
        res.status(500).json({ error: 'Failed to get fee configuration' });
    }
};

/**
 * Get fee configuration history
 */
exports.getConfigHistory = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT fc.*, u.username as created_by_username
       FROM fee_config fc
       LEFT JOIN users u ON fc.created_by = u.id
       ORDER BY fc.effective_from DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting config history:', error);
        res.status(500).json({ error: 'Failed to get configuration history' });
    }
};

/**
 * Create or update fee configuration
 */
exports.updateConfig = async (req, res) => {
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
    } = req.body;

    const userId = req.user.id;

    try {
        // Validate input
        if (
            management_fee_per_sqm < 0 ||
            internet_fee < 0 ||
            cable_tv_fee < 0 ||
            parking_car_fee < 0 ||
            parking_motorbike_fee < 0 ||
            security_fee < 0 ||
            cleaning_fee < 0
        ) {
            return res.status(400).json({ error: 'Fee amounts must be non-negative' });
        }

        const result = await pool.query(
            `INSERT INTO fee_config (
        management_fee_per_sqm,
        internet_fee,
        cable_tv_fee,
        parking_car_fee,
        parking_motorbike_fee,
        security_fee,
        cleaning_fee,
        effective_from,
        created_by,
        enabled_fees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
            [
                management_fee_per_sqm,
                internet_fee,
                cable_tv_fee,
                parking_car_fee,
                parking_motorbike_fee,
                security_fee,
                cleaning_fee,
                effective_from || new Date(),
                userId,
                enabled_fees || {},
            ]
        );

        // Log activity
        await pool.query(
            `INSERT INTO activity_logs (id, user_id, username, action, target_type, details, created_at)
       VALUES ($1, $2, $3, 'UPDATE', 'FEE_CONFIG', $4, CURRENT_TIMESTAMP)`,
            [
                `log_${Date.now()}`,
                userId,
                req.user.username,
                `Updated fee configuration: Management ${management_fee_per_sqm}/m², Internet ${internet_fee}, Cable TV ${cable_tv_fee}, Security ${security_fee}, Cleaning ${cleaning_fee}, Car parking ${parking_car_fee}, Motorbike ${parking_motorbike_fee}`,
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating fee config:', error);
        res.status(500).json({ error: 'Failed to update fee configuration' });
    }
};

/**
 * Get fee config effective at a specific date
 */
exports.getConfigAtDate = async (req, res) => {
    const { date } = req.query;

    try {
        const result = await pool.query(
            `SELECT * FROM fee_config 
       WHERE effective_from <= $1 
       ORDER BY effective_from DESC 
       LIMIT 1`,
            [date || new Date()]
        );

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ error: 'No fee configuration found for the specified date' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting fee config at date:', error);
        res.status(500).json({ error: 'Failed to get fee configuration' });
    }
};
