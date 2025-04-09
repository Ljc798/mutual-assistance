const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 获取最近一条通知
// GET /api/notification/latest
router.get("/latest", require("./authMiddleware"), async (req, res) => {
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
            return res.json({ success: true, notification: null });
        }

        res.json({ success: true, notification: rows[0] });
    } catch (err) {
        console.error("❌ 获取用户通知失败:", err);
        res.status(500).json({ success: false, message: "服务器错误" });
    }
});

router.get("/all", require("./authMiddleware"), async (req, res) => {
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
  
      res.json({ success: true, notifications: rows });
    } catch (err) {
      console.error("❌ 获取通知失败:", err);
      res.status(500).json({ success: false, message: "服务器错误" });
    }
  });

module.exports = router;