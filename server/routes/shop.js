const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
function normalizeLevel(level) {
  if (level === null || level === undefined) return 0;
  if (typeof level === 'string') {
    const s = level.toLowerCase();
    if (s === 'vip') return 1;
    if (s === 'svip') return 2;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(level);
  return Number.isFinite(n) ? n : 0;
}
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('./authMiddleware');

const appid = process.env.WX_APPID;
const mchid = process.env.WX_MCHID;
const serial_no = process.env.WX_SERIAL_NO;
const notify_url = "https://mutualcampus.top/api/shop/notify";
const fs = require('fs');
const path = process.env.WX_PRIVATE_KEY_PATH;
if (!path) throw new Error('WX_PRIVATE_KEY_PATH not set');
const privateKey = fs.readFileSync(path, 'utf8');
const apiV3Key = process.env.WX_API_V3_KEY;
const SECRET = process.env.JWT_SECRET;

function generateSignature(method, url, timestamp, nonceStr, body) {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

// 📌 获取所有上架的商品
router.get("/items", async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT id, name, type, cost, description, price, exchange_type,
                    level, effect_value, duration_days, limit_per_user, sort, icon, available
             FROM shop_items WHERE available = 1
             ORDER BY sort ASC, id ASC`
        );
        res.json({ success: true, items });
    } catch (err) {
        console.error("❌ 获取商城商品失败:", err);
        res.status(500).json({ success: false, message: "服务器错误" });
    }
});

// 📌 积分兑换商品，添加 authMiddleware
router.post("/redeem-point", authMiddleware, async (req, res) => { // 添加了身份验证中间件
    const {
        user_id,
        item_id
    } = req.body;
    if (!user_id || !item_id) {
        return res.status(400).json({
            success: false,
            message: "缺少参数"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [[item]] = await connection.query(`SELECT * FROM shop_items WHERE id = ? FOR UPDATE`, [item_id]);
        if (!item) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "商品不存在"
            });
        }
        if (item.exchange_type !== "point" && item.exchange_type !== "both") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "该商品不支持积分兑换"
            });
        }
        // 库存字段已移除，跳过库存检查

        const [
            [user]
        ] = await connection.query(
            `SELECT * FROM users WHERE id = ? FOR UPDATE`, [user_id]
        );
        if (!user) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "用户不存在"
            });
        }
        if (user.points < item.cost) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "积分不足"
            });
        }

        // 限购检查（积分兑换）
        if (item.limit_per_user && Number(item.limit_per_user) > 0) {
            const [[cnt]] = await connection.query(
                `SELECT COUNT(*) AS c FROM shop_orders WHERE user_id = ? AND item_id = ?`,
                [user_id, item_id]
            );
            if (Number(cnt.c) >= Number(item.limit_per_user)) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: '已达该商品限购次数' });
            }
        }

        // 执行扣除积分、减少库存、写入订单
        await connection.query(
            `UPDATE users SET points = points - ? WHERE id = ?`, [item.cost, user_id]
        );
        // 库存字段已移除，跳过库存扣减
        await connection.query(
            `INSERT INTO shop_orders (user_id, item_id, exchange_method) VALUES (?, ?, 'point')`, [user_id, item_id]
        );

        // 特殊逻辑处理（新：通用 type）
        const effectType = (item.type || '').toLowerCase();
        const effectValue = (() => { try { return JSON.parse(item.effect_value || '{}') } catch { return {} } })();
        const durationDays = Number(item.duration_days || 0);
        const level = normalizeLevel(item.level);

        if (effectType === 'vip') {
            const now = new Date();
            const vipExp = user.vip_expire_time ? new Date(user.vip_expire_time) : null;
            const svipExp = user.svip_expire_time ? new Date(user.svip_expire_time) : null;
            const addedDays = durationDays > 0 ? durationDays : (item.days || 7);
            if (level === 2) {
                // SVIP：续期 svip，到期后回到 VIP；若当前是 VIP，也同时给 VIP 续期
                const baseSvip = svipExp && svipExp > now ? svipExp : now;
                const newSvip = new Date(baseSvip.getTime() + addedDays * 86400000);
                const svipStr = newSvip.toISOString().slice(0, 19).replace('T', ' ');
                await connection.query(`UPDATE users SET svip_expire_time = ?, vip_level = 2 WHERE id = ?`, [svipStr, user_id]);
                const vipActive = vipExp && vipExp > now;
                if (vipActive) {
                    const newVip = new Date(vipExp.getTime() + addedDays * 86400000);
                    const vipStr = newVip.toISOString().slice(0, 19).replace('T', ' ');
                    await connection.query(`UPDATE users SET vip_expire_time = ? WHERE id = ?`, [vipStr, user_id]);
                }
            } else {
                const baseVip = vipExp && vipExp > now ? vipExp : now;
                const newVip = new Date(baseVip.getTime() + addedDays * 86400000);
                const vipStr = newVip.toISOString().slice(0, 19).replace('T', ' ');
                await connection.query(`UPDATE users SET vip_expire_time = ?, vip_level = 1 WHERE id = ?`, [vipStr, user_id]);
            }
        } else if (effectType === 'ai_quota') {
            const inc = Number(effectValue.amount || 0);
            const fieldRaw = String(effectValue.field || 'ai_quota');
            const f = fieldRaw.toLowerCase();
            if (inc > 0) {
                const colName = f.includes('daily') ? 'ai_daily_quota' : 'ai_quota';
                const [[col]] = await connection.query("SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?", [colName]);
                if (Number(col?.cnt || 0) === 0) {
                    await connection.query(`ALTER TABLE users ADD COLUMN ${colName} INT NOT NULL DEFAULT 0`);
                }
                const [[cur]] = await connection.query(`SELECT ${colName} AS v FROM users WHERE id = ?`, [user_id]);
                const current = Number(cur?.v || 0);
                if (!f.includes('daily') && current + inc > 50) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: 'AI额度已达上限50，无法继续购买' });
                }
                await connection.query(`UPDATE users SET ${colName} = ${colName} + ? WHERE id = ?`, [inc, user_id]);
            }
        } else if (effectType === 'ai_boost') {
            const days = durationDays > 0 ? durationDays : Number(effectValue.days || 1);
            if (days > 0) {
                await connection.query(`UPDATE users SET ai_speed_boost_days = ai_speed_boost_days + ? WHERE id = ?`, [days, user_id]);
            }
        } else if (effectType === 'deposit_free_once') {
            const times = Number(effectValue.times || 1);
            const [[col]] = await connection.query("SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deposit_free_times'");
            if (Number(col?.cnt || 0) === 0) {
                await connection.query("ALTER TABLE users ADD COLUMN deposit_free_times INT NOT NULL DEFAULT 0");
            }
            await connection.query(`UPDATE users SET deposit_free_times = deposit_free_times + ? WHERE id = ?`, [times, user_id]);
        } else if (effectType === 'remove_ad') {
            await connection.query(`UPDATE users SET free_counts = free_counts + 1 WHERE id = ?`, [user_id]);
        }

        // 通用通知
        await connection.query(
            `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'shop', ?, ?)`,
            [ user_id, '🎁 商品兑换成功', `你成功兑换了【${item.name}】，权益已生效或已加入账户。` ]
        );

        await connection.commit();
        res.json({
            success: true,
            message: "兑换成功"
        });

    } catch (err) {
        await connection.rollback();
        console.error("❌ 积分兑换失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    } finally {
        connection.release(); // ✅ 无论成功或失败都要释放连接
    }
});

// 🧾 创建微信支付订单
router.post('/create-order', authMiddleware, async (req, res) => {
    try {
        const { item_id } = req.body;
        const userId = req.user.id;

        const [[item]] = await db.query(`SELECT * FROM shop_items WHERE id = ?`, [item_id]);
        if (!item) return res.status(404).json({ success: false, message: "商品不存在" });

        if (item.exchange_type !== 'money' && item.exchange_type !== 'both') {
            return res.status(400).json({ success: false, message: '该商品不支持支付购买' });
        }

        // 限购检查
        if (item.limit_per_user && Number(item.limit_per_user) > 0) {
            const [[cnt]] = await db.query(
                `SELECT COUNT(*) AS c FROM shop_orders WHERE user_id = ? AND item_id = ?`,
                [userId, item_id]
            );
            if (Number(cnt.c) >= Number(item.limit_per_user)) {
                return res.status(400).json({ success: false, message: '已达该商品限购次数' });
            }
        }

        const [[user]] = await db.query(`SELECT openid FROM users WHERE id = ?`, [userId]);
        if (!user) return res.status(400).json({ success: false, message: '用户不存在' });

        const out_trade_no = `SHOP_${userId}_${item_id}_${String(Date.now()).slice(-8)}`;
        const [[userInfo]] = await db.query(`SELECT vip_level, vip_expire_time, svip_expire_time FROM users WHERE id = ?`, [userId]);
        const now = new Date();
        const vipActive = userInfo?.vip_expire_time && new Date(userInfo.vip_expire_time) > now;
        const svipActive = userInfo?.svip_expire_time && new Date(userInfo.svip_expire_time) > now;
        const level = Number(userInfo?.vip_level || 0);
        const discount = svipActive ? 0.90 : (vipActive && level === 1 ? 0.95 : 1.0);
        const total_fee = Math.floor(item.price * 100 * discount);

        await db.query(
            `INSERT INTO shop_orders (user_id, item_id, out_trade_no, exchange_method) VALUES (?, ?, ?, 'money')`,
            [userId, item_id, out_trade_no]
        );

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const url = '/v3/pay/transactions/jsapi';
        const fullUrl = `https://api.mch.weixin.qq.com${url}`;

        const body = JSON.stringify({
            appid,
            mchid,
            description: `商城商品 - ${item.name}`,
            out_trade_no,
            notify_url,
            amount: {
                total: total_fee,
                currency: 'CNY'
            },
            payer: {
                openid: user.openid
            }
        });

        const signature = generateSignature("POST", url, timestamp, nonceStr, body);
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial_no}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        const response = await axios.post(fullUrl, body, {
            headers: {
                Authorization: authorization,
                'Content-Type': 'application/json'
            }
        });

        const prepay_id = response.data.prepay_id;
        const payNonceStr = crypto.randomBytes(16).toString("hex");
        const pkg = `prepay_id=${prepay_id}`;
        const payMessage = `${appid}\n${timestamp}\n${payNonceStr}\n${pkg}\n`;

        const paySign = crypto.createSign("RSA-SHA256").update(payMessage).sign(privateKey, "base64");

        res.json({
            success: true,
            discount_rate: discount,
            final_total: total_fee,
            paymentParams: { timeStamp: timestamp, nonceStr: payNonceStr, package: pkg, signType: "RSA", paySign }
        });

    } catch (err) {
        console.error("❌ 创建商城订单失败:", err);
        res.status(500).json({
            success: false,
            message: "创建支付订单失败"
        });
    }
});

