const express = require("express");
const router = express.Router();
const db = require("../config/db");


function weekHit(weeksStr, targetWeek) {
    if (!weeksStr) return false;
    const items = String(weeksStr).split(',').map(s => s.trim()).filter(Boolean);
    const w = Number(targetWeek);
    return items.some(seg => {
      if (seg.includes('-')) {
        const [a, b] = seg.split('-').map(x => parseInt(x.replace(/\D/g, ''), 10));
        if (Number.isFinite(a) && Number.isFinite(b)) return w >= a && w <= b;
        return false;
      }
      const one = parseInt(seg.replace(/\D/g, ''), 10);
      return Number.isFinite(one) && w === one;
    });
  }
  
// 获取某天的理论课程表
router.get("/daily", async (req, res) => {
    const {
        user_id,
        week,
        weekday,
        term
    } = req.query;
    if (!user_id || !week || !weekday) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        // term 为可选过滤
        const [rows] = await db.query(
            `
        SELECT id, course_name, teacher_name, class_period, location, weeks,
               time_start, time_end, term, created_at, updated_at
        FROM timetable_theory
        WHERE user_id = ? AND weekday = ?
              ${term ? 'AND term = ?' : ''}
        ORDER BY CAST(SUBSTRING_INDEX(class_period, '-', 1) AS UNSIGNED) ASC
        `,
            term ? [user_id, weekday, term] : [user_id, weekday]
        );

        const data = rows.filter(r => weekHit(r.weeks, week));
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("❌ 获取日课表失败:", error);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

// 获取用户的课表设置
router.get("/get-timetable-config", async (req, res) => {
    const {
        user_id
    } = req.query;

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 user_id"
        });
    }

    try {
        const [rows] = await db.query(
            "SELECT total_weeks, start_date, class_duration, period_1, period_2, period_3, period_4, period_5, period_6, period_7, period_8, period_9, period_10 FROM timetable_config WHERE user_id = ?",
            [user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "未找到用户设置"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("❌ 获取课表配置失败:", error);
        res.status(500).json({
            success: false,
            message: "服务器错误",
            error
        });
    }
});

// 获取某周的实践课信息
router.get("/practice", async (req, res) => {
    const {
        user_id,
        week,
        term
    } = req.query;
    if (!user_id || !week) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const [rows] = await db.query(
            `
        SELECT id, course_name, teacher_name, location, weeks,
               time_start, time_end, term, created_at, updated_at
        FROM timetable_practice
        WHERE user_id = ?
              ${term ? 'AND term = ?' : ''}
        `,
            term ? [user_id, term] : [user_id]
        );

        const matched = rows.filter(r => weekHit(r.weeks, week));
        res.json({
            success: true,
            has_practice: matched.length > 0,
            practice_info: matched
        });
    } catch (error) {
        console.error("❌ 获取实践课失败:", error);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.get("/course-detail", async (req, res) => {
    const {
        user_id,
        course_id
    } = req.query;
    if (!user_id || !course_id) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT id, user_id, course_id, course_name, teacher_name, weekday, class_period,
                location, weeks, time_start, time_end, term, created_at, updated_at
         FROM timetable_theory
         WHERE id = ? AND user_id = ?`,
            [course_id, user_id]
        );
        if (!rows.length) return res.status(404).json({
            success: false,
            message: "未找到课程"
        });
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error("❌ 获取课程详情失败:", error);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post("/update-course", async (req, res) => {
    const {
        user_id,
        id,
        course_name,
        teacher_name,
        time_start,
        time_end,
        location,
        weeks
    } = req.body;

    if (!user_id || !id) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        await db.query(
            "UPDATE timetable_theory SET course_name=?, teacher_name=?, time_start=?, time_end=?, location=?, weeks=? WHERE id=? AND user_id=?",
            [course_name, teacher_name, time_start, time_end, location, weeks, id, user_id]
          );

        res.json({
            success: true,
            message: "课程更新成功"
        });

    } catch (error) {
        console.error("❌ 更新课程失败:", error);
        res.status(500).json({
            success: false,
            message: "服务器错误",
            error
        });
    }
});

router.get("/weekly", async (req, res) => {
    const {
        user_id,
        week,
        term
    } = req.query;
    if (!user_id || !week) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const weeklyData = {
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
            7: []
        };

        const [theory] = await db.query(
            `
        SELECT id, course_name, teacher_name, class_period, location, weeks, weekday,
               time_start, time_end, term, created_at, updated_at
        FROM timetable_theory
        WHERE user_id = ?
              ${term ? 'AND term = ?' : ''}
        ORDER BY weekday ASC, CAST(SUBSTRING_INDEX(class_period, '-', 1) AS UNSIGNED) ASC
        `,
            term ? [user_id, term] : [user_id]
        );

        theory.filter(r => weekHit(r.weeks, week)).forEach(r => {
            if (weeklyData[r.weekday]) weeklyData[r.weekday].push(r);
        });

        const [practice] = await db.query(
            `
        SELECT id, course_name, teacher_name, location, weeks,
               time_start, time_end, term, created_at, updated_at
        FROM timetable_practice
        WHERE user_id = ?
              ${term ? 'AND term = ?' : ''}
        `,
            term ? [user_id, term] : [user_id]
        );

        const practiceThisWeek = practice.filter(r => weekHit(r.weeks, week));
        if (practiceThisWeek.length) {
            for (let d = 1; d <= 5; d++) {
                weeklyData[d].push(...practiceThisWeek.map(p => ({
                    ...p,
                    isPractice: true
                })));
            }
        }

        res.json({
            success: true,
            data: weeklyData
        });
    } catch (err) {
        console.error("❌ 获取周课表失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

module.exports = router;