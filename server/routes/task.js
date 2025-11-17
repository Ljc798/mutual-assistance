const express = require("express");
const router = express.Router();
const db = require("../config/db");
const dayjs = require("dayjs");
const authMiddleware = require("./authMiddleware"); // 引入中间件
const {
    addReputationLog
} = require("../utils/reputation");
const {
    sendToUser
} = require("./ws-helper");
const {
    sendTaskBidNotify,
    sendOrderStatusNotify,
    sendTaskStatusNotify
} = require("../utils/wechat");

// ===== 1. 发布任务 =====
router.post("/create", authMiddleware, async (req, res) => {
    const {
        employer_id,
        school_id,
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
        publish_method, 
        mode
    } = req.body;

    if (!employer_id || !school_id || !category || !position || !address || !DDL || !title || !offer || !detail || !publish_method || !mode) {
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
                commission, school_id, mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            commission,
            school_id,
            mode
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
        pageSize = 10,
        school_id,
        status // 'all' | 0 | 1 | 2
    } = req.query;

    category = decodeURIComponent(category || "全部");
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let query = `SELECT * FROM tasks WHERE status >= 0`;
    const queryParams = [];

    // 状态筛选
    const parsedStatus = Number(status);
    const hasStatusFilter = status !== undefined && status !== '' && !Number.isNaN(parsedStatus);
    if (hasStatusFilter && [0, 1, 2].includes(parsedStatus)) {
        query += " AND status = ?";
        queryParams.push(parsedStatus);
    }

    if (category && category !== "全部") {
        query += " AND category = ?";
        queryParams.push(category);
    }

    if (school_id) {
        query += " AND school_id = ?";
        queryParams.push(school_id);
    }

    // ------------------ 排序规则 ------------------
    if (hasStatusFilter) {
        // 单一状态：待接单(0) 用 ASC，其它(1/2) 用 DESC
        if (parsedStatus === 0) {
            query += " ORDER BY DDL ASC, id DESC";
        } else {
            query += " ORDER BY DDL DESC, id DESC";
        }
    } else {
        // 全部：先按状态优先级 0→1→2，
        // 然后 0 用 DDL ASC，1/2 用 DDL DESC
        // 说明：
        // - FIELD(status,0,1,2) 定义状态优先级
        // - CASE WHEN 的 NULL 在 ASC 时会排前，在 DESC 时会排后；这里搭配两条保证各自只影响本状态
        query += `
        ORDER BY 
          FIELD(status, 0, 1, 2) ASC,                     -- 状态优先级：待接单→进行中→已完成
          CASE WHEN status = 0 THEN DDL END ASC,          -- 待接单：紧急优先（DDL 越小越前）
          CASE WHEN status IN (1,2) THEN DDL END DESC,    -- 进行中/已完成：时间越近的排后（新近的在前）
          id DESC                                         -- 稳定排序，避免顺序抖动
      `;
    }
    // ------------------------------------------------

    query += " LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    try {
        const [results] = await db.query(query, queryParams);

        const formattedTasks = results.map(task => ({
            ...task,
            status: parseInt(task.status),
            offer: task.offer != null ? parseFloat(task.offer).toFixed(2) : "0.00",
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
    const school_id = req.query.school_id; // 👈 接收school_id

    if (!keyword || keyword.trim() === "") {
        return res.json({
            success: true,
            tasks: []
        });
    }

    try {
        let sql = `
            SELECT * FROM tasks 
            WHERE (title LIKE ? OR detail LIKE ?)
        `;
        const params = [`%${keyword}%`, `%${keyword}%`];

        if (school_id) {
            sql += ` AND school_id = ?`; // 👈 加筛选
            params.push(school_id);
        }

        sql += ` ORDER BY created_time DESC LIMIT 30`;

        const [tasks] = await db.query(sql, params);

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
        advantage
    } = req.body;

    if (!task_id || !user_id || !price) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        // 1) 先写入出价（只这一件事是阻塞的）
        await db.query(
            `INSERT INTO task_bids (task_id, user_id, price, advantage, status)
         VALUES (?, ?, ?, ?, 0)`,
            [task_id, user_id, price, advantage || ""]
        );

        // 2) 立刻返回给前端（体感立刻成功）
        res.json({
            success: true,
            message: "投标成功，等待雇主选择"
        });

        // 3) 后续重活异步做：不阻塞 HTTP
        setImmediate(async () => {
            try {
                // 合并查询：任务标题、雇主 id/openid、投标人昵称
                const [rows] = await db.query(
                    `
            SELECT t.id AS task_id, t.title, t.employer_id,
                   ue.openid AS employer_openid,
                   ub.username AS bidder_name
            FROM tasks t
            LEFT JOIN users ue ON ue.id = t.employer_id
            LEFT JOIN users ub ON ub.id = ?
            WHERE t.id = ?
            LIMIT 1
          `,
                    [user_id, task_id]
                );

                const row = rows && rows[0];
                if (!row) return;

                // 自己给自己投标就不提醒
                if (!row.employer_id || row.employer_id === user_id) return;

                const bidderName = row.bidder_name || "有人";

                // 站内通知（雇主）
                await db.query(
                    `INSERT INTO notifications (user_id, type, title, content)
             VALUES (?, 'task', ?, ?)`,
                    [
                        row.employer_id,
                        "📬 有人投标你的任务",
                        `${bidderName}对《${row.title}》提交了投标，请尽快查看。`,
                    ]
                );

                // WebSocket（雇主在线才有）
                try {
                    const ok = sendToUser(row.employer_id, {
                        type: "notify",
                        content: `📬 ${bidderName}刚刚投标了你的任务《${row.title}》，请尽快查看~`,
                        created_time: new Date().toISOString(),
                    });
                    console.log(`[bid] WS 推送给 ${row.employer_id}：${ok ? "成功" : "未在线"}`);
                } catch (e) {
                    console.warn("[bid] WS 推送失败：", e?.message || e);
                }

                // 订阅消息（雇主曾授权才会成功；失败不抛错）
                if (row.employer_openid) {
                    sendTaskBidNotify({
                        openid: row.employer_openid,
                        taskName: row.title,
                        bidder: bidderName,
                        price,
                        remark: advantage || "—",
                        taskId: row.task_id,
                    }).catch((e) => {
                        console.warn(
                            "[bid] 订阅消息失败：",
                            e?.response?.data || e?.message || e
                        );
                    });
                }
            } catch (e) {
                console.error("[bid] 异步处理失败：", e);
            }
        });
    } catch (err) {
        console.error("❌ 投标失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post("/bid/cancel", authMiddleware, async (req, res) => {
    const {
        bid_id,
        user_id
    } = req.body;

    if (!bid_id || !user_id) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        // 查询出价记录
        const [
            [bid]
        ] = await db.query(`SELECT * FROM task_bids WHERE id = ?`, [bid_id]);

        if (!bid) {
            return res.status(404).json({
                success: false,
                message: "出价记录不存在"
            });
        }

        // 校验是不是自己取消自己的
        if (bid.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: "无权限取消该出价"
            });
        }

        // 查询任务雇主
        const [
            [task]
        ] = await db.query(`SELECT id, title, employer_id FROM tasks WHERE id = ?`, [bid.task_id]);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "任务不存在"
            });
        }

        // 删除出价记录
        await db.query(`DELETE FROM task_bids WHERE id = ?`, [bid_id]);

        // 给雇主发通知
        if (task.employer_id) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)`,
                [
                    task.employer_id,
                    '出价撤回通知',
                    `有投标人撤回了对任务《${task.title}》的出价，请注意。`
                ]
            );

            // ✅ WebSocket实时推送（如果你集成了推送）
            sendToUser(task.employer_id, {
                type: 'notify',
                content: `⚡ 有人撤回了任务《${task.title}》的出价，请注意哦～`,
                created_time: new Date().toISOString()
            });

            console.log(`📡 通知推送给雇主ID：${task.employer_id}`);
        }

        try {
            const [
                [emp]
            ] = await db.query(
                `SELECT openid FROM users WHERE id = ?`,
                [task.employer_id]
            );

            if (emp?.openid) {
                await sendTaskBidNotify({
                    openid: emp.openid,
                    taskName: task.title,
                    bidder: '投标人',
                    price: bid.price,
                    remark: '⚡ 该投标人已撤回出价',
                    taskId: task.id
                });
            }
        } catch (wxErr) {
            console.warn('❌ 撤回出价订阅消息失败:', wxErr?.message || wxErr);
        }

        return res.json({
            success: true,
            message: "出价已撤回"
        });
    } catch (err) {
        console.error("❌ 撤回出价失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// 查询本月取消次数
router.get('/cancel/count', async (req, res) => {
    const user_id = req.query.user_id;

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: '缺少 user_id'
        });
    }

    try {
        const firstDayOfMonth = dayjs().startOf('month').format('YYYY-MM-DD HH:mm:ss');
        const [result] = await db.query(
            `SELECT COUNT(*) as count FROM task_cancel_records WHERE user_id = ? AND cancel_time >= ?`,
            [user_id, firstDayOfMonth]
        );

        const cancelCount = result[0].count || 0;
        const freeCancelCount = Math.max(3 - cancelCount, 0);

        res.json({
            success: true,
            freeCancelCount: freeCancelCount
        });
    } catch (err) {
        console.error('❌ 查询取消次数失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.post('/cancel', async (req, res) => {
    const {
        task_id,
        user_id,
        role,
        cancel_reason
    } = req.body;

    if (!task_id || !user_id || !role || !cancel_reason) {
        return res.status(400).json({
            success: false,
            message: '缺少参数'
        });
    }

    try {
        // 查询任务信息
        const [taskResult] = await db.query(
            'SELECT * FROM tasks WHERE id = ?',
            [task_id]
        );

        if (taskResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: '任务不存在'
            });
        }

        const task = taskResult[0];

        if (task.status !== 1) {
            return res.status(400).json({
                success: false,
                message: '该任务无法取消'
            });
        }

        // 查询本月取消次数
        const firstDayOfMonth = dayjs().startOf('month').format('YYYY-MM-DD HH:mm:ss');
        const [cancelCountResult] = await db.query(
            `SELECT COUNT(*) as count FROM task_cancel_records 
         WHERE user_id = ? AND cancel_time >= ?`,
            [user_id, firstDayOfMonth]
        );
        const cancelCount = cancelCountResult[0].count || 0;

        // 超过次数要扣违约金
        const FREE_CANCEL_LIMIT = 3;
        const needPenalty = cancelCount >= FREE_CANCEL_LIMIT;

        // 计算违约金
        let penalty = 0;
        if (needPenalty) {
            penalty = Math.ceil(task.pay_amount * 0.1 * 100) / 100; // 向上取两位小数
        }

        const refundAmount = task.pay_amount - penalty;

        // 更新任务状态为已取消（-2）
        await db.query(
            `UPDATE tasks SET status = -2, cancel_reason = ?, cancel_by = ?, refunded = 1 WHERE id = ?`,
            [cancel_reason, role, task_id]
        );

        // 给取消人扣罚金 or 退款
        await db.query(
            `UPDATE users SET balance = balance + ? WHERE id = ?`,
            [refundAmount, user_id]
        );

        // 记录取消记录
        await db.query(
            `INSERT INTO task_cancel_records (user_id, role, task_id) VALUES (?, ?, ?)`,
            [user_id, role, task_id]
        );

        // 给另一个人发通知
        let receiverId = null;
        if (role === 'employer') {
            receiverId = task.employee_id;
        } else if (role === 'employee') {
            receiverId = task.employer_id;
        }

        if (receiverId) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', '任务取消通知', ?)`,
                [
                    receiverId,
                    `对方取消了任务《${task.title}》，取消原因："${cancel_reason}"`
                ]
            );

            // WebSocket 推送
            sendToUser(receiverId, {
                type: 'notify',
                content: `🔔 任务《${task.title}》被取消，原因："${cancel_reason}"`,
                created_time: new Date().toISOString()
            });
        }
        try {
            const [
                [recvUser]
            ] = await db.query(
                `SELECT openid FROM users WHERE id = ?`,
                [receiverId]
            );

            const orderNo = task_id;

            if (recvUser?.openid) {
                await sendOrderStatusNotify({
                    openid: recvUser.openid,
                    orderNo,
                    title: task.title,
                    status: '已取消',
                    time: dayjs().format('YYYY-MM-DD HH:mm'),
                    taskId: task_id
                });
            }
        } catch (wxErr) {
            // 忽略 43101 等错误，只打日志
            console.warn('❗取消任务-订阅消息发送失败：', wxErr?.message || wxErr);
        }

        try {
            await addReputationLog(
                user_id,
                "cancel_task",
                -3,
                `主动取消任务《${task.title}》，信誉-3`
            );

            await db.query(
                `UPDATE user_reputation
                 SET canceled_tasks = canceled_tasks + 1
                 WHERE user_id = ?`,
                [user_id]
            );
        } catch (repErr) {
            console.warn("⚠️ 扣信誉分失败（忽略不中断）:", repErr.message);
        }

        return res.json({
            success: true,
            message: `取消成功${needPenalty ? `，本次扣除违约金 ¥${penalty}` : ''}`,
            penalty: penalty
        });

    } catch (err) {
        console.error('❌ 取消任务失败:', err);
        return res.status(500).json({
            success: false,
            message: '服务器错误'
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
        if (!task) return res.status(404).json({
            success: false,
            message: "任务不存在"
        });
        if (task.status !== 1) return res.status(400).json({
            success: false,
            message: "任务不是进行中，无法确认完成"
        });

        // 判定角色 & 对方ID
        let fieldToUpdate = null,
            targetId = null,
            role = '';
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

        // 更新自己 DONE
        await db.query(`UPDATE tasks SET ${fieldToUpdate} = 1 WHERE id = ?`, [taskId]);

        // 第一个确认人 → 站内 & WS 提醒对方
        if (!((fieldToUpdate === "employer_done" && task.employee_done === 1) ||
                (fieldToUpdate === "employee_done" && task.employer_done === 1))) {

            await db.query(
                `INSERT INTO notifications (user_id, type, title, content)
           VALUES
           (?, 'task', '✅ 你已确认完成任务', ?),
           (?, 'task', ?, ?)`,
                [
                    userId, `你已确认任务《${task.title}》完成，等待对方确认。`,
                    targetId, `📩 ${role}已确认任务完成`, `任务《${task.title}》对方已确认完成，请尽快确认。`
                ]
            );

            sendToUser(targetId, {
                type: 'notify',
                content: `📩 ${role}已确认任务《${task.title}》完成，请你也尽快确认`,
                created_time: new Date().toISOString()
            });

            try {
                const [
                    [targetUser]
                ] = await db.query(`SELECT openid FROM users WHERE id = ?`, [targetId]);
                if (targetUser?.openid) {
                    await sendTaskStatusNotify({
                        openid: targetUser.openid,
                        orderNo: `TASK-${taskId}`,
                        amount: task.pay_amount,
                        finishedAt: new Date(),
                        taskType: '跑腿',
                        statusText: `对方已完成`
                    });
                }
            } catch (wxErr) {
                console.warn('⚠️ 订阅消息发送失败（忽略不中断）：', wxErr?.message || wxErr);
            }

            return res.json({
                success: true,
                message: "已确认，等待对方确认"
            });
        }

        // ✅ 双方都确认
        await db.query(`UPDATE tasks SET status = 2, completed_time = NOW() WHERE id = ?`, [taskId]);
        await db.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [task.pay_amount, task.employee_id]);

        await db.query(
            `INSERT INTO notifications (user_id, type, title, content) VALUES
         (?, 'task', '✅ 任务完成', '你参与的任务《${task.title}》已圆满完成，期待与您的下一次相遇 🎉'),
         (?, 'task', '💰 打款通知', '任务《${task.title}》已完成，报酬 ¥${task.pay_amount} 已到账你的钱包')`,
            [task.employer_id, task.employee_id]
        );

        try {
            await addReputationLog(
                task.employee_id,
                "complete_task",
                2,
                `完成任务《${task.title}》，信誉+2`
            );

            await db.query(
                `UPDATE user_reputation
                 SET completed_tasks = completed_tasks + 1
                 WHERE user_id = ?`,
                [task.employee_id]
            );
        } catch (repErr) {
            console.warn("⚠️ 更新信誉失败（忽略不中断）:", repErr.message);
        }

        sendToUser(task.employer_id, {
            type: 'notify',
            content: `✅ 任务《${task.title}》已圆满完成，感谢参与`,
            created_time: new Date().toISOString()
        });
        sendToUser(task.employee_id, {
            type: 'notify',
            content: `💰 任务《${task.title}》已结单，报酬¥${task.pay_amount}已到账钱包，信誉分+2`,
            created_time: new Date().toISOString()
        });

        // ==== 新增：订阅消息（双方确认后）====
        try {
            const [
                [empUser]
            ] = await db.query(`SELECT openid FROM users WHERE id = ?`, [task.employer_id]);
            const [
                [emplUser]
            ] = await db.query(`SELECT openid FROM users WHERE id = ?`, [task.employee_id]);

            const orderNo = `TASK-${taskId}`;
            const amount = task.pay_amount;
            const doneAt = new Date();

            if (empUser?.openid) {
                await sendTaskStatusNotify({
                    openid: empUser.openid,
                    orderNo,
                    amount,
                    finishedAt: doneAt,
                    taskType: '跑腿',
                    statusText: '任务已完成'
                });
            }

            if (emplUser?.openid) {
                await sendTaskStatusNotify({
                    openid: emplUser.openid,
                    orderNo,
                    amount,
                    finishedAt: doneAt,
                    taskType: '跑腿',
                    statusText: '报酬已入账'
                });
            }
        } catch (wxErr) {
            console.warn('⚠️ 订阅消息发送失败（忽略不中断）：', wxErr?.message || wxErr);
        }

        return res.json({
            success: true,
            message: "双方确认，任务完成，余额已到账"
        });
    } catch (err) {
        console.error("❌ 确认完成失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post("/:id/accept", authMiddleware, async (req, res) => {
    const taskId = parseInt(req.params.id);
    const employeeId = req.user.id;
    if (isNaN(taskId)) {
        return res.status(400).json({ success: false, message: "任务 ID 非法" });
    }
    try {
        const [[task]] = await db.query("SELECT id, status, mode, employer_id, title FROM tasks WHERE id = ?", [taskId]);
        if (!task) return res.status(404).json({ success: false, message: "任务不存在" });
        if (parseInt(task.status) !== 0) return res.status(400).json({ success: false, message: "任务当前不可接单" });
        if (task.mode !== 'fixed') return res.status(400).json({ success: false, message: "仅支持一口价任务接单" });

        await db.query("UPDATE tasks SET employee_id = ?, status = 1 WHERE id = ?", [employeeId, taskId]);

        const [[payment]] = await db.query(
            "SELECT id FROM task_payments WHERE task_id = ? AND out_trade_no LIKE ? ORDER BY id DESC LIMIT 1",
            [taskId, `TASK_${taskId}_FIXED_%`]
        );
        if (payment && payment.id) {
            await db.query("UPDATE task_payments SET receiver_id = ? WHERE id = ?", [employeeId, payment.id]);
        }

        await db.query(
            "INSERT INTO notifications (user_id, type, title, content) VALUES (?, 'task', ?, ?)",
            [task.employer_id, '📦 任务已被接单', `你的任务《${task.title}》已被接单，已进入进行中`]
        );

        return res.json({ success: true, message: "接单成功" });
    } catch (err) {
        console.error("❌ 接单失败:", err);
        return res.status(500).json({ success: false, message: "服务器错误" });
    }
});

module.exports = router;
