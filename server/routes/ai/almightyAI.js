// routes/almightyAI.js
const express = require("express");
const axios = require("axios");
const authMiddleware = require("../authMiddleware");

const router = express.Router();

const DIFY_URL = "https://ai.mutualcampus.top/v1/chat-messages";
const API_KEY = process.env.AI_ALMIGHTY_API_KEY;

if (!API_KEY) {
    console.error("❌ 缺少环境变量 AI_ALMIGHTY_API_KEY");
}

// 转发到 Dify
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            query,
            conversation_id,
            files
        } = req.body || {};
        if (!query) {
            return res.status(400).json({
                success: false,
                message: "缺少 query 参数"
            });
        }

        const difyUserId = req.user.id;

        const payload = {
            inputs: {},
            query,
            response_mode: "blocking", // 阻塞拿结构化结果
            conversation_id: conversation_id || null, // 空用 null，别传 ""
            user: difyUserId,
        };

        const {
            data
        } = await axios.post(DIFY_URL, payload, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            timeout: 20000,
        });

        // 兼容不同形态的返回（托管 / 私有版本可能略有不同）
        const outputs = data?.data?.outputs || data?.outputs || {};
        const conversationId =
            data?.data?.conversation_id || data?.conversation_id || conversation_id || null;

        const practice_sql = outputs.practice_sql;
        const theory_sql = outputs.theory_sql;

        if (!practice_sql || !theory_sql) {
            return res.status(400).json({
                success: false,
                message: "Dify 未返回完整的 SQL（practice_sql / theory_sql）",
                debug: {
                    outputs
                },
            });
        }

        return res.json({
            success: true,
            practice_sql,
            theory_sql,
            conversation_id: conversationId,
        });
    } catch (error) {
        console.error("❌ 调用 Dify 失败:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "调用 Dify 失败",
            error: error.response?.data || error.message,
        });
    }
});

module.exports = router;