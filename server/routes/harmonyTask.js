const express = require("express");
const router = express.Router();
const db = require("../config/db");
const dayjs = require("dayjs");
const authMiddleware = require("./authMiddleware");

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

  const isSecondHand = category === '二手交易';
  if (isSecondHand) {
    if (!employer_id || !school_id || !category || !position || !title || !offer || !detail || !publish_method || !mode) {
      return res.status(400).json({ success: false, message: "缺少必要参数(二手交易)" });
    }
  } else {
    if (!employer_id || !school_id || !category || !position || !address || !DDL || !title || !offer || !detail || !publish_method || !mode) {
      return res.status(400).json({ success: false, message: "缺少必要参数" });
    }
  }

  try {
    const commission = Math.max(Math.floor(offer * 0.02), 1);

    let status = 0;
    if (mode === 'fixed') {
      status = -1;
    } else if (mode === 'bidding') {
      status = 0;
    }

    const insertSQL = `
      INSERT INTO tasks (
        employer_id, employee_id, category, status,
        position, address, DDL, title, offer, detail,
        takeaway_code, takeaway_tel, takeaway_name,
        commission, school_id, mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const ddlValue = isSecondHand ? dayjs().add(30, 'day').format("YYYY-MM-DD HH:mm:ss") : dayjs(DDL).format("YYYY-MM-DD HH:mm:ss");
    const addrValue = isSecondHand ? '' : address;

    const values = [
      employer_id,
      null,
      category,
      status,
      position,
      addrValue,
      ddlValue,
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

    res.json({ success: true, message: "任务发布成功", task_id: result.insertId });
  } catch (err) {
    console.error("❌ Harmony 发布任务失败:", err);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = router;
