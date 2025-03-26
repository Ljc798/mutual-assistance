const express = require('express');
const db = require('../config/db');
const dayjs = require('dayjs');

const router = express.Router();

// ✅ 本模块用的 promise 包装（只用于发布接口）
function queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

//
// ===== 1. 发布任务 =====
//
router.post('/create', async (req, res) => {
    const {
        employer_id,
        category,
        position,
        address,
        DDL,
        title,
        offer,
        detail,
        takeaway_code,
        takeaway_tel,
        takeaway_name,
    } = req.body;

    if (!employer_id || !category || !position || !address || !DDL || !title || !offer || !detail) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }

    try {
        const insertSQL = `
      INSERT INTO tasks (
        employer_id, employee_id, category, status,
        position, address, DDL, title, offer, detail,
        takeaway_code, takeaway_tel, takeaway_name
      ) VALUES (?, NULL, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            employer_id,
            category,
            position,
            address,
            dayjs(DDL).format('YYYY-MM-DD HH:mm:ss'),
            title,
            offer,
            detail,
            takeaway_code || '',
            takeaway_tel || null,
            takeaway_name || ''
        ];

        const result = await queryAsync(insertSQL, values);

        res.json({
            success: true,
            message: '任务发布成功',
            task_id: result.insertId
        });
    } catch (err) {
        console.error('❌ 发布任务失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

//
// ===== 2. 获取所有任务（支持分类） =====
//
router.get('/tasks', (req, res) => {
    const category = req.query.category;
    let query = 'SELECT * FROM tasks';
    let queryParams = [];

    if (category && category !== '全部') {
        query += ' WHERE category = ?';
        queryParams.push(category);
    }

    query += ' ORDER BY DDL DESC';

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('❌ 任务查询失败:', err);
            return res.status(500).json({
                error: '数据库查询失败'
            });
        }

        const formattedTasks = results.map(task => ({
            ...task,
            status: parseInt(task.status),
            offer: parseFloat(task.offer).toFixed(2)
        }));

        res.json(formattedTasks);
    });
});

//
// ===== 3. 获取任务详情 =====
//
router.get('/:id', (req, res) => {
    const taskId = req.params.id;

    db.query('SELECT * FROM tasks WHERE id = ?', [taskId], (err, results) => {
        if (err) {
            console.error('❌ 任务详情查询失败:', err);
            return res.status(500).json({
                error: '数据库查询失败'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: '任务不存在'
            });
        }

        const task = results[0];

        res.json({
            ...task,
            status: parseInt(task.status),
            offer: parseFloat(task.offer).toFixed(2)
        });
    });
});

//
// ===== 4. 接单：更新状态为进行中 =====
//
router.post('/:id/accept', (req, res) => {
    const taskId = req.params.id;

    db.query('UPDATE tasks SET status = 1 WHERE id = ?', [taskId], (err, result) => {
        if (err) {
            console.error('❌ 接单失败:', err);
            return res.status(500).json({
                error: '接单失败'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: '任务不存在'
            });
        }

        res.json({
            message: '任务已被接单',
            status: 1
        });
    });
});

// POST /api/task/bid
router.post("/bid", async (req, res) => {
    const {
        task_id,
        user_id,
        price,
        advantage,
        can_finish_time
    } = req.body;

    // 参数校验
    if (!task_id || !user_id || !price) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const sql = `
        INSERT INTO task_bids (task_id, user_id, price, advantage, status)
        VALUES (?, ?, ?, ?, 0)
      `;

        await db.promise().query(sql, [
            task_id,
            user_id,
            price,
            advantage || '',
            can_finish_time
        ]);

        return res.json({
            success: true,
            message: "投标成功，等待雇主选择"
        });
    } catch (err) {
        console.error("❌ 投标失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// 修改为路径参数形式
router.get("/:taskId/bids", async (req, res) => {
    const { taskId } = req.params;

    if (!taskId) {
        return res.status(400).json({ success: false, message: "缺少 taskId 参数" });
    }

    try {
        const sql = `
        SELECT 
          tb.id,
          tb.user_id,
          u.username,
          u.avatar_url,
          tb.price,
          tb.advantage
        FROM task_bids tb
        JOIN users u ON tb.user_id = u.id
        WHERE tb.task_id = ?
        ORDER BY tb.price ASC
      `;

        const [rows] = await db.promise().query(sql, [taskId]);

        return res.json({ success: true, bids: rows });
    } catch (err) {
        console.error("❌ 获取投标记录失败:", err);
        return res.status(500).json({ success: false, message: "服务器错误" });
    }
});

router.post("/assign", async (req, res) => {
    const {
        task_id,
        employee_id,
        employer_id
    } = req.body;

    if (!task_id || !employee_id || !employer_id) {
        return res.status(400).json({
            success: false,
            message: "缺少参数"
        });
    }

    try {
        // 1. 查询任务
        const [tasks] = await db.promise().query("SELECT * FROM tasks WHERE id = ?", [task_id]);
        if (tasks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "任务不存在"
            });
        }

        const task = tasks[0];

        // 2. 校验权限
        if (task.employer_id !== employer_id) {
            return res.status(403).json({
                success: false,
                message: "无权操作该任务"
            });
        }

        // 3. 状态必须是待接单
        if (task.status !== 0) {
            return res.status(400).json({
                success: false,
                message: "任务已被接单，无法修改"
            });
        }

        // 4. 校验这个用户是否留言过（投过标）
        const [bids] = await db.promise().query(
            "SELECT * FROM task_bids WHERE task_id = ? AND user_id = ?",
            [task_id, employee_id]
        );

        if (bids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "该用户未留言，无法指派"
            });
        }

        // ✅ 5. 更新任务接单人
        await db.promise().query(
            "UPDATE tasks SET employee_id = ?, status = 1 WHERE id = ?",
            [employee_id, task_id]
        );

        return res.json({
            success: true,
            message: "接单人指派成功"
        });

    } catch (err) {
        console.error("❌ 指派接单人失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

module.exports = router;