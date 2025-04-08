const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 请根据你的项目路径调整
const authMiddleware = require('./authMiddleware'); // 请确保你有这个登录校验中间件

// 提现申请接口
router.post('/withdraw', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const {
        amount,
        method,
        phone
    } = req.body;

    // 参数校验
    if (!amount || !method || !phone) {
        return res.status(400).json({
            success: false,
            message: '参数不完整'
        });
    }

    if (!['微信', '支付宝'].includes(method)) {
        return res.status(400).json({
            success: false,
            message: '提现方式无效'
        });
    }

    const amountFen = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountFen) || amountFen <= 0) {
        return res.status(400).json({
            success: false,
            message: '提现金额非法'
        });
    }

    // 查用户余额
    const [
        [user]
    ] = await db.query('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user) {
        return res.status(400).json({
            success: false,
            message: '用户不存在'
        });
    }

    const balanceFen = Math.round(parseFloat(user.balance) * 100);
    if (amountFen > balanceFen) {
        return res.status(400).json({
            success: false,
            message: '余额不足'
        });
    }

    // 插入提现记录
    await db.query(
        `INSERT INTO withdrawals (user_id, amount, method, phone) VALUES (?, ?, ?, ?)`,
        [userId, (amountFen / 100).toFixed(2), method, phone]
    );

    // 更新用户余额（扣款）
    await db.query(
        `UPDATE users SET balance = balance - ? WHERE id = ?`,
        [(amountFen / 100).toFixed(2), userId]
    );

    return res.json({
        success: true,
        message: '提现申请已提交，预计 2 个工作日内到账'
    });
});

module.exports = router;