const mysql = require('mysql2');
require('dotenv').config(); // 加载 .env 文件

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 22837, // 使用环境变量的端口
});

db.connect(err => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ MySQL 数据库连接成功！');
  }
});

module.exports = db;