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
    const { query, conversation_id, user, files } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: "缺少 query 参数" });
    }

    const response = await axios.post(
      DIFY_URL,
      {
        inputs: {},
        query,
        response_mode: "blocking", // ✅ 用 blocking，直接返回 JSON，前端好处理
        conversation_id: conversation_id || "",
        user: user || "default-user",
        files: files || []
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ 调用 Dify 失败:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "调用 Dify 失败",
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;