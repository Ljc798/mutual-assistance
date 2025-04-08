const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db');

const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/vip/notify";
const privateKey = process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n');
const apiV3Key = process.env.WX_API_V3_KEY;

function generateSignature(method, url, timestamp, nonceStr, body) {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

router.post('/create-order', async (req, res) => {
    const {
        price,
        plan
    } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !price || !plan) {
        return res.status(400).json({
            success: false,
            message: '参数缺失'
        });
    }

    // 👤 模拟解析 token 得到 user_id（你可以换成你的中间件）
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const out_trade_no = `VIP_${userId}_${Date.now()}`;
    const amount = parseInt(price * 100);

    await db.query(
        `INSERT INTO vip_orders (user_id, plan, price, out_trade_no) VALUES (?, ?, ?, ?)`,
        [userId, plan, price, out_trade_no]
    );

    const url = '/v3/pay/transactions/jsapi';
    const fullUrl = `https://api.mch.weixin.qq.com${url}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');

    const [
        [user]
    ] = await db.query(`SELECT openid FROM users WHERE id = ?`, [userId]);

    const body = JSON.stringify({
        appid,
        mchid,
        description: `VIP充值 - ${plan}`,
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

    const paySign = crypto
        .createSign("RSA-SHA256")
        .update(payMessage)
        .sign(privateKey, "base64");

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

        // 标记订单为已支付
        await db.query(
            `UPDATE vip_orders SET status = 'paid', paid_at = NOW(), transaction_id = ? WHERE out_trade_no = ?`,
            [transactionId, outTradeNo]
        );

        // 给用户设置 VIP 到期时间
        const match = outTradeNo.match(/^VIP_(\d+)_/);
        if (match) {
            const userId = parseInt(match[1]);
            const [
                [order]
            ] = await db.query(`SELECT plan FROM vip_orders WHERE out_trade_no = ?`, [outTradeNo]);

            const days = order.plan.includes('年') ? 365 :
                order.plan.includes('季') ? 90 : 30;

            await db.query(`
          UPDATE users 
          SET vip_expire_time = IF(
            vip_expire_time > NOW(), 
            DATE_ADD(vip_expire_time, INTERVAL ? DAY),
            DATE_ADD(NOW(), INTERVAL ? DAY)
          ) 
          WHERE id = ?
        `, [days, days, userId]);
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