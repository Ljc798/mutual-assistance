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
    const {
        openid,
        taskId,
        receiverId,
        description
    } = req.body;

    if (!openid || !taskId || !receiverId || !description) {
        return res.status(400).json({
            success: false,
            message: '参数不完整'
        });
    }

    try {
        // ✅ 1. 从 task_bids 获取真实报价
        const [
            [bid]
        ] = await db.query(
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

        // ✅ 2. 插入支付记录（预下单，pending）
        await db.query(
            `INSERT INTO task_payments (task_id, payer_openid, receiver_id, out_trade_no, amount, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
            [taskId, openid, receiverId, out_trade_no, amount]
        );

        // ✅ 3. 构造微信支付请求
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
        console.log('🧪 当前私钥前 5 行:\n', privateKey.split('\n').slice(0, 5).join('\n'));
        console.log('📏 私钥长度:', privateKey.length);
        console.log('🔑 私钥首字符 ASCII:', privateKey.charCodeAt(0)); // 应该是 45，即 "-"
        const signature = generateSignature(method, url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        const response = await axios.post(fullUrl, body, {
            headers: {
                Authorization: authorization,
                'Content-Type': 'application/json'
            }
        });

        const timeStamp = Math.floor(Date.now() / 1000).toString(); // 别用上面的那个 timestamp
        const payMessage = `${timeStamp}\n${nonceStr}\nprepay_id=${response.data.prepay_id}\n`;
        const paySign = crypto
            .createSign("RSA-SHA256")
            .update(payMessage)
            .sign(privateKey, "base64");

        res.json({
            success: true,
            paymentParams: {
                timeStamp,
                nonceStr,
                package: `prepay_id=${response.data.prepay_id}`,
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

router.post('/notify', express.raw({
    type: 'application/json'
}), async (req, res) => {
    try {
        const notifyData = JSON.parse(req.body.toString());
        const {
            resource
        } = notifyData;

        if (!resource || !apiV3Key) throw new Error('无资源或缺少 APIv3 密钥');

        const decryptedData = decryptResource(resource, apiV3Key);
        const outTradeNo = decryptedData.out_trade_no;
        const transactionId = decryptedData.transaction_id;
        const amount = decryptedData.amount.total;
        const payer = decryptedData.payer.openid;

        const [paymentRow] = await db.query(
            'SELECT * FROM task_payments WHERE out_trade_no = ? AND status = "pending"',
            [outTradeNo]
        );

        if (!paymentRow.length) {
            console.warn('❌ 没找到匹配订单');
            return res.status(400).json({
                code: 'FAIL',
                message: '订单不存在或已处理'
            });
        }

        const payment = paymentRow[0];

        await db.query('UPDATE tasks SET employee_id = ?, status = 1 WHERE id = ?', [payment.receiver_id, payment.task_id]);

        await db.query('UPDATE task_payments SET status = "paid", paid_at = NOW() WHERE id = ?', [payment.id]);

        console.log(`✅ 任务 ${payment.task_id} 已支付并指派给雇员 ${payment.receiver_id}`);

        res.status(200).json({
            code: 'SUCCESS',
            message: '处理完成'
        });
    } catch (err) {
        console.error('❌ 微信支付回调处理失败:', err);
        res.status(500).json({
            code: 'FAIL',
            message: '回调处理失败'
        });
    }
});

module.exports = router;