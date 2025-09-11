// utils/wechat.js
const axios = require('axios');

let cachedToken = null;
let tokenExpireAt = 0; // unix seconds

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpireAt - 60) return cachedToken;

  const { WX_APPID, WX_SECRET } = process.env;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`;
  const { data } = await axios.get(url);
  if (!data.access_token) {
    throw new Error('getAccessToken failed: ' + JSON.stringify(data));
  }
  cachedToken = data.access_token;
  tokenExpireAt = now + (data.expires_in || 7200);
  return cachedToken;
}

/**
 * 发送「任务报价通知」
 * @param {Object} p
 * @param {string} p.openid  雇主 openid（消息接收人）
 * @param {string} p.taskName 任务名称
 * @param {string} p.bidder   报价人昵称
 * @param {string|number} p.price 金额（元）
 * @param {string} p.remark   备注（留言）
 * @param {string|number} p.taskId 任务 ID（点击消息跳转）
 */
async function sendTaskBidNotify({ openid, taskName, bidder, price, remark, taskId }) {
  if (!openid) throw new Error('sendTaskBidNotify: openid missing');

  // （微信对 thingX 的长度有要求，做下兜底裁剪）
  const trunc = (s = '', n) => (s + '').slice(0, n);
  const fmtAmount = (n) => `￥${Number(n || 0).toFixed(2)}`;

  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;

  const payload = {
    touser: openid,
    template_id: 'thyNDiwx5-813OHNsvoYrrtAP9HMrNrU9TMSym14yjw', // 任务报价通知
    page: `pages/task/detail?id=${taskId}`,
    data: {
      thing1:  { value: trunc(taskName, 20) },      // 任务名称
      thing2:  { value: trunc(bidder, 20) },        // 报价人
      amount3: { value: fmtAmount(price) },         // 报价金额
      thing4:  { value: trunc(remark || '无', 20) } // 备注
    }
  };

  const { data } = await axios.post(url, payload);
  // 常见报错：43101 用户未订阅（忽略，不影响业务）
  if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
    throw new Error('sendTaskBidNotify failed: ' + JSON.stringify(data));
  }
  return data;
}

module.exports = {
  getAccessToken,
  sendTaskBidNotify,
};