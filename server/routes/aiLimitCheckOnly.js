const redis = require("../utils/redis.js")
const db = require("../config/db.js")

async function aiLimitCheckOnly(req, res, next) {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            error: "未登录"
        });
    }

    try {
        // 查询会员等级
        const [
            [user]
        ] = await db.query(
            "SELECT vip_level FROM users WHERE id = ?",
            [userId]
        );
        const level = user?.vip_level ?? 0;

        // 不同等级的限制次数
        const limits = {
            0: 5,
            1: 25,
            2: Infinity
        };
        const limit = limits[level] ?? 5;

        // Redis 中的每日计数 key
        const key = `ai_usage:${userId}:${new Date().toISOString().slice(0, 10)}`;
        let current = await redis.get(key);
        current = current ? parseInt(current) : 0;

        // 不增加计数，只传递当前状态
        req.aiUsageInfo = {
            used: current,
            limit
        };

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