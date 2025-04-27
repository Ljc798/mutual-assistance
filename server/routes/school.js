const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 你的 MySQL 连接池
const authMiddleware = require('./authMiddleware')

// ✅ 获取全部省份列表
router.get('/provinces', async (req, res) => {
    try {
        const [provinces] = await db.query(`SELECT DISTINCT province FROM schools ORDER BY province ASC`);
        res.json({
            success: true,
            provinces: provinces.map(item => item.province)
        });
    } catch (err) {
        console.error("❌ 获取省份失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ✅ 根据省份获取城市列表
router.get('/cities', async (req, res) => {
    const {
        province
    } = req.query;
    if (!province) {
        return res.status(400).json({
            success: false,
            message: "缺少 province 参数"
        });
    }

    try {
        const [cities] = await db.query(`SELECT DISTINCT city FROM schools WHERE province = ? ORDER BY city ASC`, [province]);
        res.json({
            success: true,
            cities: cities.map(item => item.city)
        });
    } catch (err) {
        console.error("❌ 获取城市失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ✅ 根据城市查询学校列表（分页支持）
router.get('/list', async (req, res) => {
    const {
        city,
        page = 1,
        pageSize = 20
    } = req.query;

    if (!city) {
        return res.status(400).json({
            success: false,
            message: "缺少 city 参数"
        });
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    try {
        const [schools] = await db.query(
            `SELECT id, name FROM schools WHERE city = ? ORDER BY name ASC LIMIT ?, ?`,
            [city, offset, parseInt(pageSize)]
        );

        res.json({
            success: true,
            schools
        });
    } catch (err) {
        console.error("❌ 获取学校列表失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// ✅ 根据关键字搜索学校（名字模糊查询）
router.get('/search', async (req, res) => {
    const {
        keyword
    } = req.query;
    if (!keyword) {
        return res.status(400).json({
            success: false,
            message: "缺少 keyword 参数"
        });
    }

    try {
        const [schools] = await db.query(
            `SELECT id, name, province, city FROM schools WHERE name LIKE ? ORDER BY name ASC`,
            [`%${keyword}%`]
        );

        res.json({
            success: true,
            schools
        });
    } catch (err) {
        console.error("❌ 搜索学校失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post('/school/feedback', authMiddleware, async (req, res) => {
    const {
        name,
        province,
        city
    } = req.body;
    if (!name || !province || !city) {
        return res.status(400).json({
            success: false,
            message: '缺少参数'
        });
    }

    try {
        await db.query(
            `INSERT INTO schools (name, province, city) VALUES (?, ?, ?)`,
            [name.trim(), province.trim(), city.trim()]
        );
        res.json({
            success: true,
            message: '添加成功'
        });
    } catch (err) {
        console.error('❌ 添加学校失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;