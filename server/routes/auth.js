const express = require("express");
const router = express.Router();
const db = require("../db"); // 连接数据库
const jwt = require("jsonwebtoken");

// 用户登录或注册
router.post("/login", async (req, res) => {
    const { nickname, avatarUrl } = req.body;
    
    if (!nickname || !avatarUrl) {
        return res.status(400).json({ error: "缺少必要参数" });
    }

    // 查询数据库，看看用户是否已注册
    const sql = `SELECT * FROM user WHERE username = ?`;
    db.query(sql, [nickname], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "数据库查询失败" });
        }

        if (result.length > 0) {
            // 用户已存在，生成 Token
            const token = jwt.sign({ id: result[0].id }, "your_secret_key", { expiresIn: "7d" });
            res.json({ message: "登录成功", token, user: result[0] });
        } else {
            // 新用户，插入数据库
            const insertSql = `INSERT INTO user (username, wxid, free_counts, points, school_id) VALUES (?, ?, ?, ?, ?)`;
            db.query(insertSql, [nickname, "wx-" + Date.now(), 10, 0, 1], (err, insertResult) => {
                if (err) {
                    return res.status(500).json({ error: "注册失败" });
                }
                const newUser = { id: insertResult.insertId, username: nickname, free_counts: 10, points: 0, school_id: 1 };
                const token = jwt.sign({ id: newUser.id }, "your_secret_key", { expiresIn: "7d" });
                res.json({ message: "注册成功", token, user: newUser });
            });
        }
    });
});

module.exports = router;