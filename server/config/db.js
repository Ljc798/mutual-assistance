const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const [host, port] = (process.env.MYSQL_ADDRESS || '').split(':');

const pool = mysql.createPool({
  host: host,
  port: port,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'mutual_assistance',
  waitForConnections: true,
  connectionLimit: 20, // ✅ 建议提高连接数
  queueLimit: 50
});

module.exports = pool;