const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 获取用户信息
router.get("/info", (req, res) => {
    const userId = req.user.id; // 需要从 Token 解析出 ID
    const sql = `SELECT * FROM user WHERE id = ?`;
    db.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).json({ error: "数据库查询失败" });
        if (result.length === 0) return res.status(404).json({ error: "用户不存在" });
        res.json(result[0]);
    });
});

module.exports = router;