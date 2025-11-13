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
const {
    getAccessToken
} = require('../utils/wechat');


const fs = require("fs");
const FormData = require("form-data");
const path = require("path");
const multer = require("multer");
const upload = multer({
    dest: "uploads/"
});

// 引入 authMiddleware
const authMiddleware = require("./authMiddleware");

// 🧩 手机号登录 API
router.post("/phone-login", async (req, res) => {
    const {
        phoneCode,
        loginCode
    } = req.body;

    // ✅ 基础参数检查
    if (!phoneCode && !loginCode) {
        return res.status(400).json({
            success: false,
            message: "缺少参数"
        });
    }

    let openid = null;
    let phoneNumber = null;

    try {
        // ===== [1] 若是微信小程序，获取 openid 和手机号 =====
        if (loginCode) {
            const openidRes = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
                params: {
                    appid: process.env.WX_APPID,
                    secret: process.env.WX_SECRET,
                    js_code: loginCode,
                    grant_type: "authorization_code"
                }
            });
            openid = openidRes.data.openid || null;
        }

        // ✅ 获取手机号
        if (phoneCode) {
            const accessToken = await getAccessToken();
            const wxRes = await axios.post(
                `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`, {
                    code: phoneCode
                }, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
            phoneNumber = wxRes.data?.phone_info?.phoneNumber ?? null;
        }

        // ===== [2] 若是鸿蒙端登录，只提供手机号 =====
        if (!phoneNumber) {
            // 鸿蒙端直接传手机号，不通过微信接口
            phoneNumber = req.body.phoneNumber;
            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: "缺少手机号"
                });
            }
        }

        // ===== [3] 查或建用户 =====
        const [existing] = await db.query("SELECT * FROM users WHERE phone_number = ?", [phoneNumber]);
        let user, isNewUser = false;

        if (existing.length > 0) {
            user = existing[0];

            // ✅ 如果是小程序端且数据库还没 openid，就更新
            if (openid && !user.openid) {
                await db.query("UPDATE users SET openid = ? WHERE id = ?", [openid, user.id]);
                user.openid = openid;
            }

        } else {
            const now = new Date();
            now.setHours(now.getHours() + 8);

            const newUser = {
                wxid: uuidv4(),
                phone_number: phoneNumber,
                username: "用户" + phoneNumber.slice(-4),
                avatar_url: "https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/avatar/default.png",
                free_counts: 5,
                points: 10,
                created_time: now,
                openid // 可能为空
            };

            const [insertResult] = await db.query("INSERT INTO users SET ?", [newUser]);
            newUser.id = insertResult.insertId;
            user = newUser;
            isNewUser = true;

            await db.query(`
          INSERT INTO user_reputation (user_id, total_score, completed_tasks, canceled_tasks, reports_received, average_rating, reliability_index)
          VALUES (?, 80.00, 0, 0, 0, 4.00, 1.0000)
        `, [user.id]);
        }

        // ===== [4] 返回 token =====
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
        res.status(500).json({
            success: false,
            message: "登录失败",
            error: error.response?.data || error.message
        });
    }
});



// 新版登录：只用 loginCode 换 openid，放弃手机号逻辑
// router.post("/wx-login", async (req, res) => {
//     const { code } = req.body;
//     if (!code) {
//       return res.status(400).json({
//         success: false,
//         message: "缺少 code"
//       });
//     }

//     try {
//       const { data } = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
//         params: {
//           appid: process.env.WX_APPID,
//           secret: process.env.WX_SECRET,
//           js_code: code,
//           grant_type: "authorization_code"
//         }
//       });

//       const { openid } = data;
//       if (!openid) {
//         return res.status(400).json({
//           success: false,
//           message: "获取 openid 失败",
//           raw: data
//         });
//       }

//       // 查找或创建用户
//       const [results] = await db.query("SELECT * FROM users WHERE openid = ?", [openid]);
//       let user = results[0];
//       let isNewUser = false;

//       if (!user) {
//         const now = new Date();
//         now.setHours(now.getHours() + 8); // 补时区
//         const newUser = {
//           wxid: uuidv4(),
//           username: "微信用户",
//           avatar_url: "https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/avatar/default.png",
//           free_counts: 5,
//           points: 10,
//           created_time: now,
//           openid
//         };
//         const [insertResult] = await db.query("INSERT INTO users SET ?", [newUser]);
//         newUser.id = insertResult.insertId;
//         user = newUser;
//         isNewUser = true;
//       }

