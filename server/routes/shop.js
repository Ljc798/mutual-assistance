const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("./authMiddleware"); // 引入身份认证中间件

// 📌 获取所有上架的商品
router.get("/items", async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT id, name, type, cost, description, total, remaining, price, exchange_type 
             FROM shop_items WHERE available = 1`
        );
        res.json({
            success: true,
            items
        });
    } catch (err) {
        console.error("❌ 获取商城商品失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// 📌 积分兑换商品，添加 authMiddleware
router.post("/redeem-point", authMiddleware, async (req, res) => { // 添加了身份验证中间件
    const {
        user_id,
        item_id
    } = req.body;
    if (!user_id || !item_id) {
        return res.status(400).json({
            success: false,
            message: "缺少参数"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [
            [item]
        ] = await connection.query(
            `SELECT * FROM shop_items WHERE id = ? FOR UPDATE`, [item_id]
        );
        if (!item) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "商品不存在"
            });
        }
        if (item.exchange_type !== "point" && item.exchange_type !== "both") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "该商品不支持积分兑换"
            });
        }
        if (item.remaining <= 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "商品库存不足"
            });
        }

        const [
            [user]
        ] = await connection.query(
            `SELECT * FROM users WHERE id = ? FOR UPDATE`, [user_id]
        );
        if (!user) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "用户不存在"
            });
        }
        if (user.points < item.cost) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "积分不足"
            });
        }

        // 执行扣除积分、减少库存、写入订单
        await connection.query(
            `UPDATE users SET points = points - ? WHERE id = ?`, [item.cost, user_id]
        );
        await connection.query(
            `UPDATE shop_items SET remaining = remaining - 1 WHERE id = ?`, [item_id]
        );
        await connection.query(
            `INSERT INTO shop_orders (user_id, item_id) VALUES (?, ?)`, [user_id, item_id]
        );

        // 特殊逻辑处理
        if (item.effect === "remove_ad") {
            await connection.query(
                `UPDATE users SET free_counts = free_counts + 1 WHERE id = ?`, [user_id]
            );
        } else if (item.effect === "vip") {
            const now = new Date();
            const currentExpire = user.vip_expire_time ? new Date(user.vip_expire_time) : now;
            const baseTime = currentExpire > now ? currentExpire : now;
            const addedDays = item.days || 7;
            const newExpire = new Date(baseTime.getTime() + addedDays * 24 * 60 * 60 * 1000);
            const formattedExpire = newExpire.toISOString().slice(0, 19).replace("T", " ");

            await connection.query(
                `UPDATE users SET vip_expire_time = ? WHERE id = ?`, [formattedExpire, user_id]
            );

            // 🛎️ 发一条通知
            await connection.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'shop', ?, ?)`,
                [
                    user_id,
                    '🎁 商品兑换成功',
                    `你成功兑换了【${item.name}】，请尽快查看兑换记录或等待处理。`
                ]
            );
        }

        await connection.commit();
        res.json({
            success: true,
            message: "兑换成功"
        });

    } catch (err) {
        await connection.rollback();
        console.error("❌ 积分兑换失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    } finally {
        connection.release(); // ✅ 无论成功或失败都要释放连接
    }
});

module.exports = router;