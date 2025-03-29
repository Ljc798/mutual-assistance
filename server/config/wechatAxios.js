// server/config/wechatAxios.js

const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

// 读取我们刚刚保存的根证书
const wechatCa = fs.readFileSync(path.join(__dirname, "../cert/wechat-root.pem"));

// 创建 https.Agent，注入我们信任的 CA
const httpsAgent = new https.Agent({
  ca: wechatCa,
  rejectUnauthorized: true // ✅ 仍然启用校验（更安全）
});

// 封装 axios 实例
const wechatAxios = axios.create({
  httpsAgent,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 8000
});

module.exports = wechatAxios;