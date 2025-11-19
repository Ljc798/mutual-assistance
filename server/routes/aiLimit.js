const db = require('../config/db');

// 不同会员等级对应的每日限额
const LIMITS = { 0: 5, 1: 25, 2: Infinity };

module.exports = async function aiLimit(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "未登录用户无法使用AI服务" });
    }

    // 从数据库查询会员等级与到期
    const [userRows] = await db.query("SELECT vip_level, vip_expire_time, svip_expire_time, ai_quota, ai_daily_quota FROM users WHERE id = ?", [userId]);
    const row = userRows[0] || {};
    const now = new Date();
    const vipActive = row.vip_expire_time && new Date(row.vip_expire_time) > now;
    const svipActive = row.svip_expire_time && new Date(row.svip_expire_time) > now;
    const baseLevel = Number(row.vip_level || 0);
    const effectiveLevel = svipActive ? 2 : (vipActive ? baseLevel : 0);
    let limit = LIMITS[effectiveLevel] ?? 5;
    const dailyBonus = Number(row.ai_daily_quota || 0);
    if (limit !== Infinity) {
      limit = limit + Math.max(0, dailyBonus);
    }

    if (limit === Infinity) {
      req.aiUsageInfo = { used: 0, limit: Infinity, dailyBonus, quotaRemain: Number(row.ai_quota || 0) };
      return next();
    }

    const [[tbl]] = await db.query("SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_usage'");
    if (Number(tbl?.c || 0) === 0) {
      await db.query("CREATE TABLE ai_usage (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_user_date (user_id, created_at))");
    }

    const [[usedRow]] = await db.query(
      "SELECT COUNT(*) AS used FROM ai_usage WHERE user_id = ? AND DATE(created_at) = CURDATE()",
      [userId]
    );
    const used = Number(usedRow?.used || 0);
    const quotaRemain = Number(row.ai_quota || 0);

    if (used >= limit && quotaRemain <= 0) {
      return res.status(429).json({
        error: `今日AI对话次数已达上限（${limit} 次）`,
        limit,
        used
      });
    }

    if (used < limit) {
      await db.query("INSERT INTO ai_usage (user_id, created_at) VALUES (?, NOW())", [userId]);
      req.aiUsageInfo = { used: used + 1, limit, dailyBonus, quotaRemain };
      return next();
    }

    if (quotaRemain > 0) {
      await db.query("UPDATE users SET ai_quota = ai_quota - 1 WHERE id = ?", [userId]);
      req.aiUsageInfo = { used, limit, dailyBonus, quotaRemain: Math.max(0, quotaRemain - 1) };
      return next();
    }

    next();
  } catch (err) {
    console.error("❌ AI限流中间件出错:", err);
    res.status(500).json({
      error: "AI限流中间件出错",
      detail: err.message
    });
  }
};
