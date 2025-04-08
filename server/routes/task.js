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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            employer_id,
            null,
            category,
            0,
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


router.post('/confirm', async (req, res) => {
    const { taskId, userId } = req.body;
  
    if (!taskId || !userId) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
  
    try {
      const [[task]] = await db.query(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
      if (!task) {
        return res.status(404).json({ success: false, message: '任务不存在' });
      }
  
      let updateField = '';
      if (task.employer_id === userId) {
        updateField = 'employer_done';
      } else if (task.employee_id === userId) {
        updateField = 'employee_done';
      } else {
        return res.status(403).json({ success: false, message: '你不是该任务的雇主或雇员' });
      }
  
      // 更新“确认完成”字段
      await db.query(
        `UPDATE tasks SET ${updateField} = 1 WHERE id = ?`,
        [taskId]
      );
  
      // 重新查一遍，防止 race condition
      const [[updatedTask]] = await db.query(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
      if (updatedTask.employer_done && updatedTask.employee_done) {
        // ✅ 双方确认，准备打款
        const amount = parseInt(updatedTask.pay_amount * 100); // 单位：分
        const openid = (await db.query(`SELECT openid FROM users WHERE id = ?`, [updatedTask.employee_id]))[0][0]?.openid;
        const out_no = `RELEASE_${taskId}_${Date.now()}`;
  
        // ⚠️ TODO: 使用微信企业付款到零钱接口（需要商户证书）
        // 这里我们假设你封装了一个函数 payToUser(openid, amount, out_no)
  
        const payRes = await payToUser(openid, amount, out_no); // 💰 你自己封装这个
  
        if (payRes.success) {
          await db.query(`
            UPDATE tasks 
            SET status = 2,
                completed_time = NOW(),
                auto_release_time = NULL
            WHERE id = ?
          `, [taskId]);
  
          return res.json({ success: true, message: '双方已确认，任务完成并打款' });
        } else {
          return res.status(500).json({ success: false, message: '打款失败', error: payRes.error });
        }
      }
  
      res.json({ success: true, message: '确认完成已记录' });
  
    } catch (err) {
      console.error('❌ 确认完成失败:', err);
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  });

// ===== 3. 获得任务订单接口 =====
router.get("/my", async (req, res) => {
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
        SELECT id, employer_id, employee_id, status, title, offer, DDL
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


router.post("/done", async (req, res) => {
    const { taskId, userId, role } = req.body;
  
    if (!taskId || !userId || !role) {
      return res.status(400).json({ success: false, message: "参数不完整" });
    }
  
    let fieldToUpdate = role === "employer" ? "employer_done" : "employee_done";
  
    try {
      // 更新当前角色完成状态
      await db.query(`UPDATE tasks SET ${fieldToUpdate} = 1 WHERE id = ?`, [taskId]);
  
      // 查询双方完成状态
      const [rows] = await db.query(`SELECT employer_done, employee_done FROM tasks WHERE id = ?`, [taskId]);
      const task = rows[0];
  
      if (task.employer_done && task.employee_done) {
        // 双方都完成，设置任务为已完成
        await db.query(`UPDATE tasks SET status = 2, completed_time = NOW() WHERE id = ?`, [taskId]);
        // 你可以顺带调用微信打款 API 逻辑
      }
  
      res.json({ success: true, message: "已确认完成" });
    } catch (err) {
      console.error("❌ 确认完成失败:", err);
      res.status(500).json({ success: false, message: "服务器错误" });
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

// ===== 5. 指派任务接口 =====
router.post("/assign", async (req, res) => {
    const {
        taskId,
        receiverId
    } = req.body;

    if (!taskId || !receiverId) {
        return res.status(400).json({
            success: false,
            message: "缺少参数"
        });
    }

    try {
        const [task] = await db.query(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

        if (task.length === 0) {
            return res.status(404).json({
                success: false,
                message: "任务不存在"
            });
        }

        if (task[0].status !== 0) {
            return res.status(400).json({
                success: false,
                message: "任务已被指派或已完成"
            });
        }

        const [result] = await db.query(
            `UPDATE tasks SET employee_id = ?, status = 1 WHERE id = ?`,
            [receiverId, taskId]
        );

        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: "任务已成功指派"
            });
        } else {
            res.json({
                success: false,
                message: "更新失败"
            });
        }
    } catch (err) {
        console.error("❌ 指派任务失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器内部错误"
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

// ===== 8. 接单：更新状态为进行中 =====
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

// ===== 9. 获取任务详情 =====
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

module.exports = router;