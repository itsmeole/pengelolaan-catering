
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env manually to check content
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.config({ path: envPath });

console.log('--- Environment Debug ---');
console.log('1. .env file exists:', fs.existsSync(envPath));

if (envConfig.error) {
    console.error('2. Error loading .env:', envConfig.error);
} else {
    console.log('2. .env loaded successfully via dotenv');
}

const dbUrl = process.env.DATABASE_URL;
console.log('3. process.env.DATABASE_URL:', dbUrl ? (dbUrl.substring(0, 15) + '...') : 'UNDEFINED/EMPTY');

if (!dbUrl) {
    console.error('❌ CRITICAL: DATABASE_URL is missing!');
} else {
    console.log('✅ DATABASE_URL is set.');
}
