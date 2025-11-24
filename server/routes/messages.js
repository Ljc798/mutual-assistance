const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("./authMiddleware");

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

// ✅ 获取所有未读数量（聊天消息 + 系统通知）
router.get('/unread-count', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: '缺少 userId 参数'
        });
    }

    try {
        // 1. 查询未读聊天消息数量
        const [[msgResult]] = await db.query(
            `SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0`,
            [userId]
        );

        // 2. 查询未读通知数量（你可以根据实际情况加字段 is_read）
        const [[notifyResult]] = await db.query(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        res.json({
            success: true,
            chat_unread: msgResult.count,
            notify_unread: notifyResult.count,
            total: msgResult.count + notifyResult.count
        });

    } catch (err) {
        console.error("❌ 获取未读消息数量失败:", err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err
        });
    }
});

// 举报聊天房间/对话
router.post('/report', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { room_id, reason = '', description = '' } = req.body || {};
  if (!room_id || !reason) {
    return res.status(400).json({ success: false, message: '缺少 room_id 或 reason' });
  }
  try {
    await db.query(
      'INSERT INTO chat_reports (room_id, reporter_id, reason, description) VALUES (?, ?, ?, ?)',
      [room_id, userId, reason, description]
    );
    await db.query(
      'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)',
      [10, 'report', '📢 有新的举报', `用户 ${userId} 举报了聊天房间 ${room_id}\n理由：${reason}${description ? `\n补充说明：${description}` : ''}`]
    );
    return res.json({ success: true, message: '举报已提交' });
  } catch (err) {
    console.error('❌ 聊天举报失败:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;