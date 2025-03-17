const express = require("express");
const router = express.Router();
const db = require("../config/db"); // 数据库连接
const moment = require("moment"); // 处理日期

// **签到积分奖励规则**
const CHECKIN_POINTS = 10;
const BONUS_REWARDS = {
    7: 50,  // 连续 7 天额外 +50 积分
    30: 200 // 连续 30 天额外 +200 积分
};

// ✅ **用户签到 API**
router.post("/checkin", async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ success: false, message: "缺少用户 ID" });
    }

    // 🚀 1️⃣ 查询用户最后一次签到记录
    db.query(
        "SELECT checkin_date, consecutive_days, total_days FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1",
        [user_id],
        (err, results) => {
            if (err) {
                console.error("❌ 查询签到记录失败:", err);
                return res.status(500).json({ success: false, message: "查询签到失败" });
            }

            let consecutive_days = 1;
            let total_days = 1;
            let today = moment().format("YYYY-MM-DD");

            if (results.length > 0) {
                const lastCheckin = results[0];
                const lastCheckinDate = moment(lastCheckin.checkin_date).format("YYYY-MM-DD");

                // 🚀 2️⃣ 判断是否连续签到
                if (moment(lastCheckinDate).isSame(today, "day")) {
                    return res.json({ success: false, message: "今日已签到" });
                } else if (moment(lastCheckinDate).add(1, "days").isSame(today, "day")) {
                    consecutive_days = lastCheckin.consecutive_days + 1; // 连续签到
                } else {
                    consecutive_days = 1; // 断签，重置连续签到天数
                }

                total_days = lastCheckin.total_days + 1;
            }

            // 🚀 3️⃣ 计算积分奖励
            let totalPoints = CHECKIN_POINTS;
            if (BONUS_REWARDS[consecutive_days]) {
                totalPoints += BONUS_REWARDS[consecutive_days];
            }

            // 🚀 4️⃣ 事务插入签到记录 & 更新用户积分
            db.beginTransaction((err) => {
                if (err) {
                    console.error("❌ 事务开启失败:", err);
                    return res.status(500).json({ success: false, message: "签到失败" });
                }

                // **插入签到记录**
                db.query(
                    "INSERT INTO checkins (user_id, checkin_date, consecutive_days, total_days) VALUES (?, CURDATE(), ?, ?)",
                    [user_id, consecutive_days, total_days],
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("❌ 插入签到记录失败:", err);
                                res.status(500).json({ success: false, message: "签到失败" });
                            });
                        }

                        // **更新用户积分**
                        db.query(
                            "UPDATE users SET points = points + ? WHERE id = ?",
                            [totalPoints, user_id],
                            (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("❌ 更新用户积分失败:", err);
                                        res.status(500).json({ success: false, message: "签到失败" });
                                    });
                                }

                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error("❌ 提交事务失败:", err);
                                            res.status(500).json({ success: false, message: "签到失败" });
                                        });
                                    }

                                    res.json({
                                        success: true,
                                        message: `签到成功，+${totalPoints} 积分`,
                                        consecutive_days,
                                        total_days,
                                        earned_points: totalPoints
                                    });
                                });
                            }
                        );
                    }
                );
            });
        }
    );
});

// ✅ **获取签到状态**
router.get("/status", async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ success: false, message: "缺少用户 ID" });
    }

    db.query(
        "SELECT checkin_date, consecutive_days, total_days FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1",
        [user_id],
        (err, results) => {
            if (err) {
                console.error("❌ 查询签到状态失败:", err);
                return res.status(500).json({ success: false, message: "查询签到状态失败" });
            }

            if (results.length === 0) {
                return res.json({ success: true, checked_in: false, consecutive_days: 0, total_days: 0 });
            }

            const lastCheckin = results[0];
            const lastCheckinDate = moment(lastCheckin.checkin_date).format("YYYY-MM-DD");
            const today = moment().format("YYYY-MM-DD");

            res.json({
                success: true,
                checked_in: moment(lastCheckinDate).isSame(today, "day"),
                consecutive_days: lastCheckin.consecutive_days,
                total_days: lastCheckin.total_days
            });
        }
    );
});

module.exports = router;