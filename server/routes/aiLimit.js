const redis = require('../utils/redis');
const db = require('../config/db');
const DAY_SECONDS = 24 * 60 * 60;

// 不同会员等级对应的每日限额
const LIMITS = {
  0: 5,   // 普通用户
  1: 25,  // VIP
  2: -1   // SVIP，无限次
};

module.exports = async function aiLimit(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "未登录用户无法使用AI服务" });
    }

    // 从数据库查询会员等级
    const [userRows] = await db.query("SELECT vip_level FROM users WHERE id = ?", [userId]);
    const vipLevel = userRows[0]?.vip_level ?? 0;
    const limit = LIMITS[vipLevel];

    // 🟢 SVIP无限制
    if (limit === -1) {
      req.aiUsageInfo = { used: 0, limit: Infinity };
      return next();
    }

    // 生成 Redis key
    const today = new Date().toISOString().split("T")[0];
    const redisKey = `ai_usage:${userId}:${today}`;

    // 获取当前次数
    const current = parseInt(await redis.get(redisKey) || "0", 10);

    // 判断是否超限
    if (current >= limit) {
      return res.status(429).json({
        error: `今日AI对话次数已达上限（${limit} 次），请明日再试或升级会员`,
        limit,
        used: current
      });
    }

    // 自增 + 设置过期
    await redis.incr(redisKey);
    if (current === 0) {
      await redis.expire(redisKey, DAY_SECONDS);
    }

    // 把当前使用信息挂在 req 上，方便后续接口使用
    req.aiUsageInfo = {
      used: current + 1,
      limit
    };

    next();
  } catch (err) {
    console.error("❌ AI限流中间件出错:", err);
    res.status(500).json({
      error: "AI限流中间件出错",
      detail: err.message
    });
  }
};
