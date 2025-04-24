const express = require("express");
const router = express.Router();
const db = require("../config/db");
const dayjs = require("dayjs");
const authMiddleware = require("./authMiddleware"); // 引入中间件
const {
    sendToUser
} = require("./ws-helper");

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
        publish_method // 'pay' | 'vip' | 'free'
    } = req.body;

    if (!employer_id || !category || !position || !address || !DDL || !title || !offer || !detail || !publish_method) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const commission = Math.max(Math.floor(offer * 0.02), 1); // 🧮 2% 向下取整，单位是分
        const [
            [user]
        ] = await db.query(`SELECT * FROM users WHERE id = ?`, [employer_id]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "用户不存在"
            });
        }

        let status = 0;

        if (publish_method === "vip") {
            const now = new Date();
            const vipTime = user.vip_expire_time ? new Date(user.vip_expire_time) : null;
            if (!vipTime || vipTime < now) {
                return res.status(400).json({
                    success: false,
                    message: "VIP未生效，无法免费发布"
                });
            }
        } else if (publish_method === "free") {
            if (user.free_counts <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "免佣金次数不足"
                });
            }
            await db.query(`UPDATE users SET free_counts = free_counts - 1 WHERE id = ?`, [employer_id]);
        } else if (publish_method === "pay") {
            // 👉 需要支付，先创建任务为未支付状态
            status = -1;
        } else {
            return res.status(400).json({
                success: false,
                message: "无效的发布方式"
            });
        }

        const insertSQL = `
            INSERT INTO tasks (
                employer_id, employee_id, category, status,
                position, address, DDL, title, offer, detail,
                takeaway_code, takeaway_tel, takeaway_name,
                commission
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            employer_id,
            null,
            category,
            status,
            position,
            address,
            dayjs(DDL).format("YYYY-MM-DD HH:mm:ss"),
            title,
            offer,
            detail,
            takeaway_code || '',
            takeaway_tel || null,
            takeaway_name || '',
            commission
        ];

        const [result] = await db.query(insertSQL, values);

        // ✅ 如果是 vip / free，任务直接可见，发送通知
        if (status === 0) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [
                    employer_id,
                    '📢 任务发布成功',
                    `你发布的任务《${title}》已成功上线，等待他人接单～`
                ]
            );

            // ✅ WebSocket 实时推送
            sendToUser(employer_id, {
                type: 'notify',
                content: `📢 任务《${title}》已发布成功，正在等待接单！`,
                created_time: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: "任务发布成功",
            task_id: result.insertId
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
    let {
        category,
        page = 1,
        pageSize = 10
    } = req.query;

    category = decodeURIComponent(category || "全部");


    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let query = `SELECT * FROM tasks WHERE status >= 0`;
    const queryParams = [];

    if (category && category !== "全部") {
        query += " AND category = ?";
        queryParams.push(category);
    }

    query += " ORDER BY DDL DESC LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);


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

// ===== 3. 获得任务订单接口 =====
router.get("/my", authMiddleware, async (req, res) => {
    const {
        userId,
        role,
        status
    } = req.query;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "缺少 userId 参数"
        });
    }

    try {
        let baseSQL = `
        SELECT id, employer_id, employee_id, status, title, offer, DDL, employer_done, employee_done, pay_amount
        FROM tasks
        WHERE (employer_id = ? OR employee_id = ?)
      `;
        const params = [userId, userId];

        if (role === "employer") {
            baseSQL += " AND employer_id = ?";
            params.push(userId);
        } else if (role === "employee") {
            baseSQL += " AND employee_id = ?";
            params.push(userId);
        }

        if (status !== undefined) {
            baseSQL += " AND status = ?";
            params.push(Number(status));
        }

        baseSQL += " ORDER BY DDL DESC";

        const [rows] = await db.query(baseSQL, params);
        res.json({
            success: true,
            tasks: rows
        });

    } catch (err) {
        console.error("❌ 获取任务失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ===== 4. 编辑任务 =====
router.post("/update", authMiddleware, async (req, res) => {
    const {
        id,
        title,
        offer,
        detail,
        DDL,
        address,
        position,
        takeaway_name = '',
        takeaway_tel = null,
        takeaway_code = ''
    } = req.body;

    if (!id || !title || !offer || !detail || !DDL || !address || !position) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const sql = `
            UPDATE tasks
            SET 
                title = ?,
                offer = ?,
                detail = ?,
                DDL = ?,
                address = ?,
                position = ?,
                takeaway_name = ?,
                takeaway_tel = ?,
                takeaway_code = ?
            WHERE id = ?
        `;

        const values = [
            title,
            offer,
            detail,
            dayjs(DDL).format("YYYY-MM-DD HH:mm:ss"),
            address,
            position,
            takeaway_name,
            takeaway_tel,
            takeaway_code,
            id
        ];

        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "任务不存在或未修改"
            });
        }

        res.json({
            success: true,
            message: "任务修改成功"
        });

    } catch (err) {
        console.error("❌ 编辑任务失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.get("/search", async (req, res) => {
    const keyword = req.query.q;

    if (!keyword || keyword.trim() === "") {
        return res.json({
            success: true,
            tasks: []
        }); // 没关键词就返回空
    }

    try {
        const [tasks] = await db.query(
            `SELECT * FROM tasks 
         WHERE title LIKE ? OR detail LIKE ?
         ORDER BY created_time DESC
         LIMIT 30`,
            [`%${keyword}%`, `%${keyword}%`]
        );

        res.json({
            success: true,
            tasks
        });
    } catch (err) {
        console.error("❌ 搜索失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ===== 6. 投标 =====
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

        // 🔔 发通知给雇主
        const [
            [task]
        ] = await db.query(`SELECT title, employer_id FROM tasks WHERE id = ?`, [task_id]);
        if (task?.employer_id && task.employer_id !== user_id) {
            const [
                [bidder]
            ] = await db.query(`SELECT username FROM users WHERE id = ?`, [user_id]);
            const bidderName = bidder?.username || '有人';
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [
                    task.employer_id,
                    '📬 有人投标你的任务',
                    `${bidder?.username || '有人'}对《${task.title}》提交了投标，请尽快查看。`
                ]
            );

            // ✅ 日志：即将推送 WebSocket
            console.log(`📡 推送 WebSocket 通知给用户 ${task.employer_id}`);

            const notifySent = sendToUser(task.employer_id, {
                type: 'notify',
                content: `📬 ${bidderName}刚刚投标了你的任务《${task.title}》，请尽快查看~`,
                created_time: new Date().toISOString()
            });

            // ✅ 日志：推送是否成功
            console.log(`✅ 推送状态: ${notifySent ? '成功 ✅' : '失败 ❌（用户未在线）'}`);
        }
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

// ===== 7. 获取投标记录 =====
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

// ===== 9. 获取任务详情 =====
router.get("/:id", async (req, res) => {
    const taskId = req.params.id;

    try {
        const [results] = await db.query(`
            SELECT 
                t.*, 
                u.username AS employer_name 
            FROM 
                tasks t
            LEFT JOIN 
                users u 
            ON 
                t.employer_id = u.id
            WHERE 
                t.id = ?
        `, [taskId]);

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

// ===== 10. 双方确认完成接口 =====
router.post("/:id/confirm-done", authMiddleware, async (req, res) => {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(taskId)) {
        return res.status(400).json({
            success: false,
            message: "任务 ID 非法"
        });
    }

    try {
        const [
            [task]
        ] = await db.query("SELECT * FROM tasks WHERE id = ?", [taskId]);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "任务不存在"
            });
        }

        if (task.status !== 1) {
            return res.status(400).json({
                success: false,
                message: "任务不是进行中，无法确认完成"
            });
        }

        let fieldToUpdate = null;
        let targetId = null;
        let role = '';

        if (task.employer_id === userId) {
            fieldToUpdate = "employer_done";
            targetId = task.employee_id;
            role = '雇主';
        } else if (task.employee_id === userId) {
            fieldToUpdate = "employee_done";
            targetId = task.employer_id;
            role = '接单者';
        } else {
            return res.status(403).json({
                success: false,
                message: "你不是该任务的参与者"
            });
        }

        // ✅ 更新自己已完成状态
        await db.query(`UPDATE tasks SET ${fieldToUpdate} = 1 WHERE id = ?`, [taskId]);

        if (!(
                (fieldToUpdate === "employer_done" && task.employee_done === 1) ||
                (fieldToUpdate === "employee_done" && task.employer_done === 1)
            )) {
            // ✅ 第一个确认方发通知
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [
                    userId,
                    '✅ 你已确认完成任务',
                    `你已确认任务《${task.title}》完成，等待对方确认。`
                ]
            );

            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [
                    targetId,
                    `📩 ${role}已确认任务完成`,
                    `任务《${task.title}》对方已确认完成，请尽快确认。`
                ]
            );

            sendToUser(targetId, {
                type: 'notify',
                content: `📩 ${role}已确认任务《${task.title}》完成，请你也尽快确认`,
                created_time: new Date().toISOString()
            });
        }

        // ✅ 如果双方都已确认
        const bothConfirmed =
            (fieldToUpdate === "employer_done" && task.employee_done === 1) ||
            (fieldToUpdate === "employee_done" && task.employer_done === 1);

        if (bothConfirmed) {
            await db.query(`
                  UPDATE tasks SET status = 2, completed_time = NOW() WHERE id = ?
                `, [taskId]);

            await db.query(`
                  UPDATE users SET balance = balance + ? WHERE id = ?
                `, [task.pay_amount, task.employee_id]);

            // 发通知：任务完成，余额到账
            await db.query(`
                  INSERT INTO notifications (user_id, type, title, content) VALUES 
                  (?, 'task', '✅ 任务完成', '你参与的任务《${task.title}》已圆满完成，期待与您的下一次相遇 🎉'),
                  (?, 'task', '💰 打款通知', '任务《${task.title}》已完成，报酬 ¥${task.pay_amount} 已到账你的钱包')
                `, [task.employer_id, task.employee_id]);

            // ✅ 通知雇主任务完成
            sendToUser(task.employer_id, {
                type: 'notify',
                content: `✅ 任务《${task.title}》已圆满完成，感谢参与`,
                created_time: new Date().toISOString()
            });

            // ✅ 通知接单人打款到账
            sendToUser(task.employee_id, {
                type: 'notify',
                content: `💰 任务《${task.title}》已结单，报酬 ¥${task.pay_amount} 已到账钱包`,
                created_time: new Date().toISOString()
            });
        }

        return res.json({
            success: true,
            message: bothConfirmed ? "双方确认，任务完成，余额已到账" : "已确认，等待对方确认"
        });

    } catch (err) {
        console.error("❌ 确认完成失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

module.exports = router;