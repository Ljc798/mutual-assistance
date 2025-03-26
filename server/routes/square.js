const express = require("express");
const router = express.Router();
const db = require("../config/db");
const dotenv = require("dotenv");

dotenv.config(); // 读取 .env 配置文件

// **✅ 获取广场帖子列表（包含图片 & 用户点赞状态）**
router.get("/posts", (req, res) => {
    const {
        category,
        user_id
    } = req.query;
    let queryParams = [user_id || null];

    let query = `
        SELECT s.*, 
               u.username, 
               u.avatar_url, 
               u.vip_expire_time,
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
            return res.status(500).json({
                success: false,
                message: "获取帖子失败"
            });
        }

        if (posts.length === 0) {
            return res.json({
                success: true,
                posts: []
            });
        }

        const postIds = posts.map(p => p.id);

        // 查询帖子图片
        db.query(
            `SELECT square_id, image_url FROM square_images WHERE square_id IN (?)`,
            [postIds],
            (err, images) => {
                if (err) {
                    console.error("❌ 获取帖子图片失败:", err);
                    return res.status(500).json({
                        success: false,
                        message: "获取帖子图片失败"
                    });
                }

                const now = new Date();

                const postsWithImages = posts.map(post => ({
                    ...post,
                    images: images.filter(img => img.square_id === post.id).map(img => img.image_url),
                    isLiked: Boolean(post.isLiked),
                    isVip: post.vip_expire_time && new Date(post.vip_expire_time) > now
                }));

                res.json({
                    success: true,
                    posts: postsWithImages
                });
            }
        );
    });
});

// **✅ 用户点赞帖子**
router.post("/like", (req, res) => {
    const {
        user_id,
        square_id
    } = req.body;
    if (!user_id) return res.status(400).json({
        success: false,
        message: "缺少 user_id"
    });

    db.query(
        `SELECT * FROM square_likes WHERE user_id = ? AND square_id = ?`,
        [user_id, square_id],
        (err, existingLike) => {
            if (err) {
                console.error("❌ 查询点赞状态失败:", err);
                return res.status(500).json({
                    success: false,
                    message: "查询点赞状态失败"
                });
            }

            if (existingLike.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "已经点赞过了"
                });
            }

            db.query(
                `INSERT INTO square_likes (user_id, square_id) VALUES (?, ?)`,
                [user_id, square_id],
                (err) => {
                    if (err) {
                        console.error("❌ 点赞失败:", err);
                        return res.status(500).json({
                            success: false,
                            message: "点赞失败"
                        });
                    }

                    db.query(
                        `UPDATE square SET likes_count = likes_count + 1 WHERE id = ?`,
                        [square_id],
                        (err) => {
                            if (err) {
                                console.error("❌ 更新点赞数失败:", err);
                                return res.status(500).json({
                                    success: false,
                                    message: "更新点赞数失败"
                                });
                            }
                            res.json({
                                success: true,
                                message: "点赞成功"
                            });
                        }
                    );
                }
            );
        }
    );
});

// **✅ 用户取消点赞**
router.post("/unlike", (req, res) => {
    const {
        user_id,
        square_id
    } = req.body;
    if (!user_id) return res.status(400).json({
        success: false,
        message: "缺少 user_id"
    });

    db.query(
        `DELETE FROM square_likes WHERE user_id = ? AND square_id = ?`,
        [user_id, square_id],
        (err, result) => {
            if (err) {
                console.error("❌ 取消点赞失败:", err);
                return res.status(500).json({
                    success: false,
                    message: "取消点赞失败"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({
                    success: false,
                    message: "未点赞，无法取消"
                });
            }

            db.query(
                `UPDATE square SET likes_count = likes_count - 1 WHERE id = ? AND likes_count > 0`,
                [square_id],
                (err) => {
                    if (err) {
                        console.error("❌ 更新点赞数失败:", err);
                        return res.status(500).json({
                            success: false,
                            message: "更新点赞数失败"
                        });
                    }
                    res.json({
                        success: true,
                        message: "取消点赞成功"
                    });
                }
            );
        }
    );
});

// ✅ 创建帖子（支持带图片 & 不带图片）
router.post("/create", async (req, res) => {
    const {
        user_id,
        category,
        content
    } = req.body;

    // **🚨 校验必要参数**
    if (!user_id || !category || !content) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    // **1️⃣ 先插入帖子**
    db.query(
        "INSERT INTO square (user_id, category, content, likes_count, comments_count, created_time, school_id) VALUES (?, ?, ?, 0, 0, NOW(), 1)",
        [user_id, category, content],
        (err, result) => {
            if (err) {
                console.error("❌ 创建帖子失败:", err);
                return res.status(500).json({
                    success: false,
                    message: "创建帖子失败"
                });
            }

            const square_id = result.insertId;

            res.json({
                success: true,
                square_id
            });
        }
    );
});

router.post("/update-images", async (req, res) => {
    const {
        square_id,
        images
    } = req.body;
    if (!square_id || !images || images.length === 0) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    const imageInserts = images.map(imgUrl => [square_id, imgUrl]);

    db.query(
        "INSERT INTO square_images (square_id, image_url) VALUES ?",
        [imageInserts],
        (err) => {
            if (err) {
                console.error("❌ 存储图片失败:", err);
                return res.status(500).json({
                    success: false,
                    message: "存储图片失败"
                });
            }
            return res.json({
                success: true
            });
        }
    );
});

router.get("/detail", (req, res) => {
    const {
        post_id,
        user_id
    } = req.query; // ✅ 需要传递 user_id

    if (!post_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 post_id"
        });
    }

    let query = `
        SELECT s.*, 
               u.username, 
               u.avatar_url, 
               (SELECT COUNT(*) FROM square_likes WHERE square_id = s.id AND user_id = ?) AS isLiked
        FROM square s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?;
    `;

    db.query(query, [user_id || null, post_id], (err, posts) => { // ✅ 传入 user_id 和 post_id
        if (err) {
            console.error("❌ 获取帖子详情失败:", err);
            return res.status(500).json({
                success: false,
                message: "获取帖子失败"
            });
        }

        if (posts.length === 0) {
            return res.json({
                success: false,
                message: "帖子不存在"
            });
        }

        let post = posts[0];
        post.isLiked = Boolean(post.isLiked); // ✅ 确保 isLiked 为 Boolean 值

        // 查询帖子图片
        db.query(
            "SELECT image_url FROM square_images WHERE square_id = ?",
            [post_id],
            (err, images) => {
                if (err) {
                    console.error("❌ 获取帖子图片失败:", err);
                    return res.status(500).json({
                        success: false,
                        message: "获取帖子图片失败"
                    });
                }

                post.images = images.map(img => img.image_url);
                res.json({
                    success: true,
                    post
                });
            }
        );
    });
});

router.get("/comments", (req, res) => {
    const {
        square_id,
        user_id
    } = req.query;
    if (!square_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 square_id"
        });
    }

    db.query(
        `SELECT 
            c.*, 
            u.username, 
            u.avatar_url,
            COALESCE(pu.username, '') AS reply_to_username, 
            (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) AS isLiked
         FROM square_comments c 
         LEFT JOIN users u ON c.user_id = u.id 
         LEFT JOIN square_comments p ON c.parent_id = p.id 
         LEFT JOIN users pu ON p.user_id = pu.id  
         WHERE c.square_id = ?
         ORDER BY c.created_time ASC`,
        [user_id || null, square_id],
        (err, comments) => {
            if (err) {
                console.error("❌ 获取评论失败:", err.sqlMessage, err);
                return res.status(500).json({
                    success: false,
                    message: "获取评论失败"
                });
            }

            let rootComments = [];
            let subCommentsMap = {};

            // **整理数据**: 一级评论 + 归类所有属于该一级评论的子评论
            comments.forEach(comment => {
                comment.isLiked = Boolean(comment.isLiked);
                comment.children = []; // 初始化 children

                if (!comment.parent_id) {
                    // ✅ 一级评论（parent_id 为 NULL）
                    rootComments.push(comment);
                } else {
                    // ✅ 属于某个一级评论的所有子评论
                    if (!subCommentsMap[comment.root_parent_id]) {
                        subCommentsMap[comment.root_parent_id] = [];
                    }
                    subCommentsMap[comment.root_parent_id].push(comment);
                }
            });

            // ✅ 将子评论挂载到对应的 root_comment 下
            rootComments.forEach(rootComment => {
                rootComment.children = subCommentsMap[rootComment.id] || [];
            });

            res.json({
                success: true,
                comments: rootComments
            });
        }
    );
});

// **✅ 发表评论**
router.post("/comments/create", (req, res) => {
    const {
        user_id,
        square_id,
        content,
        parent_id,
        root_parent_id
    } = req.body;

    if (!user_id || !square_id || !content) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    if (!parent_id) {
        // **一级评论**
        db.query(
            `INSERT INTO square_comments (user_id, square_id, content, parent_id, root_parent_id) VALUES (?, ?, ?, NULL, NULL)`,
            [user_id, square_id, content],
            (err, result) => {
                if (err) return res.status(500).json({
                    success: false,
                    message: "发表评论失败"
                });

                const newCommentId = result.insertId;

                // **更新 root_parent_id 为自己的 ID**
                db.query(
                    `UPDATE square_comments SET root_parent_id = ? WHERE id = ?`,
                    [newCommentId, newCommentId],
                    (err) => {
                        if (err) return res.status(500).json({
                            success: false,
                            message: "更新 root_parent_id 失败"
                        });
                        res.json({
                            success: true,
                            message: "评论成功",
                            comment_id: newCommentId
                        });
                    }
                );
            }
        );
    } else {
        // **二级及以下评论**
        db.query(
            `INSERT INTO square_comments (user_id, square_id, content, parent_id, root_parent_id) VALUES (?, ?, ?, ?, ?)`,
            [user_id, square_id, content, parent_id, root_parent_id],
            (err, result) => {
                if (err) return res.status(500).json({
                    success: false,
                    message: "发表评论失败"
                });

                res.json({
                    success: true,
                    message: "评论成功",
                    comment_id: result.insertId
                });
            }
        );
    }
});

router.post("/comments/like", (req, res) => {
    const {
        user_id,
        comment_id
    } = req.body;
    if (!user_id || !comment_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 user_id 或 comment_id"
        });
    }

    db.query(
        `SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?`,
        [user_id, comment_id],
        (err, results) => {
            if (err) return res.status(500).json({
                success: false,
                message: "点赞检查失败"
            });

            if (results.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "已经点赞过"
                });
            }

            db.query(
                `INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)`,
                [user_id, comment_id],
                (err) => {
                    if (err) return res.status(500).json({
                        success: false,
                        message: "点赞失败"
                    });

                    db.query(
                        `UPDATE square_comments SET likes_count = likes_count + 1 WHERE id = ?`,
                        [comment_id],
                        (err) => {
                            if (err) return res.status(500).json({
                                success: false,
                                message: "更新点赞数失败"
                            });
                            res.json({
                                success: true,
                                message: "点赞成功"
                            });
                        }
                    );
                }
            );
        }
    );
});

router.post("/comments/unlike", (req, res) => {
    const {
        user_id,
        comment_id
    } = req.body;
    if (!user_id || !comment_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 user_id 或 comment_id"
        });
    }

    db.query(
        `SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?`,
        [user_id, comment_id],
        (err, results) => {
            if (err) return res.status(500).json({
                success: false,
                message: "查询点赞状态失败"
            });

            if (results.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "尚未点赞，无法取消"
                });
            }

            db.query(
                `DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?`,
                [user_id, comment_id],
                (err) => {
                    if (err) return res.status(500).json({
                        success: false,
                        message: "取消点赞失败"
                    });

                    db.query(
                        `UPDATE square_comments SET likes_count = likes_count - 1 WHERE id = ? AND likes_count > 0`,
                        [comment_id],
                        (err) => {
                            if (err) return res.status(500).json({
                                success: false,
                                message: "更新点赞数失败"
                            });
                            res.json({
                                success: true,
                                message: "取消点赞成功"
                            });
                        }
                    );
                }
            );
        }
    );
});

module.exports = router;