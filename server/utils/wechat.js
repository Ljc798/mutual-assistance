// utils/wechat.js
const axios = require('axios');
const redis = require('./redis');

const TOKEN_KEY = 'wx:access_token';

/** —— 小工具 —— */
const trunc = (s = '', n) => (s + '').slice(0, n);
const pad = (x) => (x < 10 ? '0' + x : '' + x);
const fmtAmount = (n) => `${Number(n || 0).toFixed(2)}`;
const fmtTime = (d) => {
    const dt = d instanceof Date ? d : new Date(d || Date.now());
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
};

/** 实时向微信获取 access_token，并写入 Redis（带缓冲） */
async function fetchAccessToken() {
    const {
        WX_APPID,
        WX_SECRET,
        NODE_ENV
    } = process.env;
    if (!WX_APPID || !WX_SECRET) {
        throw new Error("WX_APPID / WX_SECRET 未配置");
    }

    // ✅ Redis key 按环境区分，避免多环境冲突
    const TOKEN_KEY = `wx:access_token:${NODE_ENV || "dev"}`;

    try {
        // 🚀 尝试使用稳定 token 接口
        const {
            data
        } = await axios.post("https://api.weixin.qq.com/cgi-bin/stable_token", {
            grant_type: "client_credential",
            appid: WX_APPID,
            secret: WX_SECRET,
            force_refresh: false,
        });

        // 🚨 stable_token 失败则 fallback 到旧接口
        if (!data.access_token) {
            console.warn("⚠️ stable_token 获取失败，退回旧接口:", data);
            const legacy = await axios.get(
                `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`
            );
            if (!legacy.data.access_token) {
                throw new Error("fetchAccessToken failed: " + JSON.stringify(legacy.data));
            }
            await redis.set(TOKEN_KEY, legacy.data.access_token, "EX", (legacy.data.expires_in || 7200) - 120);
            return legacy.data.access_token;
        }

        // ✅ 正常写入 Redis（留 120 秒缓冲）
        const ttl = Math.max(60, (data.expires_in || 7200) - 120);
        await redis.set(TOKEN_KEY, data.access_token, "EX", ttl);
        console.log("✅ 获取到稳定 access_token:", data.access_token.slice(0, 10), "...");

        return data.access_token;
    } catch (err) {
        console.error("❌ fetchAccessToken 异常:", err.response?.data || err.message);
        throw err;
    }
}

/** 优先从 Redis 拿 token，缺失/过期再向微信刷新；force=true 强刷 */
async function getAccessToken(force = false) {
    const TOKEN_KEY = `wx:access_token:${process.env.NODE_ENV || "dev"}`;
    if (!force) {
        const token = await redis.get(TOKEN_KEY);
        if (token) return token;
    }
    return fetchAccessToken();
}


/** 统一封装微信 API 调用：自动附带 token，并在 40001/42001/40014 时强刷重试一次 */
async function callWeChatWithToken(method, baseUrl, payload) {
    let token = await getAccessToken();
    let url = `${baseUrl}?access_token=${token}`;

    let resp = method === 'GET' ? await axios.get(url) : await axios.post(url, payload);
    let data = resp.data;

    if (data && [40001, 42001, 40014].includes(data.errcode)) {
        // token 无效/过期，强制刷新后重试一次
        token = await getAccessToken(true);
        url = `${baseUrl}?access_token=${token}`;
        resp = method === 'GET' ? await axios.get(url) : await axios.post(url, payload);
        data = resp.data;
    }
    return data;
}

/** ====================== 下面是你要用到的通知函数 ====================== */

/**
 * A. 任务报价通知（发给雇主）
 * 模板ID：thyNDiwx5-813OHNsvoYrrtAP9HMrNrU9TMSym14yjw
 * 字段：thing1(任务名称)、thing2(报价人)、amount3(金额)、thing4(备注)
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

    const payload = {
        touser: openid,
        template_id: 'thyNDiwx5-813OHNsvoYrrtAP9HMrNrU9TMSym14yjw',
        page: taskId ? `pages/task/detail?id=${taskId}` : 'pages/home/home',
        data: {
            thing1: {
                value: trunc(taskName, 20)
            },
            thing2: {
                value: trunc(bidder, 20)
            },
            amount3: {
                value: fmtAmount(price)
            },
            thing4: {
                value: trunc(remark || '无', 20)
            },
        },
    };

    const data = await callWeChatWithToken('POST', 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send', payload);
    logWeChatResult('sendTaskBidNotify', payload, data);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendTaskBidNotify failed: ' + JSON.stringify(data));
    }
    return data;
}

/**
 * B. 订单状态通知（发给雇主）
 * 模板ID：znl18Tnml_MV9WzFyKJjCxA6WAQKs26ktWXrXiauzH4
 * 字段：character_string1(订单编号)、thing2(标题)、phrase3(状态)、time9(时间)
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

    const payload = {
        touser: openid,
        template_id: 'znl18Tnml_MV9WzFyKJjCxA6WAQKs26ktWXrXiauzH4',
        page: taskId ? `pages/task/detail?id=${taskId}` : 'pages/home/home',
        data: {
            character_string1: {
                value: trunc(orderNo, 32)
            },
            thing2: {
                value: trunc(title, 20)
            },
            phrase3: {
                value: trunc(status, 15)
            },
            time9: {
                value: time || fmtTime(new Date())
            },
        },
    };

    const data = await callWeChatWithToken('POST', 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send', payload);
    logWeChatResult('sendOrderStatusNotify', payload, data);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendOrderStatusNotify failed: ' + JSON.stringify(data));
    }
    return data;
}

/**
 * C. 派单通知（发给接单人）
 * 模板ID：7AvTKCi4G4YPpqhacTUAckeYCRnL2ggbwjaNDy1j7tw
 * 字段：thing2(服务类型)、thing7(取货地址)、thing8(收货地址)、amount6(配送费)、time9(时间)
 */
