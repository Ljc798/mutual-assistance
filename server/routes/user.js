const express = require("express");
const router = express.Router();
const db = require("../config/db");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid"); // ✅ 引入 UUID 生成器
require("dotenv").config();

const APP_ID = process.env.WX_APPID;
const APP_SECRET = process.env.WX_SECRET;

// ✅ 封装插入用户的 Promise
const insertUser = (newUser) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO users SET ?", newUser, (err, result) => {
            if (err) reject(err);
            newUser.id = result.insertId; // 保持数据库 `id` 主键不变
            resolve(newUser);
        });
    });
};

// 📌 手机号登录 API
router.post("/phone-login", async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "缺少 code" });

    try {
        // 1️⃣ 获取 access_token
        const tokenRes = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`);

        console.log("📡 微信 access_token API 返回:", tokenRes.data);

        if (!tokenRes.data.access_token) {
            return res.status(500).json({ success: false, message: "获取 access_token 失败", error: tokenRes.data });
        }
        const access_token = tokenRes.data.access_token;

        // 2️⃣ 获取手机号
        const wxRes = await axios.post(
            `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${access_token}`,
            { code },
            { headers: { "Content-Type": "application/json" } }
        );

        if (!wxRes.data || !wxRes.data.phone_info) {
            console.error("❌ 微信 API 返回错误:", wxRes.data);
            return res.status(400).json({ success: false, message: "获取手机号失败", error: wxRes.data });
        }

        const phoneNumber = wxRes.data.phone_info.phoneNumber;
        console.log("📞 获取到的手机号:", phoneNumber);

        // 3️⃣ 检查用户是否已注册
        db.query("SELECT * FROM users WHERE phone_number = ?", [phoneNumber], async (err, results) => {
            if (err) {
                console.error("❌ 数据库查询失败:", err);
                return res.status(500).json({ success: false, message: "服务器错误" });
            }

            let user;
            if (results.length > 0) {
                user = results[0]; // ✅ 已注册，直接返回用户信息
            } else {
                // 4️⃣ **创建新用户**
                const newUser = {
                    wxid: uuidv4(), // ✅ 生成唯一 UUID 赋值给 wxid
                    phone_number: phoneNumber,
                    username: "微信用户" + phoneNumber.slice(-4),
                    avatar_url: "https://default-avatar.com/avatar.png",
                    free_counts: 5,
                    points: 10
                };

                try {
                    user = await insertUser(newUser);
                } catch (insertErr) {
                    console.error("❌ 用户注册失败:", insertErr);
                    return res.status(500).json({ success: false, message: "注册失败" });
                }
            }

            // 5️⃣ **生成 Token**
            const token = `mock_token_${user.id}`;
            return res.json({
                success: true,
                token,
                user
            });
        });
    } catch (error) {
        console.error("❌ 服务器错误:", error);
        return res.status(500).json({ success: false, message: "服务器错误" });
    }
});

// 📌 **修改用户信息 API**
router.post("/update", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "未提供有效的 Token" });
    }

    const token = authHeader.replace("Bearer ", ""); // 提取 token
    if (!token.startsWith("mock_token_")) {
        return res.status(401).json({ success: false, message: "无效的 Token" });
    }

    const userId = token.replace("mock_token_", "");

    db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "服务器错误" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "用户不存在" });
        }

        db.query(
            "UPDATE users SET username = ?, avatar_url = ?, wxid = ? WHERE id = ?",
            [req.body.username, req.body.avatar_url, req.body.wxid, userId],
            (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ success: false, message: "更新失败" });
                }

                db.query("SELECT * FROM users WHERE id = ?", [userId], (fetchErr, updatedUser) => {
                    if (fetchErr) {
                        return res.status(500).json({ success: false, message: "获取最新用户信息失败" });
                    }

                    return res.json({ success: true, message: "用户信息更新成功", user: updatedUser[0] });
                });
            }
        );
    });
});

// ✅ 获取用户信息（通过 token 验证）
router.get("/info", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "未提供有效的 Token" });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token.startsWith("mock_token_")) {
        return res.status(401).json({ success: false, message: "无效的 Token" });
    }

    const userId = token.replace("mock_token_", "");

    db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) {
            console.error("❌ 查询用户失败:", err);
            return res.status(500).json({ success: false, message: "数据库错误" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "用户不存在" });
        }

        return res.json({
            success: true,
            user: results[0],
        });
    });
});


module.exports = router;