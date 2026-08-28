// Migration Script: Add permissions to users
// Run this script to migrate existing users to have permissions field

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
});

const ALL_PERMISSIONS = [
    'dashboard',
    'apartments',
    'residents',
    'utilities',
    'amenities',
    'feedback',
    'resident_accounts',
    'users',
    'configuration',
    'logs',
];

const DEFAULT_MANAGER_PERMISSIONS = ['dashboard', 'amenities'];

async function migratePermissions() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting permissions migration...');

        // Start transaction
        await client.query('BEGIN');

        // Step 1: Add permissions column if not exists
        console.log('📝 Adding permissions column...');
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb
    `);

        // Step 2: Update Admin users (role = 0)
        console.log('👑 Setting permissions for Admin users...');
        const adminResult = await client.query(
            `
      UPDATE users 
      SET permissions = $1::jsonb
      WHERE role = 0 AND (permissions IS NULL OR permissions = '[]'::jsonb)
      RETURNING id, username
    `,
            [JSON.stringify(ALL_PERMISSIONS)]
        );

        console.log(`   ✅ Updated ${adminResult.rowCount} admin user(s)`);

        // Step 3: Update Manager users (role = 1)
        console.log('👤 Setting permissions for Manager users...');
        const managerResult = await client.query(
            `
      UPDATE users 
      SET permissions = $1::jsonb
      WHERE role = 1 AND (permissions IS NULL OR permissions = '[]'::jsonb)
      RETURNING id, username
    `,
            [JSON.stringify(DEFAULT_MANAGER_PERMISSIONS)]
        );

        console.log(`   ✅ Updated ${managerResult.rowCount} manager user(s)`);

        // Step 4: Create index for better performance
        console.log('🔍 Creating index on permissions...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_permissions 
      ON users USING GIN (permissions)
    `);

        // Step 5: Add comment
        await client.query(`
      COMMENT ON COLUMN users.permissions 
      IS 'Array of permission strings for role-based access control'
    `);

        // Commit transaction
        await client.query('COMMIT');

        // Verify migration
        console.log('\n📊 Verification:');
        const verifyResult = await client.query(`
      SELECT 
        id,
        username,
        role,
        CASE 
          WHEN role = 0 THEN 'Admin'
          WHEN role = 1 THEN 'Manager'
          ELSE 'Unknown'
        END as role_name,
        permissions
      FROM users
      ORDER BY role, username
    `);

        console.table(verifyResult.rows);

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
migratePermissions()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration error:', error);
        process.exit(1);
    });
