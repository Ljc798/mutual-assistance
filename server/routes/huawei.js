const express = require('express');
const router = express.Router();
const fs = require('fs');
const db = require('../config/db');
const authMiddleware = require('./authMiddleware');
const { sendToUser } = require('./ws-helper');
const { sendTaskAssignedToEmployee, sendOrderStatusNotify } = require('../utils/wechat');

function readFileIfExists(p) {
  try { if (p && fs.existsSync(p)) { return fs.readFileSync(p, 'ascii') } } catch (_) {}
  return undefined
}

// Mock signature for now as we don't have real keys
function signHuawei(content, privateKey) {
    if (!privateKey) return 'mock_signature';
    try {
        const signer = require('crypto').createSign('RSA-SHA256');
        signer.update(content);
        return signer.sign(privateKey, 'base64');
    } catch (e) {
        console.warn('Sign failed, using mock', e);
        return 'mock_signature';
    }
}

router.post('/prepay-bid', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { bid_id } = req.body || {};
        const [[bid]] = await db.query('SELECT task_id, user_id AS receiver_id, price FROM task_bids WHERE id = ?', [bid_id]);
        if (!bid) return res.status(404).json({ success: false, message: '投标不存在' });

        const { task_id, receiver_id, price } = bid;
        const [[task]] = await db.query('SELECT title FROM tasks WHERE id = ?', [task_id]);

        const amountFen = Math.floor(Number(price) * 100);
        const outTradeNo = `HUAWEI_BID_${bid_id}_${String(Date.now()).slice(-8)}`;

        await db.query(
            `INSERT INTO task_payments (task_id, bid_id, payer_user_id, receiver_id, amount, out_trade_no, status) 
             VALUES (?, ?, ?, ?, ?, ?, "pending")`,
            [task_id, bid_id, userId, receiver_id, amountFen, outTradeNo]
        );

        const totalAmount = (amountFen / 100).toFixed(2);
        const appId = process.env.HUAWEI_APP_ID || 'mock_app_id';
        const merchantId = process.env.HUAWEI_MERCHANT_ID || 'mock_merchant_id';
        const privateKey = readFileIfExists(process.env.HUAWEI_PRIVATE_KEY_PATH) || process.env.HUAWEI_PRIVATE_KEY;
        
        // Construct Huawei Pay order params
        const params = {
            applicationID: appId,
            merchantId: merchantId,
            productName: `选标支付-${task?.title || '任务'}`,
            productDesc: `选标支付-${task?.title || '任务'}`,
            requestId: outTradeNo,
            amount: totalAmount,
            url: process.env.HUAWEI_NOTIFY_URL || 'https://mutualcampus.top/api/pay/huawei/notify',
            sdkChannel: 1,
            urlVer: 2,
            country: 'CN',
            currency: 'CNY',
            serviceCatalog: 'X6', // Virtual goods
            merchantName: 'Mutual Assistance',
            signType: 'RSA256'
        };

        const content = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
        const sign = signHuawei(content, privateKey);
        
        // The orderStr is a JSON string of params + sign
        const orderInfo = JSON.stringify({ ...params, sign });

        return res.json({ success: true, out_trade_no: outTradeNo, total_amount: totalAmount, data: { orderStr: orderInfo } });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/prepay-task', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { task_id, amount } = req.body || {};
        const [[task]] = await db.query('SELECT * FROM tasks WHERE id = ?', [task_id]);
        if (!task) return res.status(404).json({ success: false, message: '任务不存在' });

        let totalFen;
        if (amount && Number(amount) > 0) {
            totalFen = Math.floor(Number(amount) * 100);
        } else {
            const offerFen = Math.floor(Number(task.offer) * 100);
            totalFen = offerFen;
        }

        const outTradeNo = `HUAWEI_TASK_${task_id}_${String(Date.now()).slice(-8)}`;
        await db.query('INSERT INTO task_payments (task_id, payer_user_id, receiver_id, amount, out_trade_no, status) VALUES (?, ?, ?, ?, ?, "pending")', [task_id, userId, null, totalFen, outTradeNo]);
        
        const totalAmount = (totalFen / 100).toFixed(2);
        const appId = process.env.HUAWEI_APP_ID || 'mock_app_id';
        const merchantId = process.env.HUAWEI_MERCHANT_ID || 'mock_merchant_id';
        const privateKey = readFileIfExists(process.env.HUAWEI_PRIVATE_KEY_PATH) || process.env.HUAWEI_PRIVATE_KEY;

        const params = {
            applicationID: appId,
            merchantId: merchantId,
            productName: `任务支付-${task.title}`,
            productDesc: `任务支付-${task.title}`,
            requestId: outTradeNo,
            amount: totalAmount,
            url: process.env.HUAWEI_NOTIFY_URL || 'https://mutualcampus.top/api/pay/huawei/notify',
            sdkChannel: 1,
            urlVer: 2,
            country: 'CN',
            currency: 'CNY',
            serviceCatalog: 'X6',
            merchantName: 'Mutual Assistance',
            signType: 'RSA256'
        };

        const content = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
        const sign = signHuawei(content, privateKey);
        
        const orderInfo = JSON.stringify({ ...params, sign });

        return res.json({ success: true, out_trade_no: outTradeNo, total_amount: totalAmount, data: { orderStr: orderInfo } });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/notify', async (req, res) => {
    try {
        const params = req.body || {};
        
        const outTradeNo = params.out_trade_no || params.requestId;
        const tradeNo = params.trade_no || params.orderId;
        
        if (!outTradeNo) return res.status(400).send('fail');

        await db.query(
            `UPDATE task_payments SET status = 'paid', transaction_id = ?, paid_at = NOW() WHERE out_trade_no = ?`,
            [tradeNo || null, outTradeNo]
        );

        let taskId;
        if (/^HUAWEI_TASK_\d+_/.test(outTradeNo)) {
             const match = outTradeNo.match(/^HUAWEI_TASK_(\d+)_/);
             taskId = parseInt(match[1]);
             const [[task]] = await db.query(`SELECT title, employer_id, offer FROM tasks WHERE id = ?`, [taskId]);
             if (!task) throw new Error(`任务不存在: ${taskId}`);
             const [[payRow]] = await db.query(`SELECT amount, payer_user_id FROM task_payments WHERE out_trade_no = ?`, [outTradeNo]);
             const finalFen = Number(payRow?.amount || 0);
             const offerFen = Math.floor(parseFloat(task.offer) * 100);
             await db.query(
               `UPDATE tasks SET has_paid = 1, status = 0, pay_amount = ?, payment_transaction_id = ? WHERE id = ?`,
               [parseFloat(task.offer), tradeNo || null, taskId]
             );
             await db.query(
               `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
               [task.employer_id, '💰 支付成功', `你已成功支付任务《${task.title}》，支付金额¥${(finalFen/100).toFixed(2)}，等待接单人完成任务～`]
             );

        } else if (/^HUAWEI_BID_\d+_/.test(outTradeNo)) {
             const [[payRow]] = await db.query(`SELECT task_id, bid_id, amount, payer_user_id, receiver_id FROM task_payments WHERE out_trade_no = ?`, [outTradeNo]);
             if (!payRow) throw new Error('payment record not found');
             const { task_id, bid_id, amount: finalFen, receiver_id: employeeId, payer_user_id: employerId } = payRow;
             
             const [[task]] = await db.query(`SELECT title, employer_id, position, address FROM tasks WHERE id = ?`, [task_id]);
             const [[bidRow]] = await db.query('SELECT price FROM task_bids WHERE id = ?', [bid_id]);
             const basePrice = parseFloat(bidRow?.price || 0);
             
             await db.query(
               `UPDATE tasks 
                SET employee_id = ?, selected_bid_id = ?, status = 1, has_paid = 1, 
                    pay_amount = ?, payment_transaction_id = ?
                WHERE id = ?`,
               [employeeId, bid_id, basePrice, tradeNo || null, task_id]
             );
       
             await db.query(
               `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
               [employeeId, '🎉 任务委派成功', `任务《${task.title}》已经指派给你，快去完成吧！`]
             );
             sendToUser(employeeId, {
                type: 'notify',
                content: `🎉 你的投标被采纳！任务《${task.title}》已委派给你～`,
                created_time: new Date().toISOString()
             });
             
             const [[emplUser]] = await db.query(`SELECT openid FROM users WHERE id = ?`, [employeeId]);
             if (emplUser?.openid) {
                  try {
                    await sendTaskAssignedToEmployee({
                        openid: emplUser.openid,
                        serviceType: task.title,
                        pickupAddr: task.position,
                        deliveryAddr: task.address,
                        fee: basePrice,
                        assignTime: new Date()
                    });
                  } catch(e) { console.error('sendTaskAssignedToEmployee fail', e) }
             }

             await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [employerId, '💰 支付成功', `你已成功支付任务《${task.title}》，订单已委派给接单人～`]
              )
              sendToUser(employerId, {
                type: 'notify',
                content: `💰 你已成功支付任务《${task.title}》，金额¥${(finalFen/100).toFixed(2)}，等待接单人完成任务～`,
                created_time: new Date().toISOString()
              })
              const [[empUser]] = await db.query(`SELECT openid FROM users WHERE id = ?`, [employerId]);
              if (empUser?.openid) {
                  try {
                    await sendOrderStatusNotify({
                        openid: empUser.openid,
                        orderNo: task_id,
                        title: task.title,
                        status: `进行中`,
                        time: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        taskId: task_id
                    });
                  } catch(e) { console.error('sendOrderStatusNotify fail', e) }
              }
        }

        return res.status(200).send('success');
    } catch (err) {
        console.error('huawei notify error', err);
        return res.status(500).send('fail');
    }
});

module.exports = router;
