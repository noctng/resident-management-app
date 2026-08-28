const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const backupDir = path.join(__dirname, '../../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const dbName = process.env.POSTGRES_DB || 'data_qlcd';
const host = process.env.POSTGRES_HOST || '172.16.100.51';
const port = process.env.POSTGRES_PORT || '54328';
const user = process.env.POSTGRES_USER || 'postgres';
const password = process.env.POSTGRES_PASSWORD || 'TNGbmt@123';

const sqlFileName = `backup_${dbName}_${timestamp}.sql`;
const sqlFilePath = path.join(backupDir, sqlFileName);
const gzFilePath = path.join(backupDir, `backup_${dbName}_${timestamp}.sql.gz`);

console.log('====================================================');
console.log(`  BẮT ĐẦU SAO LƯU CƠ SỞ DỮ LIỆU POSTGRESQL [${dbName}]`);
console.log('====================================================');
console.log(`⏰ Thời gian : ${now.toLocaleString('vi-VN')}`);
console.log(`🌐 Máy chủ   : ${host}:${port}`);
console.log(`📁 Thư mục   : ${path.resolve(backupDir)}`);

let pgDumpPath = 'pg_dump';
const defaultPaths = [
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
];
for (const p of defaultPaths) {
  if (fs.existsSync(p)) {
    pgDumpPath = p;
    break;
  }
}

const env = Object.assign({}, process.env, {
  PGPASSWORD: password,
});

const args = [
  '-h', host,
  '-p', String(port),
  '-U', user,
  '-d', dbName,
  '--clean',
  '--if-exists',
  '--create',
  '--encoding=UTF8',
  '-f', sqlFilePath,
];

const dumpProc = spawn(pgDumpPath, args, { env });

dumpProc.stdout.on('data', (data) => console.log(data.toString()));
dumpProc.stderr.on('data', (data) => {
  const msg = data.toString();
  if (!msg.includes('NOTICE')) {
    console.error(msg);
  }
});

dumpProc.on('close', (code) => {
  if (code === 0) {
    const stats = fs.statSync(sqlFilePath);
    console.log(`\n✅ 1. Tạo tệp SQL thành công: ${sqlFileName}`);
    console.log(`   📦 Dung lượng gốc: ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${stats.size.toLocaleString()} bytes)`);

    console.log(`\n⏳ 2. Đang nén tệp sao lưu sang GZIP...`);
    const readStream = fs.createReadStream(sqlFilePath);
    const writeStream = fs.createWriteStream(gzFilePath);
    const gzip = zlib.createGzip({ level: 9 });

    readStream
      .pipe(gzip)
      .pipe(writeStream)
      .on('finish', () => {
        const gzStats = fs.statSync(gzFilePath);
        console.log(`✅ 3. Đã tạo tệp nén: backup_${dbName}_${timestamp}.sql.gz`);
        console.log(`   📦 Dung lượng nén: ${(gzStats.size / (1024 * 1024)).toFixed(2)} MB (${gzStats.size.toLocaleString()} bytes)`);
        console.log(`\n🎉 HOÀN TẤT SAO LƯU AN TOÀN TOÀN BỘ CƠ SỞ DỮ LIỆU!`);
        process.exit(0);
      })
      .on('error', (err) => {
        console.error('Lỗi nén GZIP:', err);
        process.exit(1);
      });
  } else {
    console.error(`❌ pg_dump thoát với mã lỗi: ${code}`);
    process.exit(1);
  }
});
