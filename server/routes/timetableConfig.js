const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const db = require("../config/db"); // 引入数据库连接
const moment = require("moment");  // ✅ 处理日期格式
dotenv.config();


// 📌 **获取用户的课表设置**
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

        let config = rows[0];

        // **✅ 格式化 `start_date`，保证是 `YYYY-MM-DD`**
        if (config.start_date) {
            config.start_date = moment(config.start_date).format("YYYY-MM-DD");
        }

        res.json({ success: true, data: config });

    } catch (error) {
        console.error("❌ 获取课表配置失败:", error);
        res.status(500).json({ success: false, message: "服务器错误", error });
    }
});


// 📌 **保存用户的课表设置（先删除旧数据，再插入新数据）**
router.post("/save-timetable-config", async (req, res) => {
    let { user_id, total_weeks, start_date, period_1, period_2, period_3, period_4, period_5, period_6, period_7, period_8, period_9, period_10 } = req.body;

    // **1️⃣ 参数检查**
    if (!user_id || !total_weeks || !start_date || !period_1) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    // **2️⃣ 处理 `start_date` 为 `YYYY-MM-DD` 格式**
    start_date = moment(start_date).format("YYYY-MM-DD");

    try {
        const connection = db.promise(); // ✅ 使用 `promise()` 确保异步操作

        // **3️⃣ 先删除旧数据**
        await connection.query("DELETE FROM timetable_config WHERE user_id = ?", [user_id]);

        // **4️⃣ 插入新数据**
        await connection.query(
            `INSERT INTO timetable_config (user_id, total_weeks, start_date, period_1, period_2, period_3, period_4, 
                                           period_5, period_6, period_7, period_8, period_9, period_10) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, total_weeks, start_date, period_1, period_2, period_3, period_4, period_5, period_6, period_7, period_8, period_9, period_10]
        );

        res.json({ success: true, message: "课表配置已保存" });

    } catch (error) {
        console.error("❌ 课表配置保存失败:", error);
        res.status(500).json({ success: false, message: "服务器错误", error });
    }
});
module.exports = router;