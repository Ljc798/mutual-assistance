// routes/messages.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 获取消息列表（最近联系人 + 最新一条消息）
router.get("/list", async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: "缺少 userId" });
    }
  
    try {
      const [rows] = await db.query(
        `SELECT 
            m.*, 
            u.username, 
            u.avatar_url
         FROM messages m
         JOIN users u 
           ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
         WHERE m.id IN (
           SELECT MAX(id)
           FROM messages
           WHERE sender_id = ? OR receiver_id = ?
           GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
         )
         ORDER BY m.created_time DESC`,
        [userId, userId, userId]
      );
  
      res.json({ success: true, chats: rows });
    } catch (err) {
      console.error("❌ 获取消息列表失败:", err);
      res.status(500).json({ success: false, message: "服务器异常" });
    }
  });

  // 获取与某个用户的历史聊天记录
router.get("/history", async (req, res) => {
    const { userId, targetId } = req.query;
  
    if (!userId || !targetId) {
      return res.status(400).json({
        success: false,
        message: "缺少 userId 或 targetId"
      });
    }
  
    try {
      const [messages] = await db.query(
        `SELECT *
         FROM messages
         WHERE (sender_id = ? AND receiver_id = ?)
            OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_time ASC`,
        [userId, targetId, targetId, userId]
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