//       const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "7d" });

//       res.json({
//         success: true,
//         token,
//         user,
//         isNewUser
//       });

//     } catch (err) {
//       console.error("❌ 登录失败:", err.response?.data || err.message);
//       res.status(500).json({
//         success: false,
//         message: "登录失败",
//         error: err.response?.data || err.message
//       });
//     }
//   });

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
        wxid,
        school_id
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
            "UPDATE users SET username = ?, avatar_url = ?, wxid = ?, school_id = ? WHERE id = ?",
            [username, avatar_url, wxid, school_id || 1, userId]
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
        const [results] = await db.query(
            `SELECT u.*, s.name AS school_name
             FROM users u
             LEFT JOIN schools s ON u.school_id = s.id
             WHERE u.id = ?`,
            [userId]
        );

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
        console.error("❌ 查询用户信息失败:", err);
        return res.status(500).json({
            success: false,
            message: "数据库错误"
        });
    }
});

// 获取他人信息
router.get("/public/:id", async (req, res) => {
    const userId = req.params.id;

    try {
        const [
            [user]
        ] = await db.query(
            `SELECT 
                u.wxid,
                u.username, 
                u.avatar_url,
                s.name AS school_name,
                u.vip_level,
                u.vip_expire_time,
                CASE
                    WHEN u.vip_level = 2 THEN TRUE
                    WHEN u.vip_level = 1 AND u.vip_expire_time > NOW() THEN TRUE
                    ELSE FALSE
                END AS isVip
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE u.id = ?`,
            [userId]
        );


        if (!user) {
            return res.status(404).json({
                success: false,
                message: "用户不存在"
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error("❌ 获取公开用户信息失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.get("/reputation/rules", async (req, res) => {
    const [rows] = await db.query(
        "SELECT id, event, score_delta, severity, trigger_action, description FROM reputation_rules ORDER BY id"
    );
    res.json({
        success: true,
        data: rows
    });
});

router.get("/reputation/logs", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const [logs] = await db.query(
            `SELECT id, change_type, score_delta, reason, created_at
         FROM reputation_logs 
         WHERE user_id = ?
         ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: logs
        });
    } catch (err) {
        console.error("❌ 查询信誉日志失败:", err);
        res.status(500).json({
            success: false,
            message: "数据库查询错误"
        });
    }
});

/**
 * 获取用户信誉信息
 * GET /user/reputation
 */
router.get("/reputation/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: "用户 ID 非法"
        });
    }

    try {
        const [results] = await db.query(
            `SELECT 
                total_score,
                completed_tasks,
                canceled_tasks,
                reports_received,
                average_rating,
                reliability_index,
                created_at,
                updated_at
             FROM user_reputation
             WHERE user_id = ?`,
            [userId]
        );

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "未找到该用户的信誉记录"
            });
        }

        return res.json({
            success: true,
            data: results[0]
        });
    } catch (err) {
        console.error("❌ 查询用户信誉失败:", err);
        return res.status(500).json({
            success: false,
            message: "数据库查询出错"
        });
    }
});

router.post("/check-username", async (req, res) => {
    const {
        username,
        id
    } = req.body;

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
    } = req.body;

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
router.post("/check-image", upload.single("image"), async (req, res) => {
    const filePath = req.file?.path;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!filePath) {
        return res.status(400).json({
            success: false,
            message: "图片上传失败"
        });
    }

    try {
        const tokenRes = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
            params: {
                grant_type: "client_credential",
                appid: process.env.WX_APPID,
                secret: process.env.WX_SECRET,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
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
                })
            }
        );

        fs.unlinkSync(filePath); // 删除临时文件

        console.log("✅ 微信返回图片审核结果:", wxRes.data);

        if (wxRes.data.errcode === 0) {
            return res.json({
                success: true,
                safe: true,
                raw: wxRes.data
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

// ✅ 微信内容安全检查：文本接口
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
            })
        });

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error("access_token 获取失败");

        // 构建 payload
        const payload = {
            content
        };

        const wxRes = await axios.post(
            `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`,
            payload, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            }
        );

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
        console.error("❌ 文本内容审核失败:", err);
        return res.status(500).json({
            success: false,
            message: "内容审核失败",
            error: err
        });
    }
});
module.exports = router;