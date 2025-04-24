const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("./authMiddleware"); // 你已经有了就别装没见过

// ✉️ 用户提交反馈（登录后）
router.post("/submit", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const {
        title,
        content
    } = req.body;

    if (!title || !content) {
        return res.status(400).json({
            success: false,
            message: "请填写标题和内容",
        });
    }

    try {
        await db.query(
            "INSERT INTO feedbacks (user_id, title, content, reward_points) VALUES (?, ?, ?, 0)",
            [userId, title.trim(), content.trim()]
        );

        res.json({
            success: true,
            message: "感谢您的反馈，我们可能会忽略它。",
        });
    } catch (err) {
        console.error("❌ 提交反馈失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误，请稍后再试",
        });
    }
});

module.exports = router;