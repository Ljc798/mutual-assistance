// routes/taskPayment.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const axios = require("axios");
const db = require("../config/db");
const authMiddleware = require("./authMiddleware");

const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/task/payment-notify";
const privateKey = process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n');
const apiV3Key = process.env.WX_API_V3_KEY;

function generateSignature(method, url, timestamp, nonceStr, body) {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, "base64");
}

router.post("/prepay", authMiddleware, async (req, res) => {
    try {
        const { task_id } = req.body;
        const userId = req.user.id;

        const [[task]] = await db.query("SELECT * FROM tasks WHERE id = ?", [task_id]);
        if (!task) return res.status(404).json({ success: false, message: "任务不存在" });

        const commission = Math.floor(task.offer * 100 * 0.02); // 单位分
        const out_trade_no = `TASKFEE_${task_id}_${Date.now()}`;

        await db.query(
            `INSERT INTO task_payments (task_id, payer_id, amount, out_trade_no, status) VALUES (?, ?, ?, ?, 'pending')`,
            [task_id, userId, commission, out_trade_no]
        );

        const [[user]] = await db.query("SELECT openid FROM users WHERE id = ?", [userId]);

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString("hex");
        const url = "/v3/pay/transactions/jsapi";
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const body = JSON.stringify({
            appid,
            mchid,
            description: "任务佣金支付",
            out_trade_no,
            notify_url,
            amount: { total: commission, currency: "CNY" },
            payer: { openid: user.openid }
        });

        const signature = generateSignature("POST", url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid=\"${mchid}\",serial_no=\"${serial_no}\",nonce_str=\"${nonceStr}\",timestamp=\"${timestamp}\",signature=\"${signature}\"`;

        const response = await axios.post(fullUrl, body, {
            headers: {
                Authorization: authorization,
                "Content-Type": "application/json"
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
        console.error("❌ 创建任务支付订单失败:", err);
        res.status(500).json({ success: false, message: "服务异常" });
    }
});

router.post("/payment-notify", express.raw({ type: '*/*' }), async (req, res) => {
    try {
        const rawBody = req.body.toString("utf8");
        const notifyData = JSON.parse(rawBody);
        const { resource } = notifyData;

        const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key), Buffer.from(resource.nonce));
        decipher.setAuthTag(Buffer.from(resource.ciphertext, "base64").slice(-16));
        decipher.setAAD(Buffer.from(resource.associated_data));
        const encrypted = Buffer.from(resource.ciphertext, "base64").slice(0, -16);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const data = JSON.parse(decrypted.toString("utf8"));

        const out_trade_no = data.out_trade_no;
        const transaction_id = data.transaction_id;

        await db.query(
            `UPDATE task_payments SET status = 'paid', transaction_id = ?, paid_at = NOW() WHERE out_trade_no = ?`,
            [transaction_id, out_trade_no]
        );

        const match = out_trade_no.match(/^TASKFEE_(\d+)_/);
        if (match) {
            const taskId = parseInt(match[1]);
            await db.query(`UPDATE tasks SET has_paid = 1 WHERE id = ?`, [taskId]);

            const [[task]] = await db.query("SELECT title, employer_id FROM tasks WHERE id = ?", [taskId]);

            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', '💰 支付成功', '你已成功支付任务《${task.title}》，等待接单人完成任务～')`,
                [task.employer_id]
            );
        }

        console.log("✅ 任务佣金支付成功");
        res.status(200).json({ code: "SUCCESS", message: "OK" });
    } catch (err) {
        console.error("❌ 任务佣金支付回调失败:", err);
        res.status(500).json({ code: "FAIL", message: "处理失败" });
    }
});

module.exports = router;