async function addReputationLog(userId, changeType, delta, reason) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 写入日志
        await conn.query(
            `INSERT INTO reputation_logs (user_id, change_type, score_delta, reason, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
            [userId, changeType, delta, reason]
        );

        // 更新总信誉分
        await conn.query(
            `UPDATE user_reputation 
         SET total_score = GREATEST(0, total_score + ?)
         WHERE user_id = ?`,
            [delta, userId]
        );

        await conn.commit();
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