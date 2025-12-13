const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Explicitly load .env from the same directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function fixIndexes() {
    console.log('🔄 开始检查并修复数据库索引...');
    
    const dbConfig = {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'mutual_user',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'mutual_assistance'
    };

    console.log(`🔌 Connecting to ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);
    // Mask password for logging
    // console.log('Password length:', dbConfig.password.length);

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected successfully with configured user.');
    } catch (err) {
        console.warn(`⚠️ Connection failed with ${dbConfig.user}: ${err.message}`);
        console.log('🔄 Trying root user...');
        
        try {
            connection = await mysql.createConnection({
                ...dbConfig,
                user: 'root',
                password: process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQL_PASSWORD || ''
            });
            console.log('✅ Connected successfully as root.');
        } catch (rootErr) {
            console.error('❌ Failed to connect as root too:', rootErr.message);
            console.error('Please check your .env file credentials.');
            process.exit(1);
        }
    }

    try {
        // 1. square_likes 索引
        console.log('Checking square_likes indexes...');
        try {
            // First check if index exists to avoid errors or duplicate attempts
            const [rows] = await connection.query("SHOW INDEX FROM square_likes WHERE Key_name = 'idx_user_square'");
            if (rows.length > 0) {
                 console.log('ℹ️ Index idx_user_square already exists');
            } else {
                await connection.query(`
                    CREATE UNIQUE INDEX idx_user_square ON square_likes(user_id, square_id)
                `);
                console.log('✅ Created UNIQUE INDEX idx_user_square on square_likes');
            }
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                console.warn('⚠️ Cannot create UNIQUE index due to duplicate entries. Trying non-unique index...');
                try {
                     const [rows] = await connection.query("SHOW INDEX FROM square_likes WHERE Key_name = 'idx_user_square_normal'");
                     if (rows.length > 0) {
                        console.log('ℹ️ Index idx_user_square_normal already exists');
                     } else {
                        await connection.query(`
                            CREATE INDEX idx_user_square_normal ON square_likes(user_id, square_id)
                        `);
                        console.log('✅ Created INDEX idx_user_square_normal on square_likes');
                     }
                } catch (e2) {
                    console.error('❌ Failed to create index on square_likes:', e2.message);
                }
            } else {
                console.error('❌ Error creating index on square_likes:', err.message);
            }
        }

        // 2. notifications 索引
        console.log('Checking notifications indexes...');
        try {
            const [rows] = await connection.query("SHOW INDEX FROM notifications WHERE Key_name = 'idx_user_is_read'");
            if (rows.length > 0) {
                console.log('ℹ️ Index idx_user_is_read already exists');
            } else {
                await connection.query(`
                    CREATE INDEX idx_user_is_read ON notifications(user_id, is_read)
                `);
                console.log('✅ Created INDEX idx_user_is_read on notifications');
            }
        } catch (err) {
            console.error('❌ Error creating index on notifications:', err.message);
        }

    } catch (err) {
        console.error('Global error:', err);
    } finally {
        if (connection) {
             await connection.end(); // Use end() instead of release() for standalone connection
        }
        process.exit();
    }
}

fixIndexes();
