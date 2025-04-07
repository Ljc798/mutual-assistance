const express = require("express");
const router = express.Router();
const db = require("../config/db");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;
const {
    v4: uuidv4
} = require("uuid");
require("dotenv").config();

// 引入 authMiddleware
const authMiddleware = require("./authMiddleware");

// 🧩 手机号登录 API（使用微信云托管的容器内调用）
router.post("/phone-login", async (req, res) => {
    const {
        phoneCode,
        loginCode
    } = req.body;

    if (!phoneCode || !loginCode) {
        return res.status(400).json({
            success: false,
            message: "缺少参数"
        });
    }

    try {
        // ✅ 使用云调用的方式获取 openid，不再需要 HTTPS！
        const openidRes = await axios.get("http://api.weixin.qq.com/sns/jscode2session", {
            params: {
                appid: process.env.WX_APPID,
                secret: process.env.WX_SECRET,
                js_code: loginCode,
                grant_type: "authorization_code"
            }
        });

        const {
            openid
        } = openidRes.data;
        if (!openid) {
            return res.status(400).json({
                success: false,
                message: "获取 openid 失败",
                raw: openidRes.data
            });
        }

        // ✅ 获取手机号（用云调用）
        const wxRes = await axios.post("http://api.weixin.qq.com/wxa/business/getuserphonenumber", {
            code: phoneCode
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!wxRes.data?.phone_info?.phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "获取手机号失败",
                error: wxRes.data
            });
        }

        const phoneNumber = wxRes.data.phone_info.phoneNumber;

        // ✅ 查或建用户，并保存 openid
        const [results] = await db.query("SELECT * FROM users WHERE phone_number = ?", [phoneNumber]);
        let user;
        let isNewUser = false;

        if (results.length > 0) {
            user = results[0];
            await db.query("UPDATE users SET openid = ? WHERE id = ?", [openid, user.id]);
            user.openid = openid;
        } else {
            const now = new Date();
            now.setHours(now.getHours() + 8); // 补时区
            const newUser = {
                wxid: uuidv4(),
                phone_number: phoneNumber,
                username: "微信用户" + phoneNumber.slice(-4),
                avatar_url: "https://default-avatar.com/avatar.png",
                free_counts: 5,
                points: 10,
                created_time: now,
                openid
            };
            const [insertResult] = await db.query("INSERT INTO users SET ?", [newUser]);
            newUser.id = insertResult.insertId;
            user = newUser;
            isNewUser = true;
        }

        const token = jwt.sign({
            user_id: user.id
        }, SECRET_KEY, {
            expiresIn: "7d"
        });

        res.json({
            success: true,
            token,
            user,
            isNewUser
        });

    } catch (error) {
        console.error("❌ 登录失败:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "登录失败",
            error: error.response?.data || error.message
        });
    }
});

// 📌 修改用户信息（使用 authMiddleware 来验证 token）
router.post("/update", authMiddleware, async (req, res) => {
    const userId = req.user.user_id;
    const {
        username,
        avatar_url,
        wxid
    } = req.body;

    try {
        const [userRows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "用户不存在"
            });
        }

        // ✅ 检查 username 是否被其他用户占用
        const [nameCheck] = await db.query(
            "SELECT id FROM users WHERE username = ? AND id != ?",
            [username, userId]
        );
        if (nameCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: "用户名已被占用，请重新输入"
            });
        }

        // ✅ 检查 wxid 是否被其他用户占用
        const [wxidCheck] = await db.query(
            "SELECT id FROM users WHERE wxid = ? AND id != ?",
            [wxid, userId]
        );
        if (wxidCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: "用户ID已被使用，请重新输入"
            });
        }

        // ✅ 执行更新操作
        await db.query(
            "UPDATE users SET username = ?, avatar_url = ?, wxid = ? WHERE id = ?",
            [username, avatar_url, wxid, userId]
        );

        const [updatedUser] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);

        return res.json({
            success: true,
            message: "用户信息更新成功",
            user: updatedUser[0]
        });

    } catch (err) {
        console.error("❌ 更新用户信息失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// 📌 获取用户信息（使用 authMiddleware 来验证 token）
router.get("/info", authMiddleware, async (req, res) => {
    const userId = req.user.user_id; // 从 token 中提取 user_id

    try {
        const [results] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "用户不存在"
            });
        }
        return res.json({
            success: true,
            user: results[0]
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "数据库错误"
        });
    }
});

router.post("/check-username", async (req, res) => {
    const {
        username,
        user_id
    } = req.query;

    if (!username) {
        return res.status(400).json({
            success: false,
            message: "缺少 username 参数"
        });
    }

    try {
        const [rows] = await db.query(
            "SELECT id FROM users WHERE username = ? AND id != ?",
            [username, user_id || 0] // 如果没传 user_id，默认传个 0
        );

        const isAvailable = rows.length === 0;
        res.json({
            success: true,
            available: isAvailable,
            message: isAvailable ? "用户名可用" : "用户名已被占用"
        });
    } catch (err) {
        console.error("❌ 检查用户名失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post("/check-wxid", async (req, res) => {
    const {
        wxid,
        user_id
    } = req.query;

    if (!wxid) {
        return res.status(400).json({
            success: false,
            message: "缺少 wxid 参数"
        });
    }

    try {
        const [rows] = await db.query(
            "SELECT id FROM users WHERE wxid = ? AND id != ?",
            [wxid, user_id || 0]
        );

        const isAvailable = rows.length === 0;
        res.json({
            success: true,
            available: isAvailable,
            message: isAvailable ? "用户ID可用" : "用户ID已被占用"
        });
    } catch (err) {
        console.error("❌ 检查用户ID失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

module.exports = router;