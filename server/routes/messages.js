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
          u.avatar_url,
          (
            SELECT COUNT(*) 
            FROM messages AS unread 
            WHERE unread.room_id = m.room_id 
              AND unread.receiver_id = ? 
              AND unread.is_read = 0
          ) AS unread_count
        FROM messages m
        JOIN users u ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
        JOIN (
          SELECT MAX(id) AS id
          FROM messages
          WHERE sender_id = ? OR receiver_id = ?
          GROUP BY room_id
        ) latest ON m.id = latest.id
        ORDER BY m.created_time DESC`,
            [userId, userId, userId, userId]
        );

        res.json({
            success: true,
            chats: rows
        });
    } catch (err) {
        console.error("❌ 获取消息列表失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器异常",
            error: err
        });
    }
});

// ✅ 获取与某个用户的历史聊天记录
router.get("/history", async (req, res) => {
    const {
        room_id
    } = req.query;

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

        res.json({
            success: true,
            messages
        });
    } catch (err) {
        console.error("❌ 获取聊天历史失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器内部错误"
        });
    }
});

router.post('/mark-read', async (req, res) => {
    const {
        room_id,
        user_id
    } = req.body;

    if (!room_id || !user_id) {
        return res.status(400).json({
            success: false,
            message: 'room_id 和 user_id 是必须的'
        });
    }

    try {
        const sql = `
        UPDATE messages
        SET is_read = 1
        WHERE room_id = ?
          AND receiver_id = ?
          AND is_read = 0
      `;
        const result = await db.query(sql, [room_id, user_id]);

        res.json({
            success: true,
            updatedCount: result.affectedRows,
            message: `已成功标记 ${result.affectedRows} 条消息为已读`
        });
    } catch (err) {
        console.error('[mark-read] 数据库错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: err
        });
    }
});

router.get('/read-status', async (req, res) => {
    const {
        room_id,
        user_id
    } = req.query;

    if (!room_id || !user_id) {
        return res.status(400).json({
            success: false,
            message: '缺少参数'
        });
    }

    const sql = `
      SELECT MAX(id) AS last_read_message_id
      FROM messages
      WHERE room_id = ?
        AND sender_id = ?
        AND is_read = 1
    `;

    try {
        const [result] = await db.query(sql, [room_id, user_id]);
        res.json({
            success: true,
            last_read_message_id: result?.last_read_message_id || null
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err
        });
    }
});

module.exports = router;