// routes/almightyAI.js
const express = require("express");
const axios = require("axios");
const authMiddleware = require("../authMiddleware");
const aiLimitCheckOnly = require('../aiLimitCheckOnly');
const aiLimit = require('../aiLimit');

const router = express.Router();

const DIFY_URL = "https://ai.mutualcampus.top/v1/chat-messages";
const API_KEY = process.env.AI_ALMIGHTY_API_KEY;

if (!API_KEY) {
    console.error("❌ 缺少环境变量 AI_ALMIGHTY_API_KEY");
}

// 转发到 Dify
router.post("/", authMiddleware, aiLimit, async (req, res) => {
    try {
        const {
            query,
            conversation_id
        } = req.body || {};
        if (!query) {
            return res.status(400).json({
                success: false,
                message: "缺少 query 参数"
            });
        }

        const difyUserId = req.user.id;
        const payload = {
            inputs: {
                user_id: difyUserId
            },
            query,
            response_mode: "blocking",
            conversation_id: conversation_id || null,
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

        const outputs = data?.data?.outputs ?? data?.outputs ?? {};
        const conversationId =
            data?.data?.conversation_id ?? data?.conversation_id ?? conversation_id ?? null;

        // 兼容不同字段名
        const answer =
            data?.data?.answer ??
            data?.answer ??
            outputs?.answer ??
            data?.output_text ??
            data?.message ??
            outputs?.final_answer ??
            null;

        if (!answer || typeof answer !== "string") {
            return res.status(502).json({
                success: false,
                message: "Dify 未返回 answer",
                debug: {
                    topLevelKeys: Object.keys(data || {}),
                    outputs
                },
                conversation_id: conversationId,
            });
        }

        return res.json({
            success: true,
            answer,
            conversation_id: conversationId
        });
    } catch (error) {
        const errPayload = error.response?.data || error.message || String(error);
        console.error("❌ 调用 Dify 失败:", errPayload);
        return res.status(500).json({
            success: false,
            message: "调用 Dify 失败",
            error: errPayload
        });
    }
});

router.get("/usage", authMiddleware, aiLimitCheckOnly, async (req, res) => {
    const {
        limit,
        used
    } = req.aiUsageInfo;
    const unlimited = limit === Infinity;
    res.json({
        remaining: unlimited ? -1 : Math.max(limit - used, 0),
        limit: unlimited ? -1 : limit,
    });
});

module.exports = router;