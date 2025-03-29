const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const db = require("../config/db").promise();
const moment = require("moment");

dotenv.config();

// 📌 获取用户课表设置
router.get("/get-timetable-config", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "缺少 user_id" });
  }

  try {
    const [rows] = await db.promise().query("SELECT * FROM timetable_config WHERE user_id = ?", [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "未找到用户设置" });
    }

    const config = {
      ...rows[0],
      start_date: rows[0].start_date ? moment(rows[0].start_date).format("YYYY-MM-DD") : null,
    };

    return res.json({ success: true, data: config });
  } catch (error) {
    console.error("❌ 获取课表配置失败:", error);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});


// 📌 保存用户课表设置
router.post("/save-timetable-config", async (req, res) => {
  const {
    user_id,
    total_weeks,
    start_date,
    period_1, period_2, period_3, period_4,
    period_5, period_6, period_7, period_8,
    period_9, period_10
  } = req.body;

  if (!user_id || !total_weeks || !start_date || !period_1) {
    return res.status(400).json({ success: false, message: "缺少必要参数" });
  }

  try {
    const conn = db.promise();
    const formattedDate = moment(start_date).format("YYYY-MM-DD");

    await conn.query("DELETE FROM timetable_config WHERE user_id = ?", [user_id]);

    await conn.query(
      `INSERT INTO timetable_config (
        user_id, total_weeks, start_date,
        period_1, period_2, period_3, period_4,
        period_5, period_6, period_7, period_8,
        period_9, period_10
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, total_weeks, formattedDate,
        period_1, period_2, period_3, period_4,
        period_5, period_6, period_7, period_8,
        period_9, period_10
      ]
    );

    return res.json({ success: true, message: "课表配置已保存" });

  } catch (error) {
    console.error("❌ 课表配置保存失败:", error);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = router;