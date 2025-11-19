const db = require("../config/db.js")

async function aiLimitCheckOnly(req, res, next) {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            error: "未登录"
        });
    }

    try {
        const [[row]] = await db.query("SELECT vip_level, vip_expire_time, svip_expire_time, ai_quota, ai_daily_quota FROM users WHERE id = ?", [userId]);
        const now = new Date();
        const vipActive = row?.vip_expire_time && new Date(row.vip_expire_time) > now;
        const svipActive = row?.svip_expire_time && new Date(row.svip_expire_time) > now;
        const baseLevel = Number(row?.vip_level || 0);
        const level = svipActive ? 2 : (vipActive ? baseLevel : 0);
        const limits = { 0: 5, 1: 25, 2: Infinity };
        let limit = limits[level] ?? 5;
        const [[tbl]] = await db.query("SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_usage'");
        if (Number(tbl?.c || 0) === 0) {
            await db.query("CREATE TABLE ai_usage (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_user_date (user_id, created_at))");
        }
        const [[usedRow]] = await db.query(
            "SELECT COUNT(*) AS used FROM ai_usage WHERE user_id = ? AND DATE(created_at) = CURDATE()",
            [userId]
        );
        const used = Number(usedRow?.used || 0);
        const dailyBonus = Number(row?.ai_daily_quota || 0);
        const quotaRemain = Number(row?.ai_quota || 0);
        if (limit !== Infinity) {
            limit = limit + Math.max(0, dailyBonus);
        }
        req.aiUsageInfo = { used, limit, dailyBonus, quotaRemain };
        next();
    } catch (error) {
        console.error("❌ aiLimitCheckOnly 出错:", error);
        res.status(500).json({
            error: "系统错误",
            detail: error.message
        });
    }
}

module.exports = aiLimitCheckOnly;