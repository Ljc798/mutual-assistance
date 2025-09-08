const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // 确保指向你已导出的 mysql2/promise db

// --- 简单的安全兜底：只允许只读 SELECT，避免误删表/写库 ---
function isSafeSelect(sql) {
  if (!sql || typeof sql !== 'string') return false;
  const s = sql.trim().toLowerCase();

  // 必须以 select 开头
  if (!s.startsWith('select')) return false;

  // 禁止这些危险关键字
  const forbidden = [
    'insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create',
    'grant', 'revoke', 'replace', 'into outfile', 'load data', '--', '/*', '*/'
  ];
  return !forbidden.some(k => s.includes(k));
}

// 没有 LIMIT 就加一个兜底
function ensureLimit(sql, max = 200) {
  return /\blimit\b/i.test(sql) ? sql : `${sql} LIMIT ${max}`;
}

// 兼容：有些 LLM 会在语句末尾带 ;，统一去掉末尾分号，避免多语句
function normalize(sql) {
  return sql.replace(/;+\s*$/g, '').trim();
}

/**
 * POST /api/ai/timetable/query
 * body: {
 *   practice_sql: "SELECT ...",
 *   theory_sql:   "SELECT ..."
 * }
 * 返回: { practice: [...], theory: [...] }
 */
router.post('/query', async (req, res) => {
  try {
    const { practice_sql, theory_sql } = req.body || {};

    if (!practice_sql || !theory_sql) {
      return res.status(400).json({ message: 'practice_sql 和 theory_sql 都是必填的' });
    }

    const psql = ensureLimit(normalize(practice_sql));
    const tsql = ensureLimit(normalize(theory_sql));

    if (!isSafeSelect(psql) || !isSafeSelect(tsql)) {
      return res.status(400).json({ message: '仅允许只读 SELECT 语句' });
    }

    // 并行执行两条查询
    const [[practiceRows], [theoryRows]] = await Promise.all([
      db.query(psql),
      db.query(tsql),
    ]);

    return res.json({
      practice: practiceRows,
      theory: theoryRows,
    });
  } catch (err) {
    console.error('❌ Timetable AI query error:', err);
    return res.status(500).json({ message: 'Query failed', error: String(err?.message || err) });
  }
});

module.exports = router;