async function sendTaskAssignedToEmployee({
    openid,
    serviceType,
    pickupAddr,
    deliveryAddr,
    fee,
    assignTime,
    taskId
}) {
    if (!openid) throw new Error('sendTaskAssignedToEmployee: openid missing');

    const payload = {
        touser: openid,
        template_id: '7AvTKCi4G4YPpqhacTUAckeYCRnL2ggbwjaNDy1j7tw',
        page: taskId ? `pages/task/detail?id=${taskId}` : 'pages/home/home',
        data: {
            thing2: {
                value: trunc(serviceType || '跑腿', 20)
            },
            thing7: {
                value: trunc(pickupAddr || '取货地未填', 20)
            },
            thing8: {
                value: trunc(deliveryAddr || '收货地未填', 20)
            },
            amount6: {
                value: fmtAmount(fee)
            },
            time9: {
                value: fmtTime(assignTime)
            },
        },
    };

    const data = await callWeChatWithToken('POST', 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send', payload);
    logWeChatResult('sendTaskAssignedToEmployee', payload, data);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendTaskAssignedToEmployee failed: ' + JSON.stringify(data));
    }
    return data;
}

/**
 * D. 通用的订单完成/到账通知
 * 模板ID：Aeu_BXdMd6xmgSBGrZptUgGdGbT5HTmwDbapPomy3QU
 * 字段：character_string1(订单号)、amount2(金额)、time3(完成时间)、thing5(类型)、phrase7(状态)
 */
async function sendTaskStatusNotify({
    openid,
    orderNo,
    amount,
    finishedAt,
    taskType = '跑腿',
    statusText = '任务已完成',
    page = 'pages/home/home'
}) {
    if (!openid) throw new Error('sendTaskStatusNotify: openid missing');

    const payload = {
        touser: openid,
        template_id: 'Aeu_BXdMd6xmgSBGrZptUgGdGbT5HTmwDbapPomy3QU',
        page,
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
                value: trunc(statusText, 20)
            },
        },
    };

    const data = await callWeChatWithToken(
        'POST',
        'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
        payload
    );
    logWeChatResult('sendTaskStatusNotify', payload, data);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendTaskStatusNotify failed: ' + JSON.stringify(data));
    }
    return data;
}

/**
 * E. 上课提醒
 * 模板ID：ftmEuFBPPKO2R6cX12lBzQEcN2uom-iGy4pdKYPhqB0
 * 字段：thing6(课程名)、thing10(地址)、thing13(老师)、thing19(时间文本)、thing9(提示)
 */
async function sendClassReminder({
    openid,
    courseName,
    address,
    teacher,
    timeText,
    tip = '请提前出发，别迟到哦～',
    page = 'pages/timetable/timetable'
}) {
    if (!openid) throw new Error('sendClassReminder: openid missing');

    const payload = {
        touser: openid,
        template_id: 'ftmEuFBPPKO2R6cX121BzQEcN2uom-iGy4pdKYPhqB0',
        page,
        data: {
            thing6: {
                value: trunc(courseName, 20)
            },
            thing10: {
                value: trunc(address || '无', 20)
            },
            thing13: {
                value: trunc(teacher || '老师', 20)
            },
            thing19: {
                value: trunc(timeText, 20)
            }, // “10:00-11:30”
            thing9: {
                value: trunc(tip, 20)
            },
        },
    };

    const data = await callWeChatWithToken('POST', 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send', payload);
    logWeChatResult('sendClassReminder', payload, data);
    if (data.errcode && data.errcode !== 0 && data.errcode !== 43101) {
        throw new Error('sendClassReminder failed: ' + JSON.stringify(data));
    }
    return data;
}

function logWeChatResult(tag, payload, data) {
    console.log(`[${tag}] 发送参数:`, JSON.stringify(payload));
    console.log(`[${tag}] 微信返回:`, JSON.stringify(data));
}

module.exports = {
    // token
    getAccessToken,
    callWeChatWithToken,

    // 消息
    sendTaskBidNotify,
    sendOrderStatusNotify,
    sendTaskAssignedToEmployee,
    sendTaskStatusNotify,
    sendClassReminder,
};