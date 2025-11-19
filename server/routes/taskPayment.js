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
const notify_url = "https://mutualcampus.top/api/taskPayment/payment-notify";
const fs = require('fs');
const path = process.env.WX_PRIVATE_KEY_PATH;
if (!path) throw new Error('WX_PRIVATE_KEY_PATH not set');
const privateKey = fs.readFileSync(path, 'utf8');
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
        const {
            task_id
        } = req.body;
        const userId = req.user.id;

        const [
            [task]
        ] = await db.query("SELECT * FROM tasks WHERE id = ?", [task_id]);
        if (!task) return res.status(404).json({
            success: false,
            message: "任务不存在"
        });
        console.log(privateKey.slice(0, 100));
        const commission = Math.max(Math.floor(task.offer * 100 * 0.02), 1);
        const [[uinfo]] = await db.query(`SELECT vip_level FROM users WHERE id = ?`, [userId]);
        const level = Number(uinfo?.vip_level || 0);
        const rate = level === 2 ? 0.92 : (level === 1 ? 0.97 : 1.0);
        const plannedDiscount = commission - Math.floor(commission * rate);
        const d = new Date();
        const monthStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const [[limitRow]] = await db.query(`SELECT monthly_limit_cents, used_cents FROM user_discount_limits WHERE user_id = ? AND month = ?`, [userId, monthStr]);
        let discountApplied = plannedDiscount;
        if (limitRow && Number(limitRow.monthly_limit_cents) > 0) {
            const remaining = Math.max(0, Number(limitRow.monthly_limit_cents) - Number(limitRow.used_cents));
            discountApplied = Math.max(0, Math.min(plannedDiscount, remaining));
        }
        const commissionAfter = Math.max(commission - discountApplied, 1);
        const out_trade_no = `TASKFEE_${task_id}_${String(Date.now()).slice(-8)}`;

        const [
            [user]
        ] = await db.query("SELECT openid FROM users WHERE id = ?", [userId]);

        await db.query(
            `INSERT INTO task_payments (task_id, payer_user_id, receiver_id, amount, out_trade_no, status) 
  VALUES (?, ?, ?, ?, ?, 'pending')`,
            [task_id, userId, null, commissionAfter, out_trade_no]
        );

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString("hex");
        const url = "/v3/pay/transactions/jsapi";
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const body = JSON.stringify({
            appid,
            mchid,
            description: "任务佣金",
            out_trade_no,
            notify_url,
            amount: {
                total: commissionAfter,
                currency: "CNY"
            },
            payer: {
                openid: user.openid
            }
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
        res.status(500).json({
            success: false,
            message: "服务异常"
        });
    }
});

