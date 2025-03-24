const express = require('express');
const db = require('../config/db');

const router = express.Router();

// ✅ 获取所有上架的商品
router.get('/items', (req, res) => {
  const sql = `SELECT id, name, type, cost, description, total, remaining, price, exchange_type FROM shop_items WHERE available = 1`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ 获取商城商品失败:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }

    res.json({
      success: true,
      items: results
    });
  });
});

module.exports = router;