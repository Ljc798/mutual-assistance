const express = require("express");
const router = express.Router();
const db = require("../config/db");
const moment = require("moment");
const authMiddleware = require("./authMiddleware"); // 引入中间件
const {
    addReputationLog
} = require("../utils/reputation");

// 🧩 积分奖励规则
const CHECKIN_POINTS = 10;
const BONUS_REWARDS = {
    7: 30,
    30: 150,
    90: 300,
    180: 900,
    360: 2000,
};

// 为了保护这些接口，加入 token 验证中间件
router.post("/checkin", authMiddleware, async (req, res) => {
    const {
        user_id
    } = req.body;
    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "缺少用户 ID"
        });
    }

    const conn = await db.getConnection(); // ✅ 获取连接

    try {
        const today = moment().format("YYYY-MM-DD");

        // ✅ 开始事务
        await conn.beginTransaction();

        // 查询最后签到记录
        const [rows] = await conn.query(
            `SELECT checkin_date, consecutive_days, total_days 
       FROM checkins WHERE user_id = ? 
       ORDER BY checkin_date DESC LIMIT 1`,
            [user_id]
        );

        let consecutive_days = 1;
        let total_days = 1;

        if (rows.length > 0) {
            const lastCheckin = rows[0];
            const lastCheckinDate = moment(lastCheckin.checkin_date).format("YYYY-MM-DD");

            if (moment(lastCheckinDate).isSame(today)) {
                await conn.release(); // ⚠️ 如果提前返回也要记得释放连接！
                return res.json({
                    success: false,
                    message: "今日已签到"
                });
            } else if (moment(lastCheckinDate).add(1, "days").isSame(today)) {
                consecutive_days = lastCheckin.consecutive_days + 1;
            }

            total_days = lastCheckin.total_days + 1;
        }

        // 计算积分
        let totalPoints = CHECKIN_POINTS;
        if (BONUS_REWARDS[consecutive_days]) {
            totalPoints += BONUS_REWARDS[consecutive_days];
        }

        // ✅ 判断是否 VIP，给予双倍积分
        const [
            [user]
        ] = await conn.query(
            `SELECT vip_expire_time FROM users WHERE id = ?`,
            [user_id]
        );

        const now = new Date();
        const isVip = user && user.vip_expire_time && new Date(user.vip_expire_time) > now;

        if (isVip) {
            totalPoints *= 2;
            console.log(`🎖️ 用户 ${user_id} 是 VIP，积分翻倍：${totalPoints}`);
        }

        // 插入签到记录
        await conn.query(
            `INSERT INTO checkins (user_id, checkin_date, consecutive_days, total_days)
       VALUES (?, CURDATE(), ?, ?)`,
            [user_id, consecutive_days, total_days]
        );

        // 更新用户积分
        await conn.query(
            `UPDATE users SET points = points + ? WHERE id = ?`,
            [totalPoints, user_id]
        );

        const reputationDelta = isVip ? 0.2 : 0.1;
        try {
            await addReputationLog(
                user_id,
                "daily_checkin",
                reputationDelta,
                isVip ?
                `VIP签到加信誉+${reputationDelta.toFixed(1)}` :
                `每日签到加信誉+${reputationDelta.toFixed(1)}`
            );
            console.log(`⭐ 用户#${user_id}签到成功，信誉+${reputationDelta}`);
        } catch (repErr) {
            console.warn("⚠️ 更新信誉失败（忽略不中断）:", repErr.message);
        }

        // 提交事务
        await conn.commit();

        res.json({
            success: true,
            message: `签到成功，+${totalPoints} 积分，信誉 +${reputationDelta}`,
            consecutive_days,
            total_days,
            earned_points: totalPoints,
            is_vip: isVip,
        });
    } catch (err) {
        await conn.rollback(); // ❗失败就回滚事务
        console.error("❌ 签到失败:", err);
        res.status(500).json({
            success: false,
            message: "签到失败",
            error: err
        });
    } finally {
        conn.release(); // ✅ 无论成功失败都释放连接
    }
});

// ✅ 获取签到状态
router.get("/status", authMiddleware, async (req, res) => {
    const {
        user_id
    } = req.query;
    if (!user_id) return res.status(400).json({
        success: false,
        message: "缺少用户 ID"
    });

    try {
        const [rows] = await db.query(
            `SELECT checkin_date, consecutive_days, total_days 
             FROM checkins WHERE user_id = ? 
             ORDER BY checkin_date DESC LIMIT 1`,
            [user_id]
        );

        if (rows.length === 0) {
            return res.json({
                success: true,
                checked_in: false,
                consecutive_days: 0,
                total_days: 0
            });
        }

        const lastCheckin = rows[0];
        const lastCheckinDate = moment(lastCheckin.checkin_date).format("YYYY-MM-DD");
        const today = moment().format("YYYY-MM-DD");

        return res.json({
            success: true,
            checked_in: moment(lastCheckinDate).isSame(today),
            consecutive_days: lastCheckin.consecutive_days,
            total_days: lastCheckin.total_days,
        });
    } catch (err) {
        console.error("❌ 获取签到状态失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误",
            error: err
        });
    }
});

module.exports = router;