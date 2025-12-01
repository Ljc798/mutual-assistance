const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const dayjs = require('dayjs');

router.get('/status', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '缺少 user_id 参数'
            });
        }

        // 查询用户 VIP 信息
        const [
            [user]
        ] = await db.query(
            `SELECT vip_level, vip_expire_time, svip_expire_time
       FROM users
       WHERE id = ? LIMIT 1`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const level = Number(user.vip_level || 0);

        // 计算剩余天数
        let daysLeft = 0;
        let validExpireTime = null;

        if (level === 1) {
            validExpireTime = user.vip_expire_time;
        } else if (level === 2) {
            validExpireTime = user.svip_expire_time;
        }

        if (validExpireTime) {
            const now = dayjs();
            const diff = dayjs(validExpireTime).diff(now, 'day');
            daysLeft = diff > 0 ? diff : 0;
        }

        return res.json({
            success: true,
            data: {
                vip_level: level,
                vip_expire_time: user.vip_expire_time,
                svip_expire_time: user.svip_expire_time,
                days_left: daysLeft
            }
        });

    } catch (err) {
        console.error('VIP 查询错误', err);
        return res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;