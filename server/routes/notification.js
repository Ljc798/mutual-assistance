const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("./authMiddleware");


// 获取最近一条通知
router.get("/latest", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const [rows] = await db.query(
            `SELECT id, type, title, content, is_read, created_at 
             FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.json({
                success: true,
                notification: null
            });
        }

        res.json({
            success: true,
            notification: rows[0]
        });
    } catch (err) {
        console.error("❌ 获取用户通知失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.get("/all", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const [rows] = await db.query(
            `SELECT id, type, title, content, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 100`,
            [userId]
        );

        res.json({
            success: true,
            notifications: rows
        });
    } catch (err) {
        console.error("❌ 获取通知失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});
// 标记某条通知为已读
router.post("/mark-read", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const {
        id
    } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "缺少通知 ID",
        });
    }

    try {
        const [result] = await db.query(
            `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "通知不存在或无权限",
            });
        }

        res.json({
            success: true,
            message: "已标记为已读",
        });
    } catch (err) {
        console.error("❌ 标记通知为已读失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误",
        });
    }
});

// ✅ 一键全部已读
router.post("/mark-all-read", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        // 更新该用户的所有未读通知
        const [result] = await db.query(
            `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        if (result.affectedRows === 0) {
            return res.json({
                success: true,
                message: "暂无未读通知",
            });
        }

        res.json({
            success: true,
            message: `已标记 ${result.affectedRows} 条通知为已读`,
        });
    } catch (err) {
        console.error("❌ 一键已读失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误",
        });
    }
});


module.exports = router;