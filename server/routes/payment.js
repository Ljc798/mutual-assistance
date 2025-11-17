const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db'); // ⬅️ 确保你有引入数据库配置
const {
    sendToUser
} = require("./ws-helper");
const {
    sendTaskAssignedToEmployee,
    sendOrderStatusNotify
} = require('../utils/wechat');
const authMiddleware = require('./authMiddleware');

// ==== 微信支付配置 ====
const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/payment/notify";
const fs = require('fs');
const path = process.env.WX_PRIVATE_KEY_PATH;
if (!path) throw new Error('WX_PRIVATE_KEY_PATH not set');
const privateKey = fs.readFileSync(path, 'utf8');
const apiV3Key = process.env.WX_API_V3_KEY;

function generateSignature(method, url, timestamp, nonceStr, body) {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

router.post('/create', authMiddleware, async (req, res) => {
    const {
        bid_id,
        description
    } = req.body;
    const userId = req.user.id;

    if (!userId || !bid_id || !description) {
        return res.status(400).json({
            success: false,
            message: '参数不完整'
        });
    }

    try {
        // 1. 获取报价
        const [
            [bid]
        ] = await db.query(
            'SELECT task_id, user_id AS receiver_id, price FROM task_bids WHERE id = ?',
            [bid_id]
        );

        if (!bid) {
            return res.status(404).json({
                success: false,
                message: '找不到该投标记录'
            });
        }

        const {
            task_id,
            receiver_id,
            price
        } = bid;
        const amount = Math.round(price * 100); // 单位：分
        const out_trade_no = `TASK_${task_id}_EMP_${receiver_id}_${Date.now()}`;

        await db.query(
            `INSERT INTO task_payments (task_id, bid_id, payer_user_id, receiver_id, out_trade_no, amount, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [task_id, bid_id, userId, receiver_id, out_trade_no, amount]
        );

        // 3. 构造微信支付请求
        const url = '/v3/pay/transactions/jsapi';
        const method = 'POST';
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');

        const [[user]] = await db.query('SELECT openid FROM users WHERE id = ?', [userId]);

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
                openid: user.openid
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
                nonceStr, // 统一用一个 nonceStr
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
        const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
        const notifyData = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;

        const {
            resource
        } = notifyData;
        if (!resource || !apiV3Key) throw new Error('缺少 resource 或 apiV3Key');

        const decryptedData = decryptResource(resource, apiV3Key);
        const outTradeNo = decryptedData.out_trade_no;
        const transactionId = decryptedData.transaction_id;
        const amount = parseFloat(decryptedData.amount.total) / 100;

        const [
            [payment]
        ] = await db.query(
            `SELECT task_id, bid_id, receiver_id FROM task_payments WHERE out_trade_no = ?`,
            [outTradeNo]
        );
        const {
            task_id: taskId,
            bid_id: bidId,
            receiver_id: employeeId
        } = payment;


        // ✅ 更新支付表
        await db.query(
            `UPDATE task_payments SET status = 'paid', paid_at = NOW(), transaction_id = ? WHERE out_trade_no = ?`,
            [transactionId, outTradeNo]
        );

        // ✅ 匹配任务和雇员
        const match = outTradeNo.match(/^TASK_(\d+)_EMP_(\d+)_/);
        if (match) {
            const taskId = parseInt(match[1]);
            const employeeId = parseInt(match[2]);

            // ✅ 更新任务表：委派
            await db.query(
                `UPDATE tasks 
                 SET employee_id = ?, selected_bid_id = ?, status = 1, has_paid = 1, pay_amount = ?, payment_transaction_id = ? 
                 WHERE id = ?`,
                [employeeId, bidId, amount, transactionId, taskId]
            );


            const [
                [task]
            ] = await db.query(
                `SELECT title, employer_id, position, address FROM tasks WHERE id = ?`,
                [taskId]
            );

            // ========== 通知雇员 ==========
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [
                    employeeId,
                    '🎉 任务委派成功',
                    `任务《${task.title}》已经指派给你，快去完成吧！`
                ]
            );
            sendToUser(employeeId, {
                type: 'notify',
                content: `🎉 你的投标被采纳！任务《${task.title}》已委派给你～`,
                created_time: new Date().toISOString()
            });

            // 发微信订阅消息给雇员（派单通知）
            const [
                [emplUser]
            ] = await db.query(`SELECT openid FROM users WHERE id = ?`, [employeeId]);
            if (emplUser?.openid) {
                await sendTaskAssignedToEmployee({
                    openid: emplUser.openid,
                    serviceType: task.title,
                    pickupAddr: task.position,
                    deliveryAddr: task.address,
                    fee: amount,
                    assignTime: new Date()
                });
            }

            // ========== 通知雇主 ==========
            if (task.employer_id) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                    [
                        task.employer_id,
                        '💰 支付成功',
                        `你已成功支付任务《${task.title}》，订单已委派给接单人～`
                    ]
                );
                sendToUser(task.employer_id, {
                    type: 'notify',
                    content: `💰 你已成功支付任务《${task.title}》，等待接单人完成任务～`,
                    created_time: new Date().toISOString()
                });

                // 发微信订阅消息给雇主（支付成功通知）
                const [
                    [empUser]
                ] = await db.query(
                    `SELECT openid FROM users WHERE id = ?`,
                    [task.employer_id]
                );

                if (empUser?.openid) {
                    await sendOrderStatusNotify({
                        openid: empUser.openid, // 雇主 openid
                        orderNo: taskId, // 订单号
                        title: task.title, // 任务标题
                        status: `进行中`, // 状态文字
                        time: new Date().toISOString().slice(0, 16).replace('T', ' '), // 2025-09-11 15:33
                        taskId: taskId // 跳转任务详情
                    });
                }
            }
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