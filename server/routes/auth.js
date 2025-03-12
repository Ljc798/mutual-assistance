const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY || "default_secret_key";
const WX_APPID = process.env.WX_APPID;
const WX_SECRET = process.env.WX_SECRET;

// 处理微信登录
router.post("/login", async (req, res) => {
    const { code, nickname, avatarUrl } = req.body;

    if (!code) {
        return res.status(400).json({ error: "缺少 code 参数" });
    }

    try {
        // 1️⃣ 通过 code 获取 openid
        const wxResponse = await axios.get(`https://api.weixin.qq.com/sns/jscode2session`, {
            params: {
                appid: WX_APPID,
                secret: WX_SECRET,
                js_code: code,
                grant_type: "authorization_code"
            }
        });

        if (wxResponse.data.errcode) {
            return res.status(400).json({ error: "微信认证失败", details: wxResponse.data });
        }

        const openid = wxResponse.data.openid;

        // 2️⃣ 先检查 `username` 是否已存在
        const checkUsernameQuery = "SELECT * FROM users WHERE username = ?";
        db.query(checkUsernameQuery, [nickname], (err, nameResults) => {
            if (err) {
                console.error("❌ 查询用户名失败:", err);
                return res.status(500).json({ error: "数据库查询失败" });
            }

            if (nameResults.length > 0) {
                return res.status(400).json({ error: "用户名已被使用，请换一个" });
            }

            // 3️⃣ 再查询 `wxid` 是否已存在
            const checkUserQuery = "SELECT * FROM users WHERE wxid = ?";
            db.query(checkUserQuery, [openid], (err, userResults) => {
                if (err) {
                    console.error("❌ 查询用户失败:", err);
                    return res.status(500).json({ error: "数据库查询失败" });
                }

                let user;
                if (userResults.length > 0) {
                    // 用户已存在，直接登录
                    user = userResults[0];
                } else {
                    // 4️⃣ 用户不存在，创建新用户
                    const insertUserQuery = "INSERT INTO users (username, wxid, avatar_url, free_counts, points) VALUES (?, ?, ?, 5, 10)";
                    db.query(insertUserQuery, [nickname, openid, avatarUrl], (err, result) => {
                        if (err) {
                            console.error("❌ 用户创建失败:", err);
                            return res.status(500).json({ error: "用户创建失败" });
                        }

                        user = { id: result.insertId, username: nickname, wxid: openid, avatar_url: avatarUrl };
                    });
                }

                // 5️⃣ 生成 JWT 令牌
                const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "7d" });

                res.json({
                    message: "登录成功",
                    token,
                    user
                });
            });
        });
    } catch (error) {
        console.error("❌ 登录错误:", error);
        res.status(500).json({ error: "服务器错误" });
    }
});

module.exports = router;