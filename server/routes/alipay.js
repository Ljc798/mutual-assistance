const express = require('express');
const router = express.Router();
const fs = require('fs');
const { AlipaySdk } = require('alipay-sdk');

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

router.post('/notify', async (req, res) => {
  try {
    const payload = req.body || {}
    return res.status(200).send('success')
  } catch (err) {
    return res.status(500).send('fail')
  }
})

module.exports = router