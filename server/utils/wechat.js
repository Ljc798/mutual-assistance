// utils/wechat.js
const axios = require('axios');

let cachedToken = null;
let tokenExpireAt = 0; // unix seconds

async function getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && now < tokenExpireAt - 60) return cachedToken;

    const {
        WX_APPID,
        WX_SECRET
    } = process.env;
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`;
    const {
        data
    } = await axios.get(url);
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
async function sendTaskBidNotify({
    openid,
    taskName,
    bidder,
    price,
    remark,
    taskId
}) {
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
            thing1: {
                value: trunc(taskName, 20)
            }, // 任务名称
            thing2: {
                value: trunc(bidder, 20)
            }, // 报价人
            amount3: {
                value: fmtAmount(price)
            }, // 报价金额
            thing4: {
                value: trunc(remark || '无', 20)
            } // 备注
        }
    };

    const {
        data
    } = await axios.post(url, payload);
    // 常见报错：43101 用户未订阅（忽略，不影响业务）
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendTaskBidNotify failed: ' + JSON.stringify(data));
    }
    return data;
}

/**
 * 发送「订单状态通知」
 * @param {Object} p
 * @param {string} p.openid 接收人 openid
 * @param {string} p.orderNo 订单编号
 * @param {string} p.title   订单标题
 * @param {string} p.status  订单状态（如：进行中/已完成）
 * @param {string} p.time    时间（yyyy-MM-dd HH:mm:ss）
 * @param {string|number} p.taskId 任务 ID
 */
async function sendOrderStatusNotify({
    openid,
    orderNo,
    title,
    status,
    time,
    taskId
}) {
    if (!openid) throw new Error('sendOrderStatusNotify: openid missing');
    const trunc = (s = '', n) => (s + '').slice(0, n);

    const token = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;

    const payload = {
        touser: openid,
        template_id: 'znl18Tnml_MV9WzFyKJjCxA6WAQKs26ktWXrXiauzH4', // 订单状态通知
        page: `pages/task/detail?id=${taskId}`,
        data: {
            character_string1: {
                value: orderNo
            }, // 订单编号
            thing2: {
                value: trunc(title, 20)
            }, // 订单标题
            phrase3: {
                value: status
            }, // 订单状态
            time9: {
                value: time
            } // 时间
        }
    };

    const {
        data
    } = await axios.post(url, payload);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendOrderStatusNotify failed: ' + JSON.stringify(data));
    }
    return data;
}

/**
 * 给雇员的【派单通知】
 * 模板：7AvTKCi4G4YPpqhacTUACkeYCRnL2ggbwjaNDy1j7tw
 * 字段：
 *  - thing2  : 服务类型（如：跑腿/代拿快递）
 *  - thing7  : 取货地址
 *  - thing8  : 收货地址
 *  - amount6 : 配送费（金额）
 *  - time9   : 派单时间
 */
async function sendTaskAssignedToEmployee({
    openid,
    serviceType,
    pickupAddr,
    deliveryAddr,
    fee,
    assignTime,
    taskId,
  }) {
    if (!openid) throw new Error('sendTaskAssignedToEmployee: openid missing');
    const trunc = (s = '', n) => (s + '').slice(0, n);
    const fmtAmount = (n) => `￥${Number(n || 0).toFixed(2)}`;
    const fmtTime = (d) => {
      const dt = d instanceof Date ? d : new Date(d || Date.now());
      const pad = (x) => (x < 10 ? '0' + x : '' + x);
      return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };
  
    const token = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;
  
    const payload = {
      touser: openid,
      template_id: '7AvTKCi4G4YPpqhacTUAckeYCRnL2ggbwjaNDy1j7tw',
      page: taskId ? `pages/task/detail?id=${taskId}` : undefined,
      data: {
        thing2:  { value: trunc(serviceType || '跑腿', 20) },
        thing7:  { value: trunc(pickupAddr || '取货地未填', 20) },
        thing8:  { value: trunc(deliveryAddr || '收货地未填', 20) },
        amount6: { value: fmtAmount(fee) },
        time9:   { value: fmtTime(assignTime) },
      },
    };
  
    const { data } = await axios.post(url, payload);
    // 43101 = 用户未订阅 -> 忽略
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
      throw new Error('sendTaskAssignedToEmployee failed: ' + JSON.stringify(data));
    }
    return data;
  }

/** 订单完成通知（发给雇主） */
async function sendTaskCompletedToEmployer({
    openid,
    orderNo,
    amount,
    finishedAt,
    taskType = '跑腿',
    statusText = '雇员已完成任务，请前往确认完成'
}) {
    if (!openid) throw new Error('sendTaskCompletedToEmployer: openid missing');

    const token = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;

    const payload = {
        touser: openid,
        template_id: 'Aeu_BXdMd6xmgSBGrZptUgGdGbT5HTmwDbapPomy3QU',
        // 可按需跳转到任务详情
        page: 'pages/home/home',
        data: {
            character_string1: {
                value: trunc(orderNo, 32)
            }, // 订单号/任务号
            amount2: {
                value: fmtAmount(amount)
            }, // 金额
            time3: {
                value: fmtTime(finishedAt)
            }, // 完成时间
            thing5: {
                value: trunc(taskType, 20)
            }, // 任务类型
            phrase7: {
                value: statusText
            } // 状态：订单已完成
        }
    };

    const {
        data
    } = await axios.post(url, payload);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendTaskCompletedToEmployer failed: ' + JSON.stringify(data));
    }
    return data;
}

/** 打款到账通知（发给接单人） */
async function sendPayoutArrivedToEmployee({
    openid,
    orderNo,
    amount,
    finishedAt,
    taskType = '跑腿',
    statusText = '任务已完成，报酬已入账'
}) {
    if (!openid) throw new Error('sendPayoutArrivedToEmployee: openid missing');

    const token = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;

    const payload = {
        touser: openid,
        template_id: 'Aeu_BXdMd6xmgSBGrZptUgGdGbT5HTmwDbapPomy3QU',
        page: 'pages/home/home',
        data: {
            character_string1: {
                value: trunc(orderNo, 32)
            },
            amount2: {
                value: fmtAmount(amount)
            },
            time3: {
                value: fmtTime(finishedAt)
            },
            thing5: {
                value: trunc(taskType, 20)
            },
            phrase7: {
                value: statusText
            } // 状态：报酬已入账
        }
    };

    const {
        data
    } = await axios.post(url, payload);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendPayoutArrivedToEmployee failed: ' + JSON.stringify(data));
    }
    return data;
}

module.exports = {
    getAccessToken,
    sendTaskBidNotify,
    sendOrderStatusNotify,
    sendTaskCompletedToEmployer,
    sendPayoutArrivedToEmployee,
    sendTaskAssignedToEmployee
};