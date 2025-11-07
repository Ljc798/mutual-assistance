const express = require("express");
const axios = require("axios");
const authMiddleware = require("../authMiddleware");
const FormData = require("form-data");
const router = express.Router();
const db = require("../../config/db");

const DIFY_API_KEY = process.env.AI_TASK_HELPER_API_KEY; // 在环境变量里设置
const DIFY_API_URL = "https://ai.mutualcampus.top/v1/chat-messages";

// 🌟 提取任务结构字段
router.post("/extract", authMiddleware, async (req, res) => {
    try {
        let {
            text,
            voice,
            conversation_id,
            tag,
            user_input
        } = req.body;
        const userId = req.user?.id || 0;

        if (!text && !voice) {
            return res.status(400).json({
                error: "text 或 voice 必须至少一个"
            });
        }

        // ✅ 构造 Dify 请求体
        let difyRes;
        const isVoice = !!voice;

        if (isVoice) {
            const formData = new FormData();
            formData.append("user", userId);
            formData.append("response_mode", "blocking");
            formData.append(
                "inputs",
                JSON.stringify({
                    tag: tag || "field_filling",
                    user_input: user_input || "",
                })
            );
            if (conversation_id) formData.append("conversation_id", conversation_id);

            // 下载语音文件后上传给 Dify
            const audioRes = await axios.get(voice, {
                responseType: "arraybuffer"
            });
            formData.append("voice", Buffer.from(audioRes.data), {
                filename: "voice.mp3",
                contentType: "audio/mpeg",
            });

            difyRes = await axios.post(DIFY_API_URL, formData, {
                headers: {
                    Authorization: `Bearer ${DIFY_API_KEY}`,
                    ...formData.getHeaders(),
                },
            });
        } else {
            difyRes = await axios.post(
                DIFY_API_URL, {
                    query: text,
                    user: userId,
                    conversation_id: conversation_id || null,
                    inputs: {
                        tag: tag || "field_filling",
                        user_input: user_input || "",
                    },
                    response_mode: "blocking",
                }, {
                    headers: {
                        Authorization: `Bearer ${DIFY_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        const data = difyRes.data;
        const difyConvId = data.conversation_id;

        // ✅ 如果是第一次调用（数据库还没有会话），现在才插入
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

        if (isVoice) {
            await db.query(
                "INSERT INTO ai_attachment (message_id, file_url, file_type) VALUES (?, ?, 'voice')",
                [messageId, voice]
            );
        }

        // ✅ 插入 AI 回复
        const reply = data.answer || "(AI无回复)";
        await db.query(
            "INSERT INTO ai_message (conversation_id, user_id, role, content, message_type) VALUES (?, ?, 'ai', ?, 'text')",
            [difyConvId, userId, reply]
        );

        // ✅ 返回 Dify conversation_id 给前端
        res.json({
            status: "ok",
            reply,
            conversation_id: difyConvId,
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