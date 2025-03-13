const express = require("express");
const router = express.Router();
const db = require("../config/db"); // 引入数据库连接

// 获取所有任务（支持分类查询）
router.get("/tasks", (req, res) => {
    const category = req.query.category;
    let query = "SELECT * FROM tasks";
    let queryParams = [];

    if (category && category !== "全部") {
        query += " WHERE category = ?";
        queryParams.push(category);
    }

    query += " ORDER BY DDL DESC"; // 按截止时间排序

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error("❌ 任务查询失败:", err);
            return res.status(500).json({ error: "数据库查询失败" });
        }

        // 统一格式化返回数据
        const formattedTasks = results.map(task => ({
            ...task,
            status: parseInt(task.status),  // 确保状态为整数
            offer: parseFloat(task.offer).toFixed(2), // 金额补全两位小数
        }));

        res.json(formattedTasks);
    });
});

// 获取任务详情
router.get("/task/:id", (req, res) => {
    const taskId = req.params.id;

    db.query("SELECT * FROM tasks WHERE id = ?", [taskId], (err, results) => {
        if (err) {
            console.error("❌ 任务详情查询失败:", err);
            return res.status(500).json({ error: "数据库查询失败" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "任务不存在" });
        }

        const task = results[0];

        res.json({
            ...task,
            status: parseInt(task.status),  // 确保状态为整数
            offer: parseFloat(task.offer).toFixed(2), // 补全两位小数
        });
    });
});

// 接单 API：更新任务状态为 "进行中"
router.post("/task/:id/accept", (req, res) => {
    const taskId = req.params.id;

    db.query("UPDATE tasks SET status = 1 WHERE id = ?", [taskId], (err, result) => {
        if (err) {
            console.error("❌ 接单失败:", err);
            return res.status(500).json({ error: "接单失败" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "任务不存在" });
        }

        res.json({ message: "任务已被接单", status: 1 });
    });
});

module.exports = router;