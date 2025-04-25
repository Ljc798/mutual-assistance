const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
});

redis.set("test_key", "hello redis")
  .then(() => redis.get("test_key"))
  .then((value) => {
    console.log("✅ Redis连接成功，值为：", value);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Redis连接失败:", err);
    process.exit(1);
  });

redis.on("connect", () => {
  console.log("✅ Redis 连接成功");
});

redis.on("error", (err) => {
  console.error("❌ Redis 连接失败:", err);
});

module.exports = redis;