const express = require("express");
const axios = require("axios");
const authMiddleware = require("../authMiddleware");
const router = express.Router();
const db = require("../../config/db");
const aiLimit = require('../aiLimit')

const DIFY_API_KEY = process.env.AI_TASK_HELPER_API_KEY; // 在环境变量里设置
const DIFY_API_URL = "https://ai.mutualcampus.top/v1/chat-messages";
const VOICE_API_KEY = process.env.voice_api_key;

// ================== AI 字段提取主路由 ==================
router.post("/extract", authMiddleware, aiLimit, async (req, res) => {
    try {
        let {
            text,
            voice,
            conversation_id,
            tag,
            user_input,
            duration
        } = req.body;
        const userId = req.user?.id?.toString() || "anonymous"; // Dify user 必须是 string

        if (!text && !voice) {
            return res.status(400).json({
                error: "text 或 voice 必须至少一个"
            });
        }

        // ============ 构造 Dify 请求体 ============
        let difyRes;
        const isVoice = !!voice;

        // 计算延迟
        const [[userRow]] = await db.query(
            "SELECT vip_level, vip_expire_time, svip_expire_time, ai_speed_boost_days FROM users WHERE id = ?",
            [Number(req.user?.id || 0)]
        );
        const now = new Date();
        const vipActive = userRow?.vip_expire_time && new Date(userRow.vip_expire_time) > now;
        const svipActive = userRow?.svip_expire_time && new Date(userRow.svip_expire_time) > now;
        const baseLevel = Number(userRow?.vip_level || 0);
        const effectiveLevel = svipActive ? 2 : (vipActive ? baseLevel : 0);
        const boostActive = Number(userRow?.ai_speed_boost_days || 0) > 0;
        let delay = 2;
        if (effectiveLevel === 2) {
            delay = 0;
        } else if (effectiveLevel === 1 || boostActive) {
            delay = 1;
        }

        // ✅ 如果是语音请求：使用 remote_url 上传文件
        if (isVoice) {
            const payload = {
                query: "根据我的语音补全任务字段",
                user: userId,
                conversation_id: conversation_id || "", // 首次为空字符串
                response_mode: "blocking",
                inputs: {
                    tag: tag || "field_filling",
                    user_input: user_input,
                    voice: voice,
                    api_key: VOICE_API_KEY,
                    delay
                },

            };

            difyRes = await axios.post(DIFY_API_URL, payload, {
                headers: {
                    Authorization: `Bearer ${DIFY_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
        }
        // ✅ 如果是文字请求：普通 JSON 请求
        else {
            const payload = {
                query: text,
                user: userId,
                conversation_id: conversation_id || "",
                response_mode: "blocking",
                inputs: {
                    tag: tag || "field_filling",
                    user_input: user_input || "",
                    delay
                },
            };

            difyRes = await axios.post(DIFY_API_URL, payload, {
                headers: {
                    Authorization: `Bearer ${DIFY_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
        }

        // ================== 响应处理 ==================
        const data = difyRes.data;
        const difyConvId = data.conversation_id;

        // ✅ 如果数据库中还没有这场会话，插入一条
        const [existingConv] = await db.query(
            "SELECT id FROM ai_conversation WHERE conversation_id = ? AND user_id = ?",
            [difyConvId, userId]
        );

        if (existingConv.length === 0) {
            await db.query(
                "INSERT INTO ai_conversation (user_id, conversation_id, title) VALUES (?, ?, ?)",
                [userId, difyConvId, text ? text.slice(0, 30) : "语音会话"]
            );
        }

        // ✅ 插入用户消息
        const [msgRes] = await db.query(
            "INSERT INTO ai_message (conversation_id, user_id, role, content, message_type) VALUES (?, ?, 'user', ?, ?)",
            [difyConvId, userId, text || "[语音消息]", isVoice ? "voice" : "text"]
        );
        const messageId = msgRes.insertId;

        // ✅ 如果是语音，插入附件表
        if (isVoice) {
            await db.query(
                "INSERT INTO ai_attachment (message_id, file_url, file_type, duration) VALUES (?, ?, 'voice', ?)",
                [messageId, voice, duration]
            );
        }

        // ✅ 插入 AI 回复
        const reply = data.answer || "(AI 无回复)";
        await db.query(
            "INSERT INTO ai_message (conversation_id, user_id, role, content, message_type) VALUES (?, ?, 'ai', ?, 'text')",
            [difyConvId, userId, reply]
        );

        // ✅ 返回给前端
        const remaining =
            req.aiUsageInfo.limit === Infinity ?
            "无限" :
            Math.max(req.aiUsageInfo.limit - req.aiUsageInfo.used, 0);

        // ✅ 返回给前端
        res.json({
            status: "ok",
            reply,
            conversation_id: difyConvId,
            remaining,
            limit: req.aiUsageInfo.limit
        });
    } catch (error) {
        console.error("❌ 调用 Dify 失败:", error.message, error.response?.data || {});
        res.status(500).json({
            error: "调用 AI 服务失败",
            detail: error.response?.data || error.message,
        });
    }
});

module.exports = router;