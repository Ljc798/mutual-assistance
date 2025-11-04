const express = require("express");
const axios = require("axios");
const authMiddleware = require("../authMiddleware");

const router = express.Router();

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
        const userId = req.user.id; // 从认证中间件获取用户ID

        // ✅ 如果 text 为空，但有 voice，就用语音作为内容
        if (!text && voice) {
            text = `[语音消息] ${voice}`;
        }

        // ❌ 如果两者都为空，才报错
        if (!text) {
            return res.status(400).json({
                error: "text 或 voice 必须至少一个"
            });
        }

        // ✅ 调用 Dify 工作流
        const response = await axios.post(
            DIFY_API_URL, {
                query: text, // Dify 主输入
                user: userId, // 每个用户一条独立对话线
                conversation_id: conversation_id || null,
                inputs: {
                    tag: tag || "字段提取",
                    voice: voice || "", // ✅ 把语音 URL 一起传给 workflow
                    user_input: user_input || "" // ✅ 用户描述（比如“根据语音填充字段”）
                },
                response_mode: "blocking"
            }, {
                headers: {
                    Authorization: `Bearer ${DIFY_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const data = response.data;

        res.json({
            status: "ok",
            reply: data.answer || "",
            conversation_id: data.conversation_id || "",
            usage: data.usage || {},
            raw: data
        });
    } catch (error) {
        console.error("❌ 调用 Dify 失败:", error.message, error.response?.data || {});
        res.status(500).json({
            error: "调用 AI 服务失败",
            detail: error.response?.data || error.message
        });
    }
});


module.exports = router;