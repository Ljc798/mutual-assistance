const express = require("express");
const router = express.Router();
const db = require("../config/db");
const dayjs = require("dayjs");
const authMiddleware = require("./authMiddleware"); // 引入中间件

// ===== 1. 发布任务 =====
router.post("/create", authMiddleware, async (req, res) => {
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
            message: "缺少必要参数"
        });
    }

    try {
        const insertSQL = `
      INSERT INTO tasks (
        employer_id, employee_id, category, status,
        position, address, DDL, title, offer, detail,
        takeaway_code, takeaway_tel, takeaway_name
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            employer_id,
            null,
            category,
            position,
            address,
            dayjs(DDL).format("YYYY-MM-DD HH:mm:ss"),
            title,
            offer,
            detail,
            takeaway_code || '',
            takeaway_tel || null,
            takeaway_name || ''
        ];

        const [result] = await db.query(insertSQL, values);

        res.json({
            success: true,
            message: "任务发布成功",
            task_id: result.insertId,
        });
    } catch (err) {
        console.error("❌ 发布任务失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ===== 2. 获取所有任务（支持分类） =====
router.get("/tasks", async (req, res) => {
    const category = req.query.category;
    let query = "SELECT * FROM tasks";
    let queryParams = [];

    if (category && category !== "全部") {
        query += " WHERE category = ?";
        queryParams.push(category);
    }

    query += " ORDER BY DDL DESC";

    try {
        const [results] = await db.query(query, queryParams);
        const formattedTasks = results.map(task => ({
            ...task,
            status: parseInt(task.status),
            offer: parseFloat(task.offer).toFixed(2),
        }));
        res.json(formattedTasks);
    } catch (err) {
        console.error("❌ 任务查询失败:", err);
        res.status(500).json({
            error: "数据库查询失败"
        });
    }
});

// ===== 3. 获取任务详情 =====
router.get("/:id", async (req, res) => {
    const taskId = req.params.id;

    try {
        const [results] = await db.query("SELECT * FROM tasks WHERE id = ?", [taskId]);

        if (results.length === 0) {
            return res.status(404).json({
                error: "任务不存在"
            });
        }

        const task = results[0];
        res.json({
            ...task,
            status: parseInt(task.status),
            offer: parseFloat(task.offer).toFixed(2),
        });
    } catch (err) {
        console.error("❌ 任务详情查询失败:", err);
        res.status(500).json({
            error: "数据库查询失败"
        });
    }
});

// ===== 4. 接单：更新状态为进行中 =====
router.post("/:id/accept", authMiddleware, async (req, res) => {
    const taskId = req.params.id;

    try {
        const [result] = await db.query("UPDATE tasks SET status = 1 WHERE id = ?", [taskId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "任务不存在"
            });
        }

        res.json({
            message: "任务已被接单",
            status: 1
        });
    } catch (err) {
        console.error("❌ 接单失败:", err);
        res.status(500).json({
            error: "接单失败"
        });
    }
});

// ===== 5. 投标 =====
router.post("/bid", authMiddleware, async (req, res) => {
    const {
        task_id,
        user_id,
        price,
        advantage,
        can_finish_time
    } = req.body;

    if (!task_id || !user_id || !price) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const sql = `INSERT INTO task_bids (task_id, user_id, price, advantage, status) VALUES (?, ?, ?, ?, 0)`;
        await db.query(sql, [task_id, user_id, price, advantage || '', can_finish_time]);
        res.json({
            success: true,
            message: "投标成功，等待雇主选择"
        });
    } catch (err) {
        console.error("❌ 投标失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ===== 6. 获取投标记录 =====
router.get("/:taskId/bids", async (req, res) => {
    const {
        taskId
    } = req.params;

    if (!taskId) {
        return res.status(400).json({
            success: false,
            message: "缺少 taskId 参数"
        });
    }

    try {
        const sql = `
      SELECT tb.id, tb.user_id, u.username, u.avatar_url, tb.price, tb.advantage
      FROM task_bids tb
      JOIN users u ON tb.user_id = u.id
      WHERE tb.task_id = ?
      ORDER BY tb.price ASC
    `;

        const [rows] = await db.query(sql, [taskId]);
        res.json({
            success: true,
            bids: rows
        });
    } catch (err) {
        console.error("❌ 获取投标记录失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ===== 7. 雇主指派接单人 =====
router.post("/assign", authMiddleware, async (req, res) => {
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
        const [
            [task]
        ] = await db.query("SELECT * FROM tasks WHERE id = ?", [task_id]);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "任务不存在"
            });
        }

        if (task.employer_id !== employer_id) {
            return res.status(403).json({
                success: false,
                message: "无权操作该任务"
            });
        }

        if (task.status !== 0) {
            return res.status(400).json({
                success: false,
                message: "任务已被接单，无法修改"
            });
        }

        const [bids] = await db.query(
            "SELECT * FROM task_bids WHERE task_id = ? AND user_id = ?",
            [task_id, employee_id]
        );

        if (bids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "该用户未留言，无法指派"
            });
        }

        await db.query(
            "UPDATE tasks SET employee_id = ?, status = 1 WHERE id = ?",
            [employee_id, task_id]
        );

        res.json({
            success: true,
            message: "接单人指派成功"
        });
    } catch (err) {
        console.error("❌ 指派接单人失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

module.exports = router;