const express = require("express");
const axios = require("axios");

const router = express.Router();

const DIFY_API_KEY = process.env.DIFY_API_KEY; // 在环境变量里设置
const DIFY_API_URL = "https://ai.mutualcampus.top/v1/chat-messages";

// 🌟 提取任务结构字段
router.post("/extract", async (req, res) => {
  const { text, conversation_id, userId } = req.body;

  if (!text || !userId) {
    return res.status(400).json({ error: "text 和 userId 为必填参数" });
  }

  try {
    const response = await axios.post(
      DIFY_API_URL,
      {
        query: text,
        user: userId, // 每个用户一条对话线
        conversation_id: conversation_id || "", // 如果为空则为新对话
        inputs: {}, // 若有额外参数可以填这里
        response_mode: "blocking" // 或 "streaming"，这里我们直接取完整响应
      },
      {
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = response.data;

    res.json({
      status: "ok",
      reply: data.answer || "", // AI 的原始回答
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