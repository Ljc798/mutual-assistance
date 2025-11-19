// routes/almightyAI.js
const express = require("express");
const axios = require("axios");
const authMiddleware = require("../authMiddleware");
const db = require("../../config/db");
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

        const [[userRow]] = await db.query(
            "SELECT vip_level, vip_expire_time, svip_expire_time, ai_speed_boost_days FROM users WHERE id = ?",
            [difyUserId]
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

        const payload = {
            inputs: {
                user_id: difyUserId,
                delay
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
    const { limit, used, dailyBonus, quotaRemain } = req.aiUsageInfo;
    const unlimited = limit === Infinity;
    res.json({
        remaining: unlimited ? -1 : Math.max(limit - used, 0),
        limit: unlimited ? -1 : limit,
        daily_bonus: unlimited ? 0 : Math.max(dailyBonus || 0, 0),
        quota_remain: quotaRemain || 0
    });
});

module.exports = router;