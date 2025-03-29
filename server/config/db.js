const mysql = require("mysql2");
require("dotenv").config();

const [host, port] = (process.env.MYSQL_ADDRESS || "").split(":");

const pool = mysql.createPool({
    host: host || "127.0.0.1",
    port: port || "3306",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "mutual_assistance",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const promisePool = pool.promise();

module.exports = promisePool;