const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 获取某天的理论课程表
router.get("/daily", async (req, res) => {
    const { user_id, week, weekday } = req.query;

    if (!user_id || !week || !weekday) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    try {
        // 获取所有可能包含该用户的课程
        const [courses] = await db.promise().query(
            `SELECT id, course_name, teacher_name, class_period, location, weeks
             FROM timetable_theory
             WHERE user_id = ? AND weekday = ?`,
            [user_id, weekday]
        );

        // 过滤符合当前 week 范围的课程
        const filteredCourses = courses.filter(course => {
            const weekRanges = course.weeks.split(",");  // 兼容 1-8,9-13 这种格式
            return weekRanges.some(range => {
                if (range.includes("-")) {
                    const [start, end] = range.split("-").map(Number);
                    return week >= start && week <= end;
                } else {
                    return Number(range) === Number(week);
                }
            });
        });

        res.json({ success: true, data: filteredCourses });

    } catch (error) {
        console.error("❌ 获取日课表失败:", error);
        res.status(500).json({ success: false, message: "服务器错误", error });
    }
});

// 获取用户的课表设置
router.get("/get-timetable-config", async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ success: false, message: "缺少 user_id" });
    }

    try {
        const [rows] = await db.promise().query(
            "SELECT total_weeks, start_date, class_duration, period_1, period_2, period_3, period_4, period_5, period_6, period_7, period_8, period_9, period_10 FROM timetable_config WHERE user_id = ?",
            [user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "未找到用户设置" });
        }

        res.json({ success: true, data: rows[0] });

    } catch (error) {
        console.error("❌ 获取课表配置失败:", error);
        res.status(500).json({ success: false, message: "服务器错误", error });
    }
});

// 获取某周的实践课信息
router.get("/practice", async (req, res) => {
    const { user_id, week } = req.query;

    if (!user_id || !week) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    try {
        // 查询该用户的所有实践课
        const [practiceCourses] = await db.promise().query(
            `SELECT course_name, teacher_name, weeks, location
             FROM timetable_practice
             WHERE user_id = ?`,
            [user_id]
        );

        // 过滤出符合 `week` 范围的课程
        const matchedPractices = practiceCourses.filter(course => {
        
            const weekRanges = course.weeks.split(",");  // 兼容 1-8,9-13 这种格式
            return weekRanges.some(range => {
                if (range.includes("-")) {
                    let [start, end] = range.split("-").map(w => parseInt(w.replace(/\D/g, "")));  // ✅ 先去掉 "周" 再转换
                    return week >= start && week <= end;  // ✅ 检查 week 是否在范围内
                } else {
                    let singleWeek = parseInt(range.replace(/\D/g, ""));  // ✅ 去掉 "周"
                    return Number(week) === singleWeek;
                }
            });
        });

        if (matchedPractices.length > 0) {
            res.json({ success: true, has_practice: true, practice_info: matchedPractices });
        } else {
            res.json({ success: true, has_practice: false });
        }

    } catch (error) {
        console.error("❌ 获取实践课失败:", error);
        res.status(500).json({ success: false, message: "服务器错误", error });
    }
});

router.get("/course-detail", async (req, res) => {
    const { user_id, course_id } = req.query;

    if (!user_id || !course_id) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM timetable_theory WHERE id = ? AND user_id = ?",
            [course_id, user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "未找到课程" });
        }

        res.json({ success: true, data: rows[0] });

    } catch (error) {
        console.error("❌ 获取课程详情失败:", error);
        res.status(500).json({ success: false, message: "服务器错误", error });
    }
});

router.post("/update-course", async (req, res) => {
    const { user_id, course_id, course_name, teacher_name, time_start, time_end, location, weeks } = req.body;

    if (!user_id || !course_id) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    try {
        await db.promise().query(
            "UPDATE timetable_theory SET course_name = ?, teacher_name = ?, time_start = ?, time_end = ?, location = ?, weeks = ? WHERE id = ? AND user_id = ?",
            [course_name, teacher_name, time_start, time_end, location, weeks, course_id, user_id]
        );

        res.json({ success: true, message: "课程更新成功" });

    } catch (error) {
        console.error("❌ 更新课程失败:", error);
        res.status(500).json({ success: false, message: "服务器错误", error });
    }
});

router.get("/weekly", async (req, res) => {
    const { user_id, week } = req.query;

    if (!user_id || !week) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    try {
        // 初始化每天的课程结构 1 ~ 7（周一 ~ 周日）
        const weeklyData = {
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
            7: []
        };

        // 获取该用户本周所有理论课（包含所有 weekday）
        const [theoryCourses] = await db.promise().query(
            `SELECT id, course_name, teacher_name, class_period, location, weeks, weekday
             FROM timetable_theory
             WHERE user_id = ?`,
            [user_id]
        );

        // 过滤出符合当前周的理论课
        const filteredTheory = theoryCourses.filter(course => {
            const weekRanges = course.weeks.split(",");
            return weekRanges.some(range => {
                if (range.includes("-")) {
                    const [start, end] = range.split("-").map(Number);
                    return week >= start && week <= end;
                } else {
                    return Number(range) === Number(week);
                }
            });
        });

        // 按 weekday 放入 weeklyData 中
        filteredTheory.forEach(course => {
            const day = course.weekday;
            if (weeklyData[day]) {
                weeklyData[day].push(course);
            }
        });

        // 获取本周实践课（整周作为一门课）
        const [practiceCourses] = await db.promise().query(
            `SELECT id, course_name, teacher_name, location, weeks
             FROM timetable_practice
             WHERE user_id = ?`,
            [user_id]
        );

        // 过滤符合当前周的实践课
        const filteredPractice = practiceCourses.filter(course => {
            const weekRanges = course.weeks.split(",");
            return weekRanges.some(range => {
                if (range.includes("-")) {
                    const [start, end] = range.split("-").map(Number);
                    return week >= start && week <= end;
                } else {
                    return Number(range) === Number(week);
                }
            });
        });

        // 将实践课统一加入每个工作日（1 ~ 5）作为提示（如果需要你可以只放一天）
        if (filteredPractice.length > 0) {
            for (let d = 1; d <= 5; d++) {
                weeklyData[d].push(...filteredPractice.map(p => ({
                    ...p,
                    isPractice: true
                })));
            }
        }

        res.json({ success: true, data: weeklyData });

    } catch (err) {
        console.error("❌ 获取周课表失败:", err);
        res.status(500).json({ success: false, message: "服务器错误" });
    }
});

module.exports = router;