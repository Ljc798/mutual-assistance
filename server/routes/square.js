const express = require("express");
const router = express.Router();
const db = require("../config/db");
const dotenv = require("dotenv");

dotenv.config(); // 读取 .env 配置文件

// **✅ 获取广场帖子列表（包含图片 & 用户点赞状态）**
router.get("/posts", (req, res) => {
    const { category, user_id } = req.query;
    let queryParams = [user_id || null];

    let query = `
        SELECT s.*, 
               u.username, 
               u.avatar_url, 
               (SELECT COUNT(*) FROM square_likes WHERE square_id = s.id AND user_id = ?) AS isLiked
        FROM square s 
        LEFT JOIN users u ON s.user_id = u.id
    `;

    if (category && category !== "全部") {
        query += " WHERE s.category = ?";
        queryParams.push(category);
    }

    query += " ORDER BY s.created_time DESC";

    db.query(query, queryParams, (err, posts) => {
        if (err) {
            console.error("❌ 获取帖子失败:", err);
            return res.status(500).json({ success: false, message: "获取帖子失败" });
        }

        if (posts.length === 0) {
            return res.json({ success: true, posts: [] });
        }

        const postIds = posts.map(p => p.id);

        // 查询帖子图片
        db.query(
            `SELECT square_id, image_url FROM square_images WHERE square_id IN (?)`,
            [postIds],
            (err, images) => {
                if (err) {
                    console.error("❌ 获取帖子图片失败:", err);
                    return res.status(500).json({ success: false, message: "获取帖子图片失败" });
                }

                // **组装帖子数据**
                const postsWithImages = posts.map(post => ({
                    ...post,
                    images: images.filter(img => img.square_id === post.id).map(img => img.image_url),
                    isLiked: Boolean(post.isLiked),
                }));

                res.json({ success: true, posts: postsWithImages });
            }
        );
    });
});

// **✅ 用户点赞帖子**
router.post("/like", (req, res) => {
    const { user_id, square_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: "缺少 user_id" });

    db.query(
        `SELECT * FROM square_likes WHERE user_id = ? AND square_id = ?`,
        [user_id, square_id],
        (err, existingLike) => {
            if (err) {
                console.error("❌ 查询点赞状态失败:", err);
                return res.status(500).json({ success: false, message: "查询点赞状态失败" });
            }

            if (existingLike.length > 0) {
                return res.status(400).json({ success: false, message: "已经点赞过了" });
            }

            db.query(
                `INSERT INTO square_likes (user_id, square_id) VALUES (?, ?)`,
                [user_id, square_id],
                (err) => {
                    if (err) {
                        console.error("❌ 点赞失败:", err);
                        return res.status(500).json({ success: false, message: "点赞失败" });
                    }

                    db.query(
                        `UPDATE square SET likes_count = likes_count + 1 WHERE id = ?`,
                        [square_id],
                        (err) => {
                            if (err) {
                                console.error("❌ 更新点赞数失败:", err);
                                return res.status(500).json({ success: false, message: "更新点赞数失败" });
                            }
                            res.json({ success: true, message: "点赞成功" });
                        }
                    );
                }
            );
        }
    );
});

// **✅ 用户取消点赞**
router.post("/unlike", (req, res) => {
    const { user_id, square_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: "缺少 user_id" });

    db.query(
        `DELETE FROM square_likes WHERE user_id = ? AND square_id = ?`,
        [user_id, square_id],
        (err, result) => {
            if (err) {
                console.error("❌ 取消点赞失败:", err);
                return res.status(500).json({ success: false, message: "取消点赞失败" });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({ success: false, message: "未点赞，无法取消" });
            }

            db.query(
                `UPDATE square SET likes_count = likes_count - 1 WHERE id = ? AND likes_count > 0`,
                [square_id],
                (err) => {
                    if (err) {
                        console.error("❌ 更新点赞数失败:", err);
                        return res.status(500).json({ success: false, message: "更新点赞数失败" });
                    }
                    res.json({ success: true, message: "取消点赞成功" });
                }
            );
        }
    );
});

// ✅ **创建帖子**
// ✅ 创建帖子（支持带图片 & 不带图片）
router.post("/create", async (req, res) => {
    const { user_id, category, content } = req.body;

    // **🚨 校验必要参数**
    if (!user_id || !category || !content) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    // **1️⃣ 先插入帖子**
    db.query(
        "INSERT INTO square (user_id, category, content, likes_count, comments_count, created_time) VALUES (?, ?, ?, 0, 0, NOW())",
        [user_id, category, content],
        (err, result) => {
            if (err) {
                console.error("❌ 创建帖子失败:", err);
                return res.status(500).json({ success: false, message: "创建帖子失败" });
            }

            const square_id = result.insertId;

            res.json({ success: true, square_id });
        }
    );
});

router.post("/update-images", async (req, res) => {
    const { square_id, images } = req.body;
    if (!square_id || !images || images.length === 0) {
        return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    const imageInserts = images.map(imgUrl => [square_id, imgUrl]);

    db.query(
        "INSERT INTO square_images (square_id, image_url) VALUES ?",
        [imageInserts],
        (err) => {
            if (err) {
                console.error("❌ 存储图片失败:", err);
                return res.status(500).json({ success: false, message: "存储图片失败" });
            }
            return res.json({ success: true });
        }
    );
});

module.exports = router;