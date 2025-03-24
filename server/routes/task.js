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
    return res.status(400).json({ success: false, message: '缺少必要参数' });
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
    res.status(500).json({ success: false, message: '服务器错误' });
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
      return res.status(500).json({ error: '数据库查询失败' });
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
      return res.status(500).json({ error: '数据库查询失败' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
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
      return res.status(500).json({ error: '接单失败' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    res.json({ message: '任务已被接单', status: 1 });
  });
});

module.exports = router;