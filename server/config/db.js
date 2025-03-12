const mysql = require("mysql2");

require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.MYSQL_ADDRESS ? process.env.MYSQL_ADDRESS.split(':')[0] : "sh-cynosdbmysql-grp-fghxyiyk.sql.tencentcdb.com",
    port: process.env.MYSQL_ADDRESS ? process.env.MYSQL_ADDRESS.split(':')[1] : "22837",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "mutual_assistance",
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL 连接失败:", err);
    } else {
        console.log("✅ MySQL 数据库连接成功！");
    }
});

module.exports = db;