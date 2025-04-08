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
const privateKey = process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n');
const apiV3Key = process.env.WX_API_V3_KEY;
const SECRET = process.env.JWT_SECRET;

const PLANS = {
    1: {
        name: 'VIP 月卡',
        price: 9.9,
        days: 30
    },
    2: {
        name: 'VIP 季卡',
        price: 24.9,
        days: 90
    },
    3: {
        name: 'VIP 年卡',
        price: 89.9,
        days: 365
    },
    4: {
        name: 'VIP 终身卡',
        price: 168.8,
        days: 36500
    }
};

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
        const plan = PLANS[planId];
        if (!plan) return res.status(400).json({
            success: false,
            message: '无效套餐'
        });

        const out_trade_no = `VIP_${userId}_${Date.now()}`;
        const amount = Math.round(plan.price * 100);

        await db.query(
            `INSERT INTO vip_orders (user_id, plan, price, out_trade_no, status) VALUES (?, ?, ?, ?, 'pending')`,
            [userId, plan.name, plan.price, out_trade_no]
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
            ] = await db.query(`SELECT plan FROM vip_orders WHERE out_trade_no = ?`, [outTradeNo]);
            const days = order.plan.includes('年') ? 365 : order.plan.includes('季') ? 90 : 30;

            await db.query(
                `UPDATE users SET vip_expire_time = IF(vip_expire_time > NOW(), DATE_ADD(vip_expire_time, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY)) WHERE id = ?`,
                [days, days, userId]
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

module.exports = router;