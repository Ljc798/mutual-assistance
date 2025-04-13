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

const fs = require("fs");
const FormData = require("form-data");
const path = require("path");
const multer = require("multer");
const upload = multer({
    dest: "uploads/"
});

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
            id: user.id
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

router.post("/admin-login", async (req, res) => {
    const {
        phone,
        password
    } = req.body;

    if (!phone || !password) {
        return res.status(400).json({
            success: false,
            message: "手机号和密码不能为空"
        });
    }

    // 校验是否为管理员账号
    const ADMIN_PHONE = process.env.ADMIN_PHONE;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (phone !== ADMIN_PHONE || password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "管理员账号或密码错误"
        });
    }

    try {
        const [rows] = await db.query("SELECT * FROM users WHERE phone_number = ?", [phone]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "管理员用户未注册，请先用手机号注册"
            });
        }

        const user = rows[0];

        const token = jwt.sign({
            id: user.id
        }, SECRET_KEY, {
            expiresIn: "7d"
        });

        return res.json({
            success: true,
            token,
            user,
            isAdmin: true
        });

    } catch (err) {
        console.error("❌ 管理员登录失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器内部错误"
        });
    }
});

// 📌 修改用户信息（使用 authMiddleware 来验证 token）
router.post("/update", authMiddleware, async (req, res) => {
    const userId = req.user.id;
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
    const userId = req.user.id; // 从 token 中提取 id

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
        id
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
            [username, id || 0] // 如果没传 id，默认传个 0
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
        id
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
            [wxid, id || 0]
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

const https = require("https"); // 👈 引入 https.Agent

// 微信内容安全检查：图片接口
router.post("/check-image", authMiddleware, upload.single("image"), async (req, res) => {
    const filePath = req.file?.path;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!filePath) {
        return res.status(400).json({
            success: false,
            message: "图片上传失败"
        });
    }

    try {
        // 获取 access_token
        const tokenRes = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
            params: {
                grant_type: "client_credential",
                appid: process.env.WX_APPID,
                secret: process.env.WX_SECRET,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            }) // 👈 忽略证书校验
        });

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error("access_token 获取失败");

        const form = new FormData();
        form.append("media", fs.createReadStream(filePath));

        const wxRes = await axios.post(
            `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${accessToken}`,
            form, {
                headers: form.getHeaders(),
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                }) // 👈 也加这里
            }
        );

        fs.unlinkSync(filePath); // 删除临时文件

        if (wxRes.data.errcode === 0) {
            return res.json({
                success: true,
                safe: true
            });
        } else {
            return res.json({
                success: true,
                safe: false,
                reason: wxRes.data
            });
        }
    } catch (err) {
        console.error("❌ 内容安全审核失败:", err);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({
            success: false,
            message: "内容审核失败",
            error: err
        });
    }
});

// ✅ 文本内容审核接口
router.post("/check-text", async (req, res) => {
    const {
        content
    } = req.body;

    if (!content || content.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "缺少内容参数"
        });
    }

    try {
        // 获取 access_token
        const tokenRes = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
            params: {
                grant_type: "client_credential",
                appid: process.env.WX_APPID,
                secret: process.env.WX_SECRET,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            }) // ✅ 忽略自签名证书
        });

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error("access_token 获取失败");

        // 发起内容安全检查
        const wxRes = await axios.post(
            `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`, {
                version: 2, // 建议使用 version 2，能力更强
                scene: 3,
                content,
            }, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                }) // ✅ 同样加上
            }
        );

        if (wxRes.data.errcode === 0 && wxRes.data.result?.suggest === "pass") {
            return res.json({
                success: true,
                safe: true
            });
        } else {
            return res.json({
                success: true,
                safe: false,
                reason: wxRes.data.result || wxRes.data,
            });
        }
    } catch (err) {
        console.error("❌ 文本内容审核失败:", err);
        return res.status(500).json({
            success: false,
            message: "内容审核失败",
            error: err
        });
    }
});


module.exports = router;