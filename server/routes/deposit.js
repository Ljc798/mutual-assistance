const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db');
const authMiddleware = require('./authMiddleware');

const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/deposit/notify";
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

router.get('/requirement', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = parseInt(req.query.task_id);
    if (!userId || isNaN(taskId)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    const [[task]] = await db.query('SELECT id, mode, status, pay_amount FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });
    const [[rep]] = await db.query('SELECT total_score FROM user_reputation WHERE user_id = ?', [userId]);
    const [[levelRow]] = await db.query('SELECT vip_level FROM users WHERE id = ?', [userId]);
    const [[frozen]] = await db.query('SELECT id FROM user_deposits WHERE user_id = ? AND task_id = ? AND status = "frozen" LIMIT 1', [userId, taskId]);

    const level = Number(levelRow?.vip_level || 0);
    if (level === 2) {
      return res.json({ success: true, deposit_required_cents: 0, rule_percent: 0, vip_level: level, exempt_available: false, already_frozen: !!frozen });
    }

    const score = Number(rep?.total_score || 50);
    let percent = 0;
    if (score > 85) percent = 0;
    else if (score > 70) percent = 10;
    else if (score > 60) percent = 20;
    else if (score > 50) percent = 50;
    else percent = 80;

    const baseCents = Math.round(Number((task.pay_amount || task.offer) || 0) * 100);
    let requiredCents = Math.floor(baseCents * (percent / 100));
    if (level === 1 && requiredCents > 0) requiredCents = Math.floor(requiredCents * 0.8);

    return res.json({ success: true, deposit_required_cents: requiredCents, rule_percent: percent, vip_level: level, exempt_available: false, already_frozen: !!frozen });
  } catch (err) {
    console.error('❌ 保证金需求计算失败:', err);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/freeze', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { task_id, description } = req.body || {};
    const taskId = parseInt(task_id);
    if (!userId || isNaN(taskId) || !description) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const [[task]] = await db.query('SELECT id, pay_amount FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });
    const [[rep]] = await db.query('SELECT total_score FROM user_reputation WHERE user_id = ?', [userId]);
    const [[levelRow]] = await db.query('SELECT vip_level, openid FROM users WHERE id = ?', [userId]);

    const score = Number(rep?.total_score || 50);
    let percent = 0;
    if (score > 85) percent = 0;
    else if (score > 70) percent = 10;
    else if (score > 60) percent = 20;
    else if (score > 50) percent = 50;
    else percent = 80;

    const baseCents = Math.round(Number((task.pay_amount || task.offer) || 0) * 100);
    let requiredCents = Math.floor(baseCents * (percent / 100));
    const level = Number(levelRow?.vip_level || 0);
    if (level === 2) requiredCents = 0;
    if (level === 1 && requiredCents > 0) requiredCents = Math.floor(requiredCents * 0.8);

    if (requiredCents === 0) {
      await db.query(
        'INSERT INTO user_deposits (user_id, task_id, amount_cents, status, created_at) VALUES (?, ?, 0, "frozen", NOW())',
        [userId, taskId]
      );
      return res.json({ success: true, deposit_required_cents: 0, paymentParams: null });
    }

    const out_trade_no = `DEPOSIT_${taskId}_${userId}_${String(Date.now()).slice(-8)}`;
    await db.query(
      'INSERT INTO user_deposits (user_id, task_id, out_trade_no, amount_cents, status, created_at) VALUES (?, ?, ?, ?, "pending", NOW())',
      [userId, taskId, out_trade_no, requiredCents]
    );

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
      amount: { total: requiredCents, currency: 'CNY' },
      payer: { openid: levelRow?.openid }
    });

    const signature = generateSignature(method, url, timestamp, nonceStr, body);
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

    const response = await axios.post(fullUrl, body, { headers: { Authorization: authorization, 'Content-Type': 'application/json' } });
    const pkg = `prepay_id=${response.data.prepay_id}`;
    const payMessage = `${appid}\n${timestamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = crypto.createSign('RSA-SHA256').update(payMessage).sign(privateKey, 'base64');
    return res.json({ success: true, deposit_required_cents: requiredCents, paymentParams: { timeStamp: timestamp, nonceStr, package: pkg, signType: 'RSA', paySign } });
  } catch (err) {
    console.error('❌ 保证金冻结下单失败:', err.response?.data || err.message);
    return res.status(500).json({ success: false, message: '下单失败' });
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

router.post('/notify', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const rawBody = req.body;
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const notifyData = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
    const { resource } = notifyData;
    if (!resource || !apiV3Key) throw new Error('缺少 resource 或 apiV3Key');
    const decrypted = decryptResource(resource, apiV3Key);
    const outTradeNo = decrypted.out_trade_no;
    const transactionId = decrypted.transaction_id;
    const total = Math.round(Number(decrypted.amount?.total || 0));
    const [[dep]] = await db.query('SELECT user_id, task_id FROM user_deposits WHERE out_trade_no = ?', [outTradeNo]);
    if (!dep) throw new Error('保证金单不存在');
    await db.query('UPDATE user_deposits SET status = "frozen", paid_at = NOW(), transaction_id = ?, amount_cents = ? WHERE out_trade_no = ?', [transactionId, total, outTradeNo]);
    return res.status(200).json({ code: 'SUCCESS', message: 'OK' });
  } catch (err) {
    console.error('❌ 保证金回调处理失败:', err);
    return res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
});

module.exports = router;