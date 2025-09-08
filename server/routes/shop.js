const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('./authMiddleware');

const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/shop/notify";
const fs = require('fs');
const path = process.env.WX_PRIVATE_KEY_PATH;
if (!path) throw new Error('WX_PRIVATE_KEY_PATH not set');
const privateKey = fs.readFileSync(path, 'utf8');
const apiV3Key = process.env.WX_API_V3_KEY;
const SECRET = process.env.JWT_SECRET;

function generateSignature(method, url, timestamp, nonceStr, body) {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

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

// 🧾 创建微信支付订单
router.post('/create-order', authMiddleware, async (req, res) => {
    try {
        const { item_id } = req.body;
        const userId = req.user.id;

        const [[item]] = await db.query(`SELECT * FROM shop_items WHERE id = ?`, [item_id]);
        if (!item) return res.status(404).json({ success: false, message: "商品不存在" });

        if (item.exchange_type !== 'money' && item.exchange_type !== 'both') {
            return res.status(400).json({ success: false, message: '该商品不支持支付购买' });
        }

        const [[user]] = await db.query(`SELECT openid FROM users WHERE id = ?`, [userId]);
        if (!user) return res.status(400).json({ success: false, message: '用户不存在' });

        const out_trade_no = `SHOP_${userId}_${item_id}_${Date.now()}`;
        const total_fee = Math.round(item.price * 100); // 单位：分

        await db.query(
            `INSERT INTO shop_orders (user_id, item_id, out_trade_no, status) VALUES (?, ?, ?, 'pending')`,
            [userId, item_id, out_trade_no]
        );

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const url = '/v3/pay/transactions/jsapi';
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const body = JSON.stringify({
            appid,
            mchid,
            description: `商城商品 - ${item.name}`,
            out_trade_no,
            notify_url,
            amount: {
                total: total_fee,
                currency: 'CNY'
            },
            payer: {
                openid: user.openid
            }
        });

        const signature = generateSignature("POST", url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        const response = await axios.post(fullUrl, body, {
            headers: {
                Authorization: authorization,
                'Content-Type': 'application/json'
            }
        });

        const prepay_id = response.data.prepay_id;
        const payNonceStr = crypto.randomBytes(16).toString("hex");
        const pkg = `prepay_id=${prepay_id}`;
        const payMessage = `${appid}\n${timestamp}\n${payNonceStr}\n${pkg}\n`;

        const paySign = crypto.createSign("RSA-SHA256").update(payMessage).sign(privateKey, "base64");

        res.json({
            success: true,
            paymentParams: {
                timeStamp: timestamp,
                nonceStr: payNonceStr,
                package: pkg,
                signType: "RSA",
                paySign
            }
        });

    } catch (err) {
        console.error("❌ 创建商城订单失败:", err);
        res.status(500).json({
            success: false,
            message: "创建支付订单失败"
        });
    }
});

router.post('/notify', express.raw({ type: '*/*' }), async (req, res) => {
    try {
        const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
        const notifyData = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
        const { resource } = notifyData;
        if (!resource || !apiV3Key) throw new Error("缺少 resource 或 apiV3Key");

        const decrypted = decryptResource(resource, apiV3Key);
        const outTradeNo = decrypted.out_trade_no;
        const transactionId = decrypted.transaction_id;

        const [[order]] = await db.query(`SELECT * FROM shop_orders WHERE out_trade_no = ?`, [outTradeNo]);
        if (!order) throw new Error("订单不存在");

        const userId = order.user_id;
        const [[item]] = await db.query(`SELECT * FROM shop_items WHERE id = ?`, [order.item_id]);
        if (!item) throw new Error("商品不存在");

        // ✅ 更新订单状态 + 减库存
        await db.query(
            `UPDATE shop_orders SET status = 'paid', paid_at = NOW(), transaction_id = ? WHERE out_trade_no = ?`,
            [transactionId, outTradeNo]
        );
        await db.query(`UPDATE shop_items SET remaining = remaining - 1 WHERE id = ?`, [item.id]);

        // ✅ 执行虚拟效果逻辑
        if (item.effect === "vip") {
            const [[user]] = await db.query(`SELECT vip_expire_time FROM users WHERE id = ?`, [userId]);
            const now = new Date();
            const base = user.vip_expire_time && new Date(user.vip_expire_time) > now
                ? new Date(user.vip_expire_time)
                : now;
            const newExpire = new Date(base.getTime() + (item.days || 7) * 86400 * 1000);
            const formatted = newExpire.toISOString().slice(0, 19).replace("T", " ");
            await db.query(`UPDATE users SET vip_expire_time = ? WHERE id = ?`, [formatted, userId]);
        } else if (item.effect === "remove_ad") {
            await db.query(`UPDATE users SET free_counts = free_counts + 1 WHERE id = ?`, [userId]);
        }

        // ✅ 推送通知
        await db.query(
            `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'shop', ?, ?)`,
            [
                userId,
                '🎉 商品兑换成功',
                `你已成功购买「${item.name}」，效果已生效，感谢支持！`
            ]
        );

        console.log("✅ 虚拟商品支付完成：", outTradeNo);
        res.status(200).json({ code: 'SUCCESS', message: 'OK' });
    } catch (err) {
        console.error("❌ 支付回调处理失败（虚拟商品）:", err);
        res.status(500).json({ code: 'FAIL', message: '处理失败' });
    }
});

function decryptResource(resource, key) {
    const { ciphertext, nonce, associated_data } = resource;
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(nonce));
    decipher.setAuthTag(Buffer.from(ciphertext, 'base64').slice(-16));
    decipher.setAAD(Buffer.from(associated_data));
    const data = Buffer.from(ciphertext, 'base64').slice(0, -16);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
}

module.exports = router;