const axios = require("axios");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // 数据库连接
const SECRET_KEY = process.env.JWT_SECRET || "your_jwt_secret"; // JWT密钥

const WECHAT_APPID = process.env.WECHAT_APPID;
const WECHAT_SECRET = process.env.WECHAT_SECRET;

exports.login = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "缺少 code 参数" });
        }

        // 访问微信 API 获取 openid 和 session_key
        const wechatRes = await axios.get(`https://api.weixin.qq.com/sns/jscode2session`, {
            params: {
                appid: WECHAT_APPID,
                secret: WECHAT_SECRET,
                js_code: code,
                grant_type: "authorization_code",
            },
        });

        const { openid, session_key } = wechatRes.data;
        if (!openid) {
            return res.status(400).json({ error: "微信登录失败", details: wechatRes.data });
        }

        // 在数据库中查找或创建用户
        db.query("SELECT * FROM users WHERE wxid = ?", [openid], (err, results) => {
            if (err) return res.status(500).json({ error: "数据库查询失败" });

            let user;
            if (results.length > 0) {
                user = results[0]; // 用户已存在
            } else {
                // 如果用户不存在，则创建用户
                const newUser = { wxid: openid, username: `wx_${openid}`, free_counts: 5, points: 0 };
                db.query("INSERT INTO users SET ?", newUser, (insertErr) => {
                    if (insertErr) return res.status(500).json({ error: "创建用户失败" });
                });
                user = newUser;
            }

            // 生成 JWT Token
            const token = jwt.sign({ id: user.id, wxid: user.wxid }, SECRET_KEY, { expiresIn: "7d" });

            res.json({ token, user });
        });
    } catch (error) {
        res.status(500).json({ error: "服务器错误", details: error.message });
    }
};