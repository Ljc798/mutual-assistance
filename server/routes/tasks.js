const express = require("express");
const router = express.Router();
const db = require("../config/db"); // 引入数据库连接

// 获取所有任务或按分类获取任务
router.get("/tasks", (req, res) => {
    const category = req.query.category; // 获取分类参数
    let query = "SELECT * FROM tasks";
    let queryParams = [];

    if (category && category !== "全部") {
        query += " WHERE category = ?";
        queryParams.push(category);
    }

    query += " ORDER BY createTime DESC"; // 按创建时间排序

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error("❌ 任务查询失败:", err);
            res.status(500).json({ error: "数据库查询失败" });
        } else {
            res.json(results);
        }
    });
});

module.exports = router;