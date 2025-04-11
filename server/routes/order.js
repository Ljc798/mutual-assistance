const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("./authMiddleware");

// 获取当前用户的所有支付成功的非任务类订单（VIP、积分兑换、佣金）
router.get("/records", authMiddleware, async (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少 userId" });
    }

    try {
        // 1. 获取已支付的 VIP 订单
        const [vipOrders] = await db.query(
            `SELECT id, plan, price, paid_at, 'vip' AS type FROM vip_orders 
             WHERE user_id = ? AND status = 'paid'
             ORDER BY paid_at DESC`,
            [userId]
        );

        // 2. 获取已支付的商城订单，并连商品表
        const [shopOrders] = await db.query(
            `SELECT s.id, i.name AS item_name, s.amount, s.paid_at, s.exchange_method, 'shop' AS type
             FROM shop_orders s
             JOIN shop_items i ON s.item_id = i.id
             WHERE s.user_id = ? AND s.status = 'paid'
             ORDER BY s.paid_at DESC`,
            [userId]
        );

        // 3. 获取任务佣金支付记录，并连任务表获取标题
        const [taskPayments] = await db.query(
            `SELECT tp.id, t.title, tp.amount, tp.paid_at, 'task' AS type
             FROM task_payments tp
             JOIN tasks t ON tp.task_id = t.id
             WHERE tp.receiver_id = ? AND tp.status = 'paid'
             ORDER BY tp.paid_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            vipOrders,
            shopOrders,
            taskPayments
        });
    } catch (err) {
        console.error("❌ 获取用户订单失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器内部错误",
            error: err
        });
    }
});

module.exports = router;
