const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db'); // ⬅️ 确保你有引入数据库配置

// ==== 微信支付配置 ====
const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/payment/notify";
const privateKey = process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n');
const apiV3Key = process.env.WX_API_V3_KEY;

function generateSignature(method, url, timestamp, nonceStr, body) {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

router.post('/create', async (req, res) => {
    const { openid, taskId, receiverId, description } = req.body;

    if (!openid || !taskId || !receiverId || !description) {
        return res.status(400).json({
            success: false,
            message: '参数不完整'
        });
    }

    try {
        // 1. 获取报价
        const [[bid]] = await db.query(
            'SELECT price FROM task_bids WHERE task_id = ? AND user_id = ?',
            [taskId, receiverId]
        );

        if (!bid) {
            return res.status(404).json({
                success: false,
                message: '未找到该接单人的出价记录'
            });
        }

        const amount = parseInt(bid.price * 100); // 单位：分
        const out_trade_no = `TASK_${taskId}_EMP_${receiverId}_${Date.now()}`;

        // 2. 插入支付记录
        await db.query(
            `INSERT INTO task_payments (task_id, payer_openid, receiver_id, out_trade_no, amount, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
            [taskId, openid, receiverId, out_trade_no, amount]
        );

        // 3. 构造微信支付请求
        const url = '/v3/pay/transactions/jsapi';
        const method = 'POST';
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');

        const body = JSON.stringify({
            appid,
            mchid,
            description,
            out_trade_no,
            notify_url,
            amount: {
                total: amount,
                currency: 'CNY'
            },
            payer: {
                openid
            }
        });

        const signature = generateSignature(method, url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        const response = await axios.post(fullUrl, body, {
            headers: {
                Authorization: authorization,
                'Content-Type': 'application/json'
            }
        });

        // 4. 构造小程序支付参数
        const pkg = `prepay_id=${response.data.prepay_id}`;
        const payMessage = `${appid}\n${timestamp}\n${nonceStr}\n${pkg}\n`;

        const paySign = crypto
            .createSign("RSA-SHA256")
            .update(payMessage)
            .sign(privateKey, "base64");

        res.json({
            success: true,
            paymentParams: {
                timeStamp: timestamp, // 这里用统一的变量
                nonceStr,             // 统一用一个 nonceStr
                package: pkg,
                signType: "RSA",
                paySign
            }
        });

    } catch (err) {
        console.error('❌ 微信支付失败:', err.response?.data || err.message);
        res.status(500).json({
            success: false,
            message: '微信支付请求失败'
        });
    }
});

function decryptResource(resource, key) {
    const {
        ciphertext,
        nonce,
        associated_data
    } = resource;
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key),
        Buffer.from(nonce)
    );
    decipher.setAuthTag(Buffer.from(ciphertext, 'base64').slice(-16));
    decipher.setAAD(Buffer.from(associated_data));
    const data = Buffer.from(ciphertext, 'base64').slice(0, -16);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
}

// ✅ 支付成功回调
router.post('/notify', express.raw({
    type: '*/*'
}), async (req, res) => {
    try {
        const rawBody = req.body;

        // 🧪 Buffer 判断：确保只有在是 Buffer 时才转字符串
        const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
        const notifyData = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;

        const {
            resource
        } = notifyData;

        if (!resource || !apiV3Key) {
            throw new Error('缺少 resource 或 apiV3Key');
        }

        // ✅ 解密、更新数据库、响应微信
        const decryptedData = decryptResource(resource, apiV3Key);
        const outTradeNo = decryptedData.out_trade_no;
        const transactionId = decryptedData.transaction_id;
        const amount = parseFloat(decryptedData.amount.total) / 100; // 💰 元，保留精度

        await db.query(
            `UPDATE task_payments SET status = 'paid', paid_at = NOW(), transaction_id = ? WHERE out_trade_no = ?`,
            [transactionId, outTradeNo]
        );

        const match = outTradeNo.match(/^TASK_(\d+)_EMP_(\d+)_/);
        if (match) {
            const taskId = parseInt(match[1]);
            const employeeId = parseInt(match[2]);

            await db.query(
                `UPDATE tasks SET employee_id = ?, status = 1, has_paid = 1, pay_amount = ?, payment_transaction_id = ? WHERE id = ?`,
                [employeeId, amount, transactionId, taskId]
            );

            const [
                [task]
            ] = await db.query(
                `SELECT title FROM tasks WHERE id = ?`,
                [taskId]
            );

            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [
                    employeeId,
                    '🎉 你的投标被采纳啦',
                    `任务《${task.title}》已经指派给你，记得去查看！`
                ]
            );
        }

        res.status(200).json({
            code: 'SUCCESS',
            message: 'OK'
        });

    } catch (err) {
        console.error('❌ 微信支付回调处理失败:', err);
        res.status(500).json({
            code: 'FAIL',
            message: '处理失败'
        });
    }
});

module.exports = router;