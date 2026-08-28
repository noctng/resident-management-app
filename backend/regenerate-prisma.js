const { execSync } = require('child_process');
const path = require('path');

console.log('Regenerating Prisma Client...');

try {
    // Change to backend directory
    process.chdir(__dirname);

    // Run prisma generate
    execSync('node node_modules/prisma/build/index.js generate', {
        stdio: 'inherit',
        cwd: __dirname,
    });

    console.log('✅ Prisma Client regenerated successfully!');
    console.log('Please restart your backend server.');
} catch (error) {
    console.error('❌ Error regenerating Prisma Client:', error.message);
    process.exit(1);
}
