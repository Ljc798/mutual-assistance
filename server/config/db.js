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

// ✅ 添加 logStatus 方法，随时查看连接池当前使用情况
pool.logStatus = function () {
    console.log("连接池状态：");
    console.log(" - 当前连接数：", this.pool._allConnections.length);
    console.log(" - 空闲连接数：", this.pool._freeConnections.length);
    console.log(" - 等待队列：", this.pool._connectionQueue.length);
  };
  

module.exports = pool;