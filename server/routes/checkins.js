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

router.post("/checkin", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, message: "缺少用户 ID" });
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
        return res.json({ success: false, message: "今日已签到" });
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

    // 提交事务
    await conn.commit();

    res.json({
      success: true,
      message: `签到成功，+${totalPoints} 积分`,
      consecutive_days,
      total_days,
      earned_points: totalPoints,
    });
  } catch (err) {
    await conn.rollback(); // ❗失败就回滚事务
    console.error("❌ 签到失败:", err);
    res.status(500).json({ success: false, message: "签到失败", error: err });
  } finally {
    conn.release(); // ✅ 无论成功失败都释放连接
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