router.post("/prepay-fixed", authMiddleware, async (req, res) => {
    try {
        const { task_id, include_commission } = req.body;
        const userId = req.user.id;

        const [[task]] = await db.query("SELECT * FROM tasks WHERE id = ?", [task_id]);
        if (!task) return res.status(404).json({ success: false, message: "任务不存在" });

        const offerFen = Math.floor(parseFloat(task.offer) * 100);
        const commissionFen = include_commission ? Math.max(Math.floor(parseFloat(task.offer) * 100 * 0.02), 1) : 0;
        const baseTotal = offerFen + commissionFen;
        const [[uinfo]] = await db.query(`SELECT vip_level FROM users WHERE id = ?`, [userId]);
        const level = Number(uinfo?.vip_level || 0);
        const rate = level === 2 ? 0.92 : (level === 1 ? 0.97 : 1.0);
        const plannedDiscount = baseTotal - Math.floor(baseTotal * rate);
        const d = new Date();
        const monthStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const [[limitRow]] = await db.query(`SELECT monthly_limit_cents, used_cents FROM user_discount_limits WHERE user_id = ? AND month = ?`, [userId, monthStr]);
        let discountApplied = plannedDiscount;
        if (limitRow && Number(limitRow.monthly_limit_cents) > 0) {
            const remaining = Math.max(0, Number(limitRow.monthly_limit_cents) - Number(limitRow.used_cents));
            discountApplied = Math.max(0, Math.min(plannedDiscount, remaining));
        }
        let totalFen = baseTotal - discountApplied;
        if (totalFen < 1) totalFen = 1;
        const out_trade_no = `TASK_${task_id}_FIXED_${String(Date.now()).slice(-8)}`;

        const [[user]] = await db.query("SELECT openid FROM users WHERE id = ?", [userId]);

        await db.query(
            `INSERT INTO task_payments (task_id, payer_user_id, receiver_id, amount, out_trade_no, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [task_id, userId, null, totalFen, out_trade_no]
        );

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString("hex");
        const url = "/v3/pay/transactions/jsapi";
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const desc = commissionFen > 0
            ? `佣金${(commissionFen/100).toFixed(2)}+报酬${(offerFen/100).toFixed(2)}（会员折扣）共${(totalFen/100).toFixed(2)}元`
            : `报酬${(offerFen/100).toFixed(2)}（会员折扣）`;

        const body = JSON.stringify({
            appid,
            mchid,
            description: desc,
            out_trade_no,
            notify_url,
            amount: { total: totalFen, currency: "CNY" },
            payer: { openid: user.openid }
        });

        const signature = generateSignature("POST", url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        const response = await axios.post(fullUrl, body, { headers: { Authorization: authorization, "Content-Type": "application/json" } });

        const prepay_id = response.data.prepay_id;
        const payNonceStr = crypto.randomBytes(16).toString("hex");
        const pkg = `prepay_id=${prepay_id}`;
        const payMessage = `${appid}\n${timestamp}\n${payNonceStr}\n${pkg}\n`;
        const paySign = crypto.createSign("RSA-SHA256").update(payMessage).sign(privateKey, "base64");

        res.json({
            success: true,
            paymentParams: { timeStamp: timestamp, nonceStr: payNonceStr, package: pkg, signType: "RSA", paySign }
        });
    } catch (err) {
        console.error("❌ 固定价预下单失败:", err);
        res.status(500).json({ success: false, message: "服务异常" });
    }
});

router.post("/prepay-second-hand-fixed", authMiddleware, async (req, res) => {
    try {
        const { task_id } = req.body;
        const userId = req.user.id;

        const [[task]] = await db.query("SELECT * FROM tasks WHERE id = ?", [task_id]);
        if (!task) return res.status(404).json({ success: false, message: "任务不存在" });

        const offerFen = Math.floor(parseFloat(task.offer) * 100);
        const totalFen = offerFen;
        const out_trade_no = `TASK_${task_id}_SECOND_${String(Date.now()).slice(-8)}`;

        await db.query(
            `INSERT INTO task_payments (task_id, payer_user_id, receiver_id, amount, out_trade_no, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [task_id, userId, null, totalFen, out_trade_no]
        );

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString("hex");
        const url = "/v3/pay/transactions/jsapi";
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const [[user]] = await db.query("SELECT openid FROM users WHERE id = ?", [userId]);

        const body = JSON.stringify({
            appid,
            mchid,
            description: `二手购买-报酬${(offerFen/100).toFixed(2)}元`,
            out_trade_no,
            notify_url,
            amount: { total: totalFen, currency: "CNY" },
            payer: { openid: user.openid }
        });

        const signature = generateSignature("POST", url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        const response = await axios.post(fullUrl, body, { headers: { Authorization: authorization, "Content-Type": "application/json" } });
        const prepay_id = response.data.prepay_id;
        const payNonceStr = crypto.randomBytes(16).toString("hex");
        const pkg = `prepay_id=${prepay_id}`;
        const payMessage = `${appid}\n${timestamp}\n${payNonceStr}\n${pkg}\n`;
        const paySign = crypto.createSign("RSA-SHA256").update(payMessage).sign(privateKey, "base64");

        res.json({ success: true, paymentParams: { timeStamp: timestamp, nonceStr: payNonceStr, package: pkg, signType: "RSA", paySign } });
    } catch (err) {
        console.error("❌ 二手固定价预下单失败:", err);
        res.status(500).json({ success: false, message: "服务异常" });
    }
});

router.post("/prepay-second-hand-complete", authMiddleware, async (req, res) => {
    try {
        const { task_id } = req.body;
        const userId = req.user.id;

        const [[task]] = await db.query("SELECT pay_amount, title FROM tasks WHERE id = ?", [task_id]);
        if (!task) return res.status(404).json({ success: false, message: "任务不存在" });

        const amountFen = Math.floor(parseFloat(task.pay_amount) * 100);
        const out_trade_no = `TASK_${task_id}_SECOND_DONE_${String(Date.now()).slice(-8)}`;

        await db.query(
            `INSERT INTO task_payments (task_id, payer_user_id, receiver_id, amount, out_trade_no, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [task_id, userId, null, amountFen, out_trade_no]
        );

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString("hex");
        const url = "/v3/pay/transactions/jsapi";
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const [[user]] = await db.query("SELECT openid FROM users WHERE id = ?", [userId]);

        const body = JSON.stringify({
            appid,
            mchid,
            description: `二手订单完成支付-¥${(amountFen/100).toFixed(2)}`,
            out_trade_no,
            notify_url,
            amount: { total: amountFen, currency: "CNY" },
            payer: { openid: user.openid }
        });

        const signature = generateSignature("POST", url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        const response = await axios.post(fullUrl, body, { headers: { Authorization: authorization, "Content-Type": "application/json" } });
        const prepay_id = response.data.prepay_id;
        const payNonceStr = crypto.randomBytes(16).toString("hex");
        const pkg = `prepay_id=${prepay_id}`;
        const payMessage = `${appid}\n${timestamp}\n${payNonceStr}\n${pkg}\n`;
        const paySign = crypto.createSign("RSA-SHA256").update(payMessage).sign(privateKey, "base64");

        res.json({ success: true, paymentParams: { timeStamp: timestamp, nonceStr: payNonceStr, package: pkg, signType: "RSA", paySign } });
    } catch (err) {
        console.error("❌ 二手完成支付预下单失败:", err);
        res.status(500).json({ success: false, message: "服务异常" });
    }
});

router.post("/payment-notify", express.raw({
    type: '*/*'
}), async (req, res) => {
    try {
        // ✅ 保证兼容 req.body 是 Buffer 或 Object
        const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
        const notifyData = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;

        const {
            resource
        } = notifyData;
        if (!resource || !apiV3Key) throw new Error("缺少 resource 或 apiV3Key");

        // ✅ 解密 resource 加密数据
        const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key), Buffer.from(resource.nonce));
        decipher.setAuthTag(Buffer.from(resource.ciphertext, "base64").slice(-16));
        decipher.setAAD(Buffer.from(resource.associated_data));
        const encrypted = Buffer.from(resource.ciphertext, "base64").slice(0, -16);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const data = JSON.parse(decrypted.toString("utf8"));

        const outTradeNo = data.out_trade_no;
        const transactionId = data.transaction_id;

        // ✅ 更新 task_payments 状态为 paid
        const [updatePay] = await db.query(
            `UPDATE task_payments SET status = 'paid', transaction_id = ?, paid_at = NOW() WHERE out_trade_no = ?`,
            [transactionId, outTradeNo]
        );
        if (updatePay.affectedRows === 0) throw new Error(`未更新 task_payments：${outTradeNo}`);

        let taskId;
        if (/^TASKFEE_\d+_/.test(outTradeNo)) {
            const match = outTradeNo.match(/^TASKFEE_(\d+)_/);
            taskId = parseInt(match[1]);
            await db.query(`UPDATE tasks SET status = 0 WHERE id = ?`, [taskId]);
            const [[task]] = await db.query(`SELECT title, employer_id, offer FROM tasks WHERE id = ?`, [taskId]);
            if (task && task.employer_id) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                    [task.employer_id, '📢 任务发布成功', `你发布的任务《${task.title}》已成功上线，等待接单人～`]
                );
            }
            const [[payRow]] = await db.query(`SELECT amount, payer_user_id FROM task_payments WHERE out_trade_no = ?`, [outTradeNo]);
            const finalFen = Number(payRow?.amount || 0);
            const payerId = payRow?.payer_user_id;
            const commissionFen = Math.max(Math.floor(parseFloat(task.offer) * 100 * 0.02), 1);
            const discountFen = Math.max(0, commissionFen - finalFen);
            if (discountFen > 0 && payerId) {
                const [[payer]] = await db.query('SELECT vip_level FROM users WHERE id = ?', [payerId]);
                const sourceLevel = Number(payer?.vip_level || 0);
                await db.query(
                    `INSERT INTO user_benefit_ledger (user_id, task_id, type, amount_cents, source_vip_level, note) VALUES (?, ?, 'publish_discount', ?, ?, ?)`,
                    [payerId, taskId, discountFen, sourceLevel, `发布支付折扣，订单号 ${outTradeNo}`]
                );
                const d = new Date();
                const monthStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                await db.query(
                    `INSERT INTO user_discount_limits (user_id, month, monthly_limit_cents, used_cents) VALUES (?, ?, 0, ?) 
                     ON DUPLICATE KEY UPDATE used_cents = used_cents + VALUES(used_cents), updated_at = NOW()`,
                    [payerId, monthStr, discountFen]
                );
            }
        } else if (/^TASK_\d+_FIXED_/.test(outTradeNo)) {
            const match = outTradeNo.match(/^TASK_(\d+)_FIXED_/);
            taskId = parseInt(match[1]);
            const [[task]] = await db.query(`SELECT title, employer_id, offer FROM tasks WHERE id = ?`, [taskId]);
            if (!task) throw new Error(`找不到任务记录 task_id: ${taskId}`);
            const [[payRow]] = await db.query(`SELECT amount, payer_user_id FROM task_payments WHERE out_trade_no = ?`, [outTradeNo]);
            const finalFen = Number(payRow?.amount || 0);
            const payerId = payRow?.payer_user_id;
            const offerFen = Math.floor(parseFloat(task.offer) * 100);
            const commissionFen = Math.max(Math.floor(parseFloat(task.offer) * 100 * 0.02), 1);
            const baseTotal = finalFen <= offerFen ? offerFen : (offerFen + commissionFen);
            const discountFen = Math.max(0, baseTotal - finalFen);
            await db.query(
                `UPDATE tasks SET has_paid = 1, status = 0, pay_amount = ?, discount_amount_cents = ?, final_paid_amount_cents = ?, is_discount_applied = ? WHERE id = ?`,
                [parseFloat(task.offer), discountFen, finalFen, discountFen > 0 ? 1 : 0, taskId]
            );
            if (discountFen > 0 && payerId) {
                await db.query(
                    `INSERT INTO user_benefit_ledger (user_id, task_id, type, amount_cents, source_vip_level, note) VALUES (?, ?, 'publish_discount', ?, (SELECT vip_level FROM users WHERE id = ?), ?)`,
                    [payerId, taskId, discountFen, payerId, `发布折扣，订单号 ${outTradeNo}`]
                );
                const d = new Date();
                const monthStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                await db.query(
                    `INSERT INTO user_discount_limits (user_id, month, monthly_limit_cents, used_cents) VALUES (?, ?, 0, ?) 
                     ON DUPLICATE KEY UPDATE used_cents = used_cents + VALUES(used_cents), updated_at = NOW()`,
                    [payerId, monthStr, discountFen]
                );
            }
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [task.employer_id, '💰 支付成功', `你已成功支付任务《${task.title}》，折后金额¥${(finalFen/100).toFixed(2)}，等待接单人完成任务～`]
            );
        } else if (/^TASK_\d+_SECOND_\d+$/.test(outTradeNo)) {
            const match = outTradeNo.match(/^TASK_(\d+)_SECOND_/);
            taskId = parseInt(match[1]);
            const [[task]] = await db.query(`SELECT title, employer_id, offer FROM tasks WHERE id = ?`, [taskId]);
            const [[pay]] = await db.query(`SELECT payer_user_id FROM task_payments WHERE out_trade_no = ?`, [outTradeNo]);
            const buyerId = pay?.payer_user_id;
            if (!task || !buyerId) throw new Error(`二手购买缺少记录 task_id: ${taskId}`);
            await db.query(
                `UPDATE tasks SET employee_id = ?, has_paid = 1, status = 1, pay_amount = ? WHERE id = ?`,
                [buyerId, parseFloat(task.offer), taskId]
            );
            // 二手购买：资金暂不直接入账，留到完成时；如需即时入账可打开下一行
            // await db.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [parseFloat(task.offer), task.employer_id]);
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?), (?, 'task', ?, ?)`,
                [
                    buyerId, '💰 购买成功', `你已购买《${task.title}》，请尽快完成交易`,
                    task.employer_id, '💰 收款成功', `你发布的《${task.title}》已收到款项，等待买家完成交易`
                ]
            );
        } else if (/^TASK_\d+_SECOND_DONE_\d+$/.test(outTradeNo)) {
            const match = outTradeNo.match(/^TASK_(\d+)_SECOND_DONE_/);
            taskId = parseInt(match[1]);
            const [[task]] = await db.query(`SELECT title, employer_id, pay_amount FROM tasks WHERE id = ?`, [taskId]);
            const [[pay]] = await db.query(`SELECT payer_user_id FROM task_payments WHERE out_trade_no = ?`, [outTradeNo]);
            const payerId = pay?.payer_user_id;
            if (!task || !payerId) throw new Error(`二手完成支付缺少记录 task_id: ${taskId}`);
            await db.query(`UPDATE tasks SET status = 2, has_paid = 1, completed_time = NOW(), employer_done = 1, employee_done = 1 WHERE id = ?`, [taskId]);
            await db.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [parseFloat(task.pay_amount), task.employer_id]);
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?), (?, 'task', ?, ?)`,
                [
                    payerId, '✅ 支付完成', `你已完成订单并支付，感谢支持！`,
                    task.employer_id, '💰 收款成功', `二手订单《${task.title}》已收款，交易完成`
                ]
            );
        }

        console.log("✅ 任务支付更新完成");
        res.status(200).json({
            code: "SUCCESS",
            message: "OK"
        });

    } catch (err) {
        console.error("❌ 任务佣金支付回调失败:", err);
        res.status(500).json({
            code: "FAIL",
            message: "处理失败"
        });
    }
});
module.exports = router;