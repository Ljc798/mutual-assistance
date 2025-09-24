const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // mysql2/promise pool

// --- 安全检查：只允许 SELECT ---
function isSafeSelect(sql) {
  if (!sql || typeof sql !== 'string') return false;
  const s = sql.trim().toLowerCase();
  if (!s.startsWith('select')) return false;

  const forbidden = [
    'insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create',
    'grant', 'revoke', 'replace', 'into outfile', 'load data', '--', '/*', '*/'
  ];
  return !forbidden.some(k => s.includes(k));
}

// 兜底：把 “FIND_IN_SET(4 weeks)” / “FIND_IN_SET(4)” 修成 “FIND_IN_SET(4, weeks)”
function fixFindInSet(sql) {
    if (!sql) return '';
    let t = String(sql);
    // 把遗漏逗号/字段的情况修掉
    t = t.replace(/FIND_IN_SET\s*\(\s*([0-9]+)\s*(?:,\s*weeks)?\s*\)/gi, 'FIND_IN_SET($1, weeks)');
    // 把多余第三个参数修掉
    t = t.replace(/FIND_IN_SET\s*\(\s*([^,()]+)\s*,\s*weeks\s*,\s*weeks\s*\)/gi, 'FIND_IN_SET($1, weeks)');
    return t;
  }

/**
 * POST /api/ai/timetable/query
 * body: { practice_sql: "...", theory_sql: "..." }
 * 返回: { practice: [...], theory: [...] }
 */
router.post('/query', async (req, res) => {
  try {
    const { practice_sql, theory_sql } = req.body || {};
    if (!practice_sql || !theory_sql) {
      return res.status(400).json({ message: 'practice_sql 和 theory_sql 都是必填的' });
    }

    console.log("1", practice_sql);

    const psql = fixFindInSet(practice_sql);
    const tsql = fixFindInSet(theory_sql);
    console.log("2", practice_sql);

    if (!isSafeSelect(psql) || !isSafeSelect(tsql)) {
      return res.status(400).json({ message: '仅允许只读 SELECT 语句' });
    }

    // 并行执行
    const [[practiceRows], [theoryRows]] = await Promise.all([
      db.query(psql),
      db.query(tsql),
    ]);

    res.json({ practice: practiceRows, theory: theoryRows });
  } catch (err) {
    console.error('❌ Timetable AI query error:', err);
    res.status(500).json({ message: 'Query failed', error: String(err?.message || err) });
  }
});

module.exports = router;