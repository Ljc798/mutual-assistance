const Redis = require("ioredis");
require("dotenv").config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  // 限制连接重试次数，防止一直挂
  maxRetriesPerRequest: 3,
  connectTimeout: 10000, // 10s 超时
  lazyConnect: true, // 👉 不自动连接，等需要时再连接
});

// 连接成功回调
redis.on("connect", () => {
  console.log("✅ Redis 连接成功");
});

// 错误处理
redis.on("error", (err) => {
  console.error("❌ Redis 连接失败:", err);
});

// 手动连接一次（可选）
// redis.connect().catch(console.error);

module.exports = redis;