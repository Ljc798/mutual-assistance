const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/vip/notify";
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

router.post('/create-order', async (req, res) => {
    try {
        const {
            planId
        } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token || !planId) return res.status(400).json({
            success: false,
            message: '参数缺失'
        });

        const decoded = jwt.verify(token, SECRET);
        const userId = decoded.id;
        const [
            [plan]
        ] = await db.query(`SELECT * FROM vip_plans WHERE id = ? AND is_active = 1`, [planId]);
        if (!plan) {
            return res.status(400).json({
                success: false,
                message: '无效套餐'
            });
        }

        const usedPrice = plan.promo_price !== null ? parseFloat(plan.promo_price) : parseFloat(plan.original_price);
        const amount = Math.round(usedPrice * 100); // 单位分
        if (!plan) return res.status(400).json({
            success: false,
            message: '无效套餐'
        });

        const out_trade_no = `VIP_${userId}_${Date.now()}`;

        await db.query(
            `INSERT INTO vip_orders (user_id, plan, price, out_trade_no, status) VALUES (?, ?, ?, ?, 'pending')`,
            [userId, plan.name, usedPrice, out_trade_no]
        );

        const [
            [user]
        ] = await db.query(`SELECT openid FROM users WHERE id = ?`, [userId]);

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const url = '/v3/pay/transactions/jsapi';
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const body = JSON.stringify({
            appid,
            mchid,
            description: `VIP充值 - ${plan.name}`,
            out_trade_no,
            notify_url,
            amount: {
                total: amount,
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
        console.error('❌ 创建VIP支付失败:', err);
        res.status(500).json({
            success: false,
            message: '创建支付失败'
        });
    }
});

router.post('/notify', express.raw({
    type: '*/*'
}), async (req, res) => {
    try {
        const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
        const notifyData = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
        const {
            resource
        } = notifyData;
        if (!resource || !apiV3Key) throw new Error("缺少 resource 或 apiV3Key");

        const decryptedData = decryptResource(resource, apiV3Key);
        const outTradeNo = decryptedData.out_trade_no;
        const transactionId = decryptedData.transaction_id;

        await db.query(
            `UPDATE vip_orders SET status = 'paid', paid_at = NOW(), transaction_id = ? WHERE out_trade_no = ?`,
            [transactionId, outTradeNo]
        );

        const match = outTradeNo.match(/^VIP_(\d+)_/);
        if (match) {
            const userId = parseInt(match[1]);
            const [
                [order]
            ] = await db.query(`SELECT plan, user_id, price, days FROM vip_orders o JOIN vip_plans p ON o.plan = p.name WHERE o.out_trade_no = ?`, [outTradeNo]);
            const days = order.days;

            await db.query(
                `UPDATE users SET vip_expire_time = IF(vip_expire_time > NOW(), DATE_ADD(vip_expire_time, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY)) WHERE id = ?`,
                [days, days, userId]
            );

            // 🛎️ 发一条 VIP 购买成功通知
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'vip', ?, ?)`,
                [
                    userId,
                    '🎫 会员开通成功',
                    `你已成功开通 ${order.plan}，享受尊贵特权吧！`
                ]
            );
        }

        console.log("✅ VIP支付成功并更新会员信息");
        res.status(200).json({
            code: 'SUCCESS',
            message: 'OK'
        });
    } catch (err) {
        console.error("❌ VIP支付回调失败:", err);
        res.status(500).json({
            code: 'FAIL',
            message: '处理失败'
        });
    }
});

function decryptResource(resource, key) {
    const {
        ciphertext,
        nonce,
        associated_data
    } = resource;
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(nonce));
    decipher.setAuthTag(Buffer.from(ciphertext, 'base64').slice(-16));
    decipher.setAAD(Buffer.from(associated_data));
    const data = Buffer.from(ciphertext, 'base64').slice(0, -16);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
}

// ✅ 返回所有VIP套餐（含促销价）
router.get('/plans', async (req, res) => {
    try {
        const [plans] = await db.query(
            `SELECT id, name, original_price AS price, promo_price, days FROM vip_plans WHERE is_active = 1`
        );

        const formattedPlans = plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            price: parseFloat(plan.price), // 原价
            promo_price: plan.promo_price !== null ? parseFloat(plan.promo_price) : null,
            days: plan.days
        }));

        res.json({
            success: true,
            plans: formattedPlans
        });
    } catch (err) {
        console.error("❌ 获取VIP套餐失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

module.exports = router;