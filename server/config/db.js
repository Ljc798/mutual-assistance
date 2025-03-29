const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const [host, port] = (process.env.MYSQL_ADDRESS || '').split(':');

const pool = mysql.createPool({
  host: host || 'sh-cynosdbmysql-grp-fghxyiyk.sql.tencentcdb.com',
  port: port || '22837',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'mutual_assistance',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool; // ✅ 你已经导出了 promisePool