router.post('/notify', express.raw({ type: '*/*' }), async (req, res) => {
    try {
        const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
        const notifyData = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
        const { resource } = notifyData;
        if (!resource || !apiV3Key) throw new Error("缺少 resource 或 apiV3Key");

        const decrypted = decryptResource(resource, apiV3Key);
        const outTradeNo = decrypted.out_trade_no;
        const transactionId = decrypted.transaction_id;

        const [[order]] = await db.query(`SELECT * FROM shop_orders WHERE out_trade_no = ?`, [outTradeNo]);
        if (!order) throw new Error("订单不存在");

        const userId = order.user_id;
        const [[item]] = await db.query(`SELECT * FROM shop_items WHERE id = ?`, [order.item_id]);
        if (!item) throw new Error("商品不存在");

        // ✅ 更新订单状态 + 减库存
        await db.query(
            `UPDATE shop_orders SET paid_at = NOW(), transaction_id = ? WHERE out_trade_no = ?`,
            [transactionId, outTradeNo]
        );
        // 库存字段已移除，跳过库存扣减

        // ✅ 执行虚拟效果逻辑（通用 type）
        const effectType = (item.type || '').toLowerCase();
        const effectValue = (() => { try { return JSON.parse(item.effect_value || '{}') } catch { return {} } })();
        const durationDays = Number(item.duration_days || 0);
        const level = normalizeLevel(item.level);

        if (effectType === 'vip') {
            const [[user]] = await db.query(`SELECT vip_expire_time, svip_expire_time, vip_level FROM users WHERE id = ?`, [userId]);
            const now = new Date();
            if (level === 2) {
                const baseSvip = user.svip_expire_time && new Date(user.svip_expire_time) > now ? new Date(user.svip_expire_time) : now;
                const newSvip = new Date(baseSvip.getTime() + (durationDays || 7) * 86400000);
                const svipStr = newSvip.toISOString().slice(0, 19).replace('T', ' ');
                await db.query(`UPDATE users SET svip_expire_time = ?, vip_level = 2 WHERE id = ?`, [svipStr, userId]);
                const vipActive = user.vip_expire_time && new Date(user.vip_expire_time) > now;
                if (vipActive) {
                    const newVip = new Date(new Date(user.vip_expire_time).getTime() + (durationDays || 7) * 86400000);
                    const vipStr = newVip.toISOString().slice(0, 19).replace('T', ' ');
                    await db.query(`UPDATE users SET vip_expire_time = ? WHERE id = ?`, [vipStr, userId]);
                }
            } else {
                const baseVip = user.vip_expire_time && new Date(user.vip_expire_time) > now ? new Date(user.vip_expire_time) : now;
                const newVip = new Date(baseVip.getTime() + (durationDays || 7) * 86400000);
                const vipStr = newVip.toISOString().slice(0, 19).replace('T', ' ');
                const newLevel = Math.max(normalizeLevel(user.vip_level || 0), 1);
                await db.query(`UPDATE users SET vip_expire_time = ?, vip_level = ? WHERE id = ?`, [vipStr, newLevel, userId]);
            }
        } else if (effectType === 'ai_quota') {
            const inc = Number(effectValue.amount || 0);
            const fieldRaw = String(effectValue.field || 'ai_quota');
            const f = fieldRaw.toLowerCase();
            if (inc > 0) {
                const colName = f.includes('daily') ? 'ai_daily_quota' : 'ai_quota';
                const [[col]] = await db.query("SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?", [colName]);
                if (Number(col?.cnt || 0) === 0) {
                    await db.query(`ALTER TABLE users ADD COLUMN ${colName} INT NOT NULL DEFAULT 0`);
                }
                const [[cur]] = await db.query(`SELECT ${colName} AS v FROM users WHERE id = ?`, [userId]);
                const current = Number(cur?.v || 0);
                if (!f.includes('daily') && current + inc > 50) {
                    return res.status(400).json({ success: false, message: 'AI额度已达上限50，无法继续购买' });
                }
                await db.query(`UPDATE users SET ${colName} = ${colName} + ? WHERE id = ?`, [inc, userId]);
            }
        } else if (effectType === 'ai_boost') {
            const days = durationDays > 0 ? durationDays : Number(effectValue.days || 1);
            if (days > 0) {
                await db.query(`UPDATE users SET ai_speed_boost_days = ai_speed_boost_days + ? WHERE id = ?`, [days, userId]);
            }
        } else if (effectType === 'deposit_free_once') {
            const times = Number(effectValue.times || 1);
            const [[col]] = await db.query("SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deposit_free_times'");
            if (Number(col?.cnt || 0) === 0) {
                await db.query("ALTER TABLE users ADD COLUMN deposit_free_times INT NOT NULL DEFAULT 0");
            }
            await db.query(`UPDATE users SET deposit_free_times = deposit_free_times + ? WHERE id = ?`, [times, userId]);
        } else if (effectType === 'remove_ad') {
            await db.query(`UPDATE users SET free_counts = free_counts + 1 WHERE id = ?`, [userId]);
        }

        // ✅ 推送通知
        await db.query(
            `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'shop', ?, ?)`,
            [
                userId,
                '🎉 商品兑换成功',
                `你已成功购买「${item.name}」，效果已生效，感谢支持！`
            ]
        );

        console.log("✅ 虚拟商品支付完成：", outTradeNo);
        res.status(200).json({ code: 'SUCCESS', message: 'OK' });
    } catch (err) {
        console.error("❌ 支付回调处理失败（虚拟商品）:", err);
        res.status(500).json({ code: 'FAIL', message: '处理失败' });
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

module.exports = router;