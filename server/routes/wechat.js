const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const getRawBody = require('raw-body');
const xml2js = require('xml2js');
const WXBizMsgCrypt = require('wechat-crypto');

// === 从环境变量或 .env 中读取 ===
const TOKEN = process.env.WX_MESSAGE_TOKEN || 'mutualcampus_token';
const AES_KEY = process.env.WX_ENCODING_AES_KEY;
const APPID = process.env.WX_APPID;

// 安全模式需要 crypt 实例
const cryptor = new WXBizMsgCrypt(TOKEN, AES_KEY, APPID);

// 1) 微信服务器接入校验（GET）
// 文档：timestamp/nonce/token 做 SHA1，等于 signature 则返回 echostr
router.get('/callback', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  const str = [TOKEN, timestamp, nonce].sort().join('');
  const sha = crypto.createHash('sha1').update(str).digest('hex');

  if (sha === signature) {
    return res.send(echostr); // ✔️ 验证成功
  }
  return res.status(401).send('invalid signature');
});

router.post('/callback', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const xml = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : '');

    const { signature, timestamp, nonce, msg_signature } = req.query;

    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
    // 明文模式下，message = parsed.xml
    let message = parsed?.xml || {};

    // 判断是否为“安全模式”（Encrypt 字段存在 / 或 query 带 msg_signature）
    const isSafeMode = Boolean(msg_signature || message.Encrypt);

    if (isSafeMode) {
      // 安全模式：需要用 AES 解密
      const encrypt = message.Encrypt;
      // 校验签名
      const raw = [TOKEN, timestamp, nonce, encrypt].sort().join('');
      const sha = crypto.createHash('sha1').update(raw).digest('hex');
      if (sha !== msg_signature) {
        return res.status(401).send('invalid msg_signature');
      }
      // 解密
      const decryptedXML = cryptor.decrypt(encrypt).message;
      const dec = await xml2js.parseStringPromise(decryptedXML, { explicitArray: false });
      message = dec?.xml || {};
    } else {
      // 明文/兼容模式：可选校验 signature（不是必须）
      const raw = [TOKEN, timestamp, nonce].sort().join('');
      const sha = crypto.createHash('sha1').update(raw).digest('hex');
      if (sha !== signature) {
        return res.status(401).send('invalid signature');
      }
    }

    // === 这里开始就是你的业务处理 ===
    // 常见事件类型：
    // - message.MsgType === 'event'
    //   * 模板/订阅消息回调、客服消息事件等
    // - message.MsgType === 'text' 等普通消息
    console.log('WeChat push message:', message);

    // 处理完务必返回 "success"，否则微信会重试
    res.send('success');
  } catch (err) {
    console.error('WeChat push error:', err);
    // 返回 200 + "success"，避免微信反复重试；也可返回 500 让其重试
    res.send('success');
  }
});

module.exports = router;