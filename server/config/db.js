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
  connectionLimit: 50, // ✅ 建议提高连接数
  queueLimit: 0
});

// ✅ 添加 logStatus 方法，随时查看连接池当前使用情况
pool.logStatus = function () {
  const stats = this.pool._allConnections.length;
  const free = this.pool._freeConnections.length;
  const waiting = this.pool._connectionQueue.length;
};

module.exports = pool;