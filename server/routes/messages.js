const express = require("express");
const router = express.Router();
const db = require("../config/db");

function getRoomId(userA, userB) {
    return [userA, userB].sort((a, b) => a - b).join("_");
}

// ✅ 获取消息列表（最近联系人 + 最新一条消息）
router.get("/list", async (req, res) => {
    const {
        userId
    } = req.query;
    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "缺少 userId"
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT 
          m.*, 
          u.username, 
          u.avatar_url
       FROM messages m
       JOIN users u ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
       JOIN (
         SELECT MAX(id) AS id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY room_id
       ) latest ON m.id = latest.id
       ORDER BY m.created_time DESC`,
            [userId, userId, userId]
        );

        res.json({
            success: true,
            chats: rows
        });
    } catch (err) {
        console.error("❌ 获取消息列表失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器异常"
        });
    }
});

// ✅ 获取与某个用户的历史聊天记录
router.get("/history", async (req, res) => {
    const { room_id } = req.query;

    if (!room_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 room_id"
        });
    }

    try {
        const [messages] = await db.query(
            `SELECT * FROM messages WHERE room_id = ? ORDER BY created_time ASC`,
            [room_id]
        );

        res.json({ success: true, messages });
    } catch (err) {
        console.error("❌ 获取聊天历史失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器内部错误"
        });
    }
});

module.exports = router;