const db = require('../config/db')

async function addReputationLog(userId, changeType, delta, reason) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // ① 写入日志
        await conn.query(
            `INSERT INTO reputation_logs (user_id, change_type, score_delta, reason, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [userId, changeType, delta, reason]
        );

        // ② 查询当前信誉分与溢出分
        const [
            [reputation]
        ] = await conn.query(
            `SELECT total_score, IFNULL(overflow_points, 0) AS overflow_points 
             FROM user_reputation WHERE user_id = ? FOR UPDATE`,
            [userId]
        );

        if (!reputation) {
            throw new Error(`用户 ${userId} 的信誉记录不存在`);
        }

        // ③ 更新信誉分（限制在 0–100）
        let newScore = reputation.total_score + delta;
        let overflow = reputation.overflow_points;

        if (newScore > 100) {
            // 溢出部分加到 overflow_points（float）
            overflow += newScore - 100;
            newScore = 100;
        } else if (newScore < 0) {
            newScore = 0;
        }

        // ④ 检查是否达到 10 分门槛
        let convertCount = 0;
        if (overflow >= 10) {
            convertCount = Math.floor(overflow / 10); // 可兑换次数
            const convertPoints = convertCount * 50; // 每次兑换 50 积分

            // 更新用户积分
            await conn.query(
                `UPDATE users SET points = points + ? WHERE id = ?`,
                [convertPoints, userId]
            );

            // 扣除已兑换的溢出分
            overflow -= convertCount * 10;

            // 记录兑换日志（额外一条）
            await conn.query(
                `INSERT INTO reputation_logs (user_id, change_type, score_delta, reason, created_at)
                 VALUES (?, 'overflow_convert', 0, ?, NOW())`,
                [userId, `信誉分溢出${convertCount * 10}分，自动兑换${convertPoints}积分`]
            );

            console.log(`💰 用户#${userId} 溢出 ${convertCount * 10} 分 → 转换 ${convertPoints} 积分`);
        }

        // ⑤ 更新信誉表
        await conn.query(
            `UPDATE user_reputation 
             SET total_score = ?, overflow_points = ? 
             WHERE user_id = ?`,
            [newScore, overflow, userId]
        );

        await conn.commit();
        console.log(`⭐ 用户#${userId} 信誉变动 ${delta > 0 ? '+' : ''}${delta} → ${newScore} (${overflow.toFixed(2)} 溢出)`);
    } catch (err) {
        await conn.rollback();
        console.error("❌ 更新信誉失败:", err);
    } finally {
        conn.release();
    }
}


module.exports = {
    addReputationLog
};