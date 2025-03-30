const express = require("express");
const router = express.Router();
const db = require("../config/db");
const moment = require("moment");

// 🧩 积分奖励规则
const CHECKIN_POINTS = 10;
const BONUS_REWARDS = {
    7: 30,
    30: 150,
    90: 300,
    180: 900,
    360: 2000,
};

// ✅ 用户签到 API
router.post("/checkin", async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: "缺少用户 ID" });

    try {
        const today = moment().format("YYYY-MM-DD");

        // 1️⃣ 查询最后一次签到记录
        const [rows] = await db.query(
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
                return res.json({ success: false, message: "今日已签到" });
            } else if (moment(lastCheckinDate).add(1, "days").isSame(today)) {
                consecutive_days = lastCheckin.consecutive_days + 1;
            }

            total_days = lastCheckin.total_days + 1;
        }

        // 2️⃣ 计算积分奖励
        let totalPoints = CHECKIN_POINTS;
        if (BONUS_REWARDS[consecutive_days]) {
            totalPoints += BONUS_REWARDS[consecutive_days];
        }

        // 3️⃣ 开始事务
        await db.beginTransaction();

        await db.query(
            `INSERT INTO checkins (user_id, checkin_date, consecutive_days, total_days)
             VALUES (?, CURDATE(), ?, ?)`,
            [user_id, consecutive_days, total_days]
        );

        await db.query(
            `UPDATE users SET points = points + ? WHERE id = ?`,
            [totalPoints, user_id]
        );

        await db.commit();

        res.json({
            success: true,
            message: `签到成功，+${totalPoints} 积分`,
            consecutive_days,
            total_days,
            earned_points: totalPoints,
        });
    } catch (err) {
        await db.rollback();
        console.error("❌ 签到失败:", err);
        res.status(500).json({ success: false, message: "签到失败", error: err });
    } finally {
        db.release();
    }
});

// ✅ 获取签到状态
router.get("/status", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: "缺少用户 ID" });

    try {
        const [rows] = await db.query(
            `SELECT checkin_date, consecutive_days, total_days 
             FROM checkins WHERE user_id = ? 
             ORDER BY checkin_date DESC LIMIT 1`,
            [user_id]
        );

        if (rows.length === 0) {
            return res.json({ success: true, checked_in: false, consecutive_days: 0, total_days: 0 });
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
        res.status(500).json({ success: false, message: "服务器错误", error: err });
    }
});

module.exports = router;