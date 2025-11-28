const express = require('express');
const router = express.Router();
const fs = require('fs');
const { AlipaySdk } = require('alipay-sdk');
const db = require('../config/db');
const authMiddleware = require('./authMiddleware');

function readFileIfExists(p) {
  try { if (p && fs.existsSync(p)) { return fs.readFileSync(p, 'ascii') } } catch (_) {}
  return undefined
}

function createClient() {
  const appId = process.env.ALIPAY_APP_ID
  const privateKey = readFileIfExists(process.env.ALIPAY_PRIVATE_KEY_PATH) || process.env.ALIPAY_PRIVATE_KEY
  const alipayPublicKey = readFileIfExists(process.env.ALIPAY_PUBLIC_KEY_PATH) || process.env.ALIPAY_PUBLIC_KEY
  const config = { appId, privateKey, alipayPublicKey }
  if (String(process.env.ALIPAY_KEY_TYPE || '').trim().length > 0) { config.keyType = process.env.ALIPAY_KEY_TYPE }
  if (String(process.env.ALIPAY_ENDPOINT || '').trim().length > 0) { config.endpoint = process.env.ALIPAY_ENDPOINT }
  return new AlipaySdk(config)
}

let clientCache = null
function getClient() {
  if (clientCache) return clientCache
  const appId = process.env.ALIPAY_APP_ID
  const priv = readFileIfExists(process.env.ALIPAY_PRIVATE_KEY_PATH) || process.env.ALIPAY_PRIVATE_KEY
  const pub = readFileIfExists(process.env.ALIPAY_PUBLIC_KEY_PATH) || process.env.ALIPAY_PUBLIC_KEY
  if (!appId || !priv || !pub) return null
  clientCache = createClient()
  return clientCache
}

router.get('/config/check', async (req, res) => {
  const c = getClient()
  if (!c) return res.status(500).json({ success: false, message: 'missing ALIPAY_APP_ID or private/public key' })
  return res.json({ success: true })
})

router.get('/test', async (req, res) => {
  const c = getClient()
  if (!c) return res.status(500).json({ success: false, message: 'missing ALIPAY_APP_ID or private/public key' })
  try {
    const result = await c.curl('POST', '/v3/alipay/user/deloauth/detail/query', { body: { date: '20230102', offset: 1, limit: 1 } })
    return res.json({ success: true, responseHttpStatus: result.responseHttpStatus, traceId: result.traceId, data: result.data })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/prepay-task', authMiddleware, async (req, res) => {
  const c = getClient()
  if (!c) return res.status(500).json({ success: false, message: 'missing ALIPAY_APP_ID or private/public key' })
  try {
    const userId = req.user.id
    const { task_id, include_commission } = req.body || {}
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id = ?', [task_id])
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' })
    const offerFen = Math.floor(Number(task.offer) * 100)
    const commissionFen = include_commission ? Math.max(Math.floor(Number(task.offer) * 100 * 0.02), 1) : 0
    let totalFen = offerFen + commissionFen
    const outTradeNo = `ALI_TASK_${task_id}_${String(Date.now()).slice(-8)}`
    await db.query('INSERT INTO task_payments (task_id, payer_user_id, receiver_id, amount, out_trade_no, status) VALUES (?, ?, ?, ?, ?, "pending")', [task_id, userId, null, totalFen, outTradeNo])
    const totalAmount = (totalFen / 100).toFixed(2)
    const notifyUrl = process.env.ALIPAY_NOTIFY_URL || 'https://mutualcampus.top/api/pay/ali/notify'
    const subject = `任务支付-${task.title}`
    const appId = process.env.ALIPAY_APP_ID
    const priv = readFileIfExists(process.env.ALIPAY_PRIVATE_KEY_PATH) || process.env.ALIPAY_PRIVATE_KEY
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')
    const params = {
      app_id: appId,
      method: 'alipay.trade.app.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp,
      version: '1.0',
      notify_url: notifyUrl,
      biz_content: JSON.stringify({ subject, out_trade_no: outTradeNo, total_amount: totalAmount, product_code: 'QUICK_MSECURITY_PAY' })
    }
    const keys = Object.keys(params).sort()
    const signContent = keys.map(k => `${k}=${params[k]}`).join('&')
    const signer = require('crypto').createSign('RSA-SHA256')
    signer.update(signContent)
    const sign = signer.sign(priv, 'base64')
    const orderInfo = keys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&') + `&sign=${encodeURIComponent(sign)}`
    return res.json({ success: true, out_trade_no: outTradeNo, total_amount: totalAmount, data: { orderInfo, orderStr: orderInfo } })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/notify', async (req, res) => {
  try {
    const c = getClient()
    const params = req.body || {}
    const isOk = c && typeof c.checkNotifySign === 'function' ? c.checkNotifySign(params) : verifyNotifyManually(params)
    if (!isOk) {
      return res.status(400).send('fail')
    }
    const outTradeNo = params.out_trade_no
    const tradeStatus = params.trade_status
    const tradeNo = params.trade_no
    const totalAmountStr = params.total_amount
    if (!outTradeNo) return res.status(400).send('fail')
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      return res.status(200).send('success')
    }
    await db.query(
      `UPDATE task_payments SET status = 'paid', transaction_id = ?, paid_at = NOW() WHERE out_trade_no = ?`,
      [tradeNo || null, outTradeNo]
    )
    let taskId
    if (/^ALI_TASK_\d+_/.test(outTradeNo)) {
      const match = outTradeNo.match(/^ALI_TASK_(\d+)_/)
      taskId = parseInt(match[1])
      const [[task]] = await db.query(`SELECT title, employer_id, offer FROM tasks WHERE id = ?`, [taskId])
      if (!task) throw new Error(`任务不存在: ${taskId}`)
      const [[payRow]] = await db.query(`SELECT amount, payer_user_id FROM task_payments WHERE out_trade_no = ?`, [outTradeNo])
      const finalFen = Number(payRow?.amount || 0)
      const payerId = payRow?.payer_user_id
      const offerFen = Math.floor(parseFloat(task.offer) * 100)
      await db.query(
        `UPDATE tasks SET has_paid = 1, status = 0, pay_amount = ?, payment_transaction_id = ? WHERE id = ?`,
        [parseFloat(task.offer), tradeNo || null, taskId]
      )
      await db.query(
        `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
        [task.employer_id, '💰 支付成功', `你已成功支付任务《${task.title}》，支付金额¥${(finalFen/100).toFixed(2)}，等待接单人完成任务～`]
      )
    }
    return res.status(200).send('success')
  } catch (err) {
    console.error('alipay notify error', err)
    return res.status(500).send('fail')
  }
})

function verifyNotifyManually(params) {
  try {
    const sign = params.sign
    const signType = params.sign_type || 'RSA2'
    if (!sign) return false
    const entries = Object.keys(params)
      .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== undefined && params[k] !== null)
      .sort()
      .map(k => `${k}=${params[k]}`)
    const signContent = entries.join('&')
    const pub = readFileIfExists(process.env.ALIPAY_PUBLIC_KEY_PATH) || process.env.ALIPAY_PUBLIC_KEY
    const verifier = require('crypto').createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1')
    verifier.update(signContent)
    return verifier.verify(pub, sign, 'base64')
  } catch (_) {
    return false
  }
}

module.exports = router
