const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('./authMiddleware');

router.get('/list', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const status = req.query.status; // optional: 'done' / 'undone'
        let sql = `SELECT id, user_id, type, title, content, source_type, source_id, start_time, due_time, priority, remind_offset_minutes, is_done, deleted, created_at, updated_at
               FROM user_todos WHERE user_id = ? AND deleted = 0`;
        const params = [userId];
        if (status === 'done') {
            sql += ' AND is_done = 1';
        }
        if (status === 'undone') {
            sql += ' AND is_done = 0';
        }
        sql += ' ORDER BY (is_done = 1), COALESCE(due_time, created_at) ASC, priority DESC, id DESC';
        const [rows] = await db.query(sql, params);
        res.json({
            success: true,
            todos: rows
        });
    } catch (err) {
        console.error('❌ 获取待办列表失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.post('/create', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            type = 'personal', title, content = '', source_type = 'none', source_id = null, start_time = null, due_time = null, priority = 0, remind_offset_minutes = null
        } = req.body || {};
        if (!title) return res.status(400).json({
            success: false,
            message: '缺少标题'
        });

        const [result] = await db.query(
            `INSERT INTO user_todos (user_id, type, title, content, source_type, source_id, start_time, due_time, priority, remind_offset_minutes, is_done, deleted, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())`,
            [userId, type, title, content, source_type, source_id, start_time, due_time, priority, remind_offset_minutes]
        );
        const id = result.insertId;
        const [
            [row]
        ] = await db.query(`SELECT * FROM user_todos WHERE id = ?`, [id]);
        res.json({
            success: true,
            todo: row
        });
    } catch (err) {
        console.error('❌ 创建待办失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.post('/:id/complete', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.id;
        if (isNaN(id)) return res.status(400).json({
            success: false,
            message: '参数错误'
        });
        await db.query(`UPDATE user_todos SET is_done = 1, updated_at = NOW() WHERE id = ? AND user_id = ? AND deleted = 0`, [id, userId]);
        res.json({
            success: true
        });
    } catch (err) {
        console.error('❌ 完成待办失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.id;
        if (isNaN(id)) return res.status(400).json({
            success: false,
            message: '参数错误'
        });
        await db.query(`UPDATE user_todos SET deleted = 1, updated_at = NOW() WHERE id = ? AND user_id = ?`, [id, userId]);
        res.json({
            success: true
        });
    } catch (err) {
        console.error('❌ 删除待办失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.post('/:id/update', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.id;
        if (isNaN(id)) return res.status(400).json({
            success: false,
            message: '参数错误'
        });
        const {
            title,
            content,
            start_time,
            due_time,
            priority,
            remind_offset_minutes,
            is_done
        } = req.body || {};
        const sets = [];
        const params = [];
        if (title !== undefined) {
            sets.push('title = ?');
            params.push(title);
        }
        if (content !== undefined) {
            sets.push('content = ?');
            params.push(content);
        }
        if (start_time !== undefined) {
            sets.push('start_time = ?');
            params.push(start_time);
        }
        if (due_time !== undefined) {
            sets.push('due_time = ?');
            params.push(due_time);
        }
        if (priority !== undefined) {
            sets.push('priority = ?');
            params.push(priority);
        }
        if (remind_offset_minutes !== undefined) {
            sets.push('remind_offset_minutes = ?');
            params.push(remind_offset_minutes);
        }
        if (is_done !== undefined) {
            sets.push('is_done = ?');
            params.push(is_done ? 1 : 0);
        }
        if (sets.length === 0) return res.status(400).json({
            success: false,
            message: '无更新字段'
        });
        const sql = `UPDATE user_todos SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ? AND deleted = 0`;
        params.push(id, userId);
        await db.query(sql, params);
        const [
            [row]
        ] = await db.query('SELECT * FROM user_todos WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({
            success: true,
            todo: row
        });
    } catch (err) {
        console.error('❌ 更新待办失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;