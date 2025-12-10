const express = require("express");
const router = express.Router();
const db = require("../config/db");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;
const TENCENT_SMS_HOST = "sms.tencentcloudapi.com";
const TENCENT_SMS_ACTION = "SendSms";
const TENCENT_SMS_VERSION = "2021-01-11";
const TENCENT_SMS_REGION = process.env.TENCENT_SMS_REGION || "ap-guangzhou";
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID;
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const TENCENT_SMS_SDKAPPID = process.env.TENCENT_SMS_SDKAPPID;
const TENCENT_SMS_SIGN = process.env.TENCENT_SMS_SIGN;
const TENCENT_SMS_TEMPLATE_ID = process.env.TENCENT_SMS_TEMPLATE_ID;
const TENCENT_SMS_TEMPLATE_MINUTES = parseInt(process.env.TENCENT_SMS_TEMPLATE_MINUTES || '5', 10);
const {
    v4: uuidv4
} = require("uuid");
require("dotenv").config();
const {
    getAccessToken
} = require('../utils/wechat');
const crypto = require("crypto");
const redis = require("../utils/redis");


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
          VALUES (?, 75.00, 0, 0, 0, 3.50, 1.0000)
        `, [user.id]);
        }

        // ===== [4] 返回 token =====
        const token = jwt.sign({
            id: user.id
        }, SECRET_KEY, {
            expiresIn: "7d"
        });

        // 查询学校名称（如有）
        let schoolName = null
        const schoolId = user.school_id || null
        if (schoolId) {
            try {
                const [schoolRows] = await db.query("SELECT name FROM schools WHERE id = ?", [schoolId])
                if (schoolRows && schoolRows.length > 0) {
                    schoolName = schoolRows[0].name
                }
            } catch (e) {
                console.warn("⚠️ 查询学校名称失败:", e.message)
            }
        }

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                wxid: user.wxid,
                username: user.username,
                phone_number: user.phone_number,
                openid: user.openid,
                balance: user.balance,
                avatar_url: user.avatar_url,
                free_counts: user.free_counts,
                points: user.points,
                vip_level: user.vip_level,
                vip_expire_time: user.vip_expire_time,
                created_time: user.created_time,
                school_id: schoolId,
                school_name: schoolName
            },
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

router.post("/password-login", async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({
            success: false,
            message: "缺少手机号或密码",
        });
    }

    try {
        // 1️⃣ 根据手机号查用户
        const [rows] = await db.query(
            "SELECT * FROM users WHERE phone_number = ?",
            [phone]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "该手机号未注册",
            });
        }

        const user = rows[0];

        // 2️⃣ 校验密码是否正确
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "密码错误",
            });
        }

        // 3️⃣ 生成 JWT
        const token = jwt.sign({ id: user.id }, SECRET_KEY, {
            expiresIn: "7d",
        });

        // 4️⃣ 登录成功（补充学校信息）
        let schoolName = null
        const schoolId = user.school_id || null
        if (schoolId) {
            try {
                const [schoolRows] = await db.query("SELECT name FROM schools WHERE id = ?", [schoolId])
                if (schoolRows && schoolRows.length > 0) {
                    schoolName = schoolRows[0].name
                }
            } catch (e) {
                console.warn("⚠️ 查询学校名称失败:", e.message)
            }
        }

        // 4️⃣ 登录成功
        return res.json({
            success: true,
            message: "登录成功",
            token,
            user: {
                id: user.id,
                wxid: user.wxid,
                username: user.username,
                openid: user.openid,
                balance: user.balance,
                avatar_url: user.avatar_url,
                free_counts: user.free_counts,
                points: user.points,
                vip_level: user.vip_level,
                vip_expire_time: user.vip_expire_time,
                created_time: user.created_time,
                school_id: schoolId,
                school_name: schoolName
            },
        });
    } catch (err) {
        console.error("❌ 密码登录失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误",
            error: err.message,
        });
    }
});

function sha256Hex(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function hmacSha256(key, msg) {
  return crypto.createHmac("sha256", key).update(msg).digest();
}

function formatDate(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

async function sendTencentSms(phone, code, minutes) {
  const payload = {
    SmsSdkAppId: TENCENT_SMS_SDKAPPID,
    SignName: TENCENT_SMS_SIGN,
    TemplateId: TENCENT_SMS_TEMPLATE_ID,
    TemplateParamSet: [code, String(minutes > 0 ? minutes : 5)],
    PhoneNumberSet: ["+86" + phone]
  };
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const date = formatDate(timestamp);
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = "content-type:application/json\nhost:" + TENCENT_SMS_HOST + "\n";
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = sha256Hex(body);
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join("\n");
  const credentialScope = date + "/sms/tc3_request";
  const stringToSign = [
    "TC3-HMAC-SHA256",
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const kDate = hmacSha256("TC3" + TENCENT_SECRET_KEY, date);
  const kService = hmacSha256(kDate, "sms");
  const kSigning = hmacSha256(kService, "tc3_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${TENCENT_SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const headers = {
    Authorization: authorization,
    "Content-Type": "application/json",
    Host: TENCENT_SMS_HOST,
    "X-TC-Action": TENCENT_SMS_ACTION,
    "X-TC-Version": TENCENT_SMS_VERSION,
    "X-TC-Timestamp": timestamp,
    "X-TC-Region": TENCENT_SMS_REGION
  };
  const { data } = await axios.post("https://" + TENCENT_SMS_HOST, body, { headers });
  return data;
}

router.post("/sms/send-code", async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  if (!phone || !/^\d{11}$/.test(phone)) {
    console.warn("SMS.send invalid phone", { phone });
    return res.status(400).json({ success: false, message: "手机号格式错误" });
  }
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY || !TENCENT_SMS_SDKAPPID || !TENCENT_SMS_SIGN || !TENCENT_SMS_TEMPLATE_ID) {
    console.warn("SMS.config missing", { hasId: !!TENCENT_SECRET_ID, hasKey: !!TENCENT_SECRET_KEY, appid: TENCENT_SMS_SDKAPPID, sign: TENCENT_SMS_SIGN, tpl: TENCENT_SMS_TEMPLATE_ID });
    return res.status(500).json({ success: false, message: "短信配置缺失" });
  }
  try {
    const lastKey = `sms:login:last:${phone}`;
    const countKey = `sms:login:count:${phone}:${new Date().toISOString().slice(0,10)}`;
    const lastTsRaw = await redis.get(lastKey);
    const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
    if (lastTs && Date.now() - lastTs < 60000) {
      console.warn("SMS.rate limited", { phone, cooldownMs: Date.now() - lastTs });
      return res.status(429).json({ success: false, message: "发送过于频繁" });
    }
    const countRaw = await redis.get(countKey);
    const count = countRaw ? Number(countRaw) : 0;
    if (count >= 5) {
      console.warn("SMS.daily limit", { phone, count });
      return res.status(429).json({ success: false, message: "今日发送次数已达上限" });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await redis.setex(`sms:login:code:${phone}`, 300, code);
    await redis.set(lastKey, String(Date.now()));
    await redis.set(countKey, String(count + 1));
    await redis.expire(countKey, 86400);
    console.info("SMS.code generated", { phone });
    const data = await sendTencentSms(phone, code, TENCENT_SMS_TEMPLATE_MINUTES);
    const status = data?.Response?.SendStatusSet?.[0];
    console.info("SMS.tencent response", { code: status?.Code, message: status?.Message, minutes: TENCENT_SMS_TEMPLATE_MINUTES });
    if (status && String(status.Code).toLowerCase() === "ok") {
      return res.json({ success: true });
    }
    const errMsg = data?.Response?.Error?.Message || status?.Message || "短信发送失败";
    console.warn("SMS.send failed", { phone, err: errMsg });
    return res.status(500).json({ success: false, message: errMsg });
  } catch (error) {
    const msg = error?.response?.data?.Response?.Error?.Message || error?.message || "短信发送失败";
    console.error("SMS.exception", msg);
    return res.status(500).json({ success: false, message: msg });
  }
});

router.post("/sms-login", async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const code = String(req.body.code || "").trim();
  if (!phone || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "手机号格式错误" });
  }
  if (!code || !/^\d{4,6}$/.test(code)) {
    return res.status(400).json({ success: false, message: "验证码格式错误" });
  }
  try {
    const saved = await redis.get(`sms:login:code:${phone}`);
    if (!saved || saved !== code) {
      console.warn("SMS.login invalid code", { phone });
      return res.status(400).json({ success: false, message: "验证码错误或已过期" });
    }
    await redis.del(`sms:login:code:${phone}`);
    const [rows] = await db.query("SELECT * FROM users WHERE phone_number = ?", [phone]);
    let user = rows && rows[0];
    let isNewUser = false;
    if (!user) {
      const now = new Date();
      const newUser = {
        wxid: uuidv4(),
        phone_number: phone,
        username: "用户" + phone.slice(-4),
        avatar_url: "https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/avatar/default.png",
        free_counts: 5,
        points: 10,
        created_time: now
      };
      const [insertResult] = await db.query("INSERT INTO users SET ?", [newUser]);
      newUser.id = insertResult.insertId;
      user = newUser;
      isNewUser = true;
      await db.query(
        "INSERT INTO user_reputation (user_id, total_score, completed_tasks, canceled_tasks, reports_received, average_rating, reliability_index) VALUES (?, 75.00, 0, 0, 0, 3.50, 1.0000)",
        [user.id]
      );
    }
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "7d" });
    let schoolName = null;
    const schoolId = user.school_id || null;
    if (schoolId) {
      try {
        const [schoolRows] = await db.query("SELECT name FROM schools WHERE id = ?", [schoolId]);
        if (schoolRows && schoolRows.length > 0) {
          schoolName = schoolRows[0].name;
        }
      } catch (_e) {}
    }
    const payload = {
      success: true,
      token,
      user: {
        id: user.id,
        wxid: user.wxid,
        username: user.username,
        phone_number: user.phone_number,
        openid: user.openid,
        balance: user.balance,
        avatar_url: user.avatar_url,
        free_counts: user.free_counts,
        points: user.points,
        vip_level: user.vip_level,
        vip_expire_time: user.vip_expire_time,
        created_time: user.created_time,
        school_id: schoolId,
        school_name: schoolName
      },
      isNewUser
    };
    console.info("SMS.login success", { userId: user.id });
    return res.json(payload);
  } catch (err) {
    console.error("SMS.login exception", err?.message || err);
    return res.status(500).json({ success: false, message: "服务器错误" });
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
            user: {
                id: user.id,
                wxid: user.wxid,
                username: user.username,
                openid: user.openid,
                balance: user.balance,
                avatar_url: user.avatar_url,
                free_counts: user.free_counts,
                points: user.points,
                vip_level: user.vip_level,
                vip_expire_time: user.vip_expire_time,
                created_time: user.created_time
            },
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

        const [[newUser]] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);

        return res.json({
            success: true,
            message: "用户信息更新成功",
            user: {
                id: newUser.id,
                wxid: newUser.wxid,
                username: newUser.username,
                avatar_url: newUser.avatar_url,
                school_id: newUser.school_id,
                free_counts: newUser.free_counts,
                points: newUser.points,
                vip_level: newUser.vip_level,
                vip_expire_time: newUser.vip_expire_time,
                created_time: newUser.created_time,
                openid: newUser.openid,
                balance: newUser.balance
            }
        });

    } catch (err) {
        console.error("❌ 更新用户信息失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// 开通或升级 VIP 等级
router.post("/vip/activate", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { level } = req.body; // 1: VIP, 2: SVIP
    if (![1, 2].includes(Number(level))) {
        return res.status(400).json({ success: false, message: "无效的 VIP 等级" });
    }
    try {
        await db.query(`UPDATE users SET vip_level = ? WHERE id = ?`, [Number(level), userId]);
        const [[user]] = await db.query(`SELECT vip_level, vip_expire_time FROM users WHERE id = ?`, [userId]);
        return res.json({ success: true, message: "VIP 等级已更新", vip_level: user.vip_level, vip_expire_time: user.vip_expire_time });
    } catch (err) {
        console.error("❌ 更新 VIP 等级失败:", err);
        return res.status(500).json({ success: false, message: "服务器错误" });
    }
});

// 获取某用户收到的任务评价
router.get("/:id/reviews", async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ success: false, message: "用户ID非法" });
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.task_id, r.reviewer_id, r.rating, r.comment, r.created_time,
              u.username, u.avatar_url
       FROM task_reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_time DESC
       LIMIT 100`,
      [userId]
    );

    function maskName(name) {
      if (!name) return "***";
      const n = String(name);
      if (n.length <= 2) return n[0] + "***" + (n[1] || "");
      return n[0] + "***" + n[n.length - 1];
    }

    const reviews = rows.map(r => ({
      id: r.id,
      task_id: r.task_id,
      rating: parseFloat(r.rating),
      comment: r.comment || "",
      created_time: r.created_time,
      reviewer_avatar: r.avatar_url || "",
      reviewer_masked_name: maskName(r.username || "")
    }));
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error("❌ 获取用户评价失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
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
router.post("/delete", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        await db.query("DELETE FROM users WHERE id = ?", [userId]);
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, message: "注销失败", error: err.message });
    }
});
module.exports = router;
// Harmony 专用：更新基础资料（不涉及头像）
router.post("/harmony/update-basic", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { username, wxid, school_id } = req.body;

  try {
    const [[user]] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    // 检查用户名占用
    const [nameCheck] = await db.query(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [username, userId]
    );
    if (nameCheck.length > 0) {
      return res.status(400).json({ success: false, message: "用户名已被占用，请重新输入" });
    }

    // 检查 wxid 占用
    const [wxidCheck] = await db.query(
      "SELECT id FROM users WHERE wxid = ? AND id != ?",
      [wxid, userId]
    );
    if (wxidCheck.length > 0) {
      return res.status(400).json({ success: false, message: "用户ID已被使用，请重新输入" });
    }

    await db.query(
      "UPDATE users SET username = ?, wxid = ?, school_id = ? WHERE id = ?",
      [username, wxid, school_id || user.school_id || 1, userId]
    );

    return res.json({ success: true, message: "用户信息更新成功" });
  } catch (err) {
    console.error("❌ Harmony 基础资料更新失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});
