const express = require("express");
const router = express.Router();
const db = require("../config/db");
const dayjs = require("dayjs");
const authMiddleware = require("./authMiddleware"); // 引入中间件

// ===== 1. 获取广场帖子列表 =====
router.get("/posts", async (req, res) => {
    const {
        category,
        user_id,
        page = 1,
        pageSize = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const hasUserId = !!user_id;
    const values = [];

    let whereClause = "";
    if (category && category !== "全部") {
        whereClause = "WHERE s.category = ?";
        values.push(category);
    }

    values.push(offset, limit);

    const likeSubquery = hasUserId ?
        `(SELECT COUNT(*) FROM square_likes WHERE square_id = s.id AND user_id = ${db.escape(user_id)})` :
        `0`;

    const query = `
        SELECT s.*, 
               u.username, 
               u.avatar_url, 
               u.vip_expire_time,
               ${likeSubquery} AS isLiked
        FROM square s
        LEFT JOIN users u ON s.user_id = u.id
        ${whereClause}
        ORDER BY s.is_pinned DESC, s.created_time DESC
        LIMIT ?, ?
    `;

    try {
        const [posts] = await db.query(query, values);

        if (posts.length === 0) {
            return res.json({
                success: true,
                posts: []
            });
        }

        const postIds = posts.map(p => p.id);
        const [images] = await db.query(
            `SELECT square_id, image_url, audit_status FROM square_images WHERE square_id IN (?) AND audit_status = 'pass'`,
            [postIds]
        );

        const now = new Date();
        const postsWithImages = posts.map(post => ({
            ...post,
            images: images
                .filter(img => img.square_id === post.id)
                .map(img => ({
                    url: img.image_url,
                    status: img.audit_status
                })),
            isLiked: Boolean(post.isLiked),
            isVip: post.vip_expire_time && new Date(post.vip_expire_time) > now
        }));

        res.json({
            success: true,
            posts: postsWithImages
        });
    } catch (err) {
        console.error("❌ 获取帖子失败:", err);
        res.status(500).json({
            success: false,
            message: "获取帖子失败",
            error: err
        });
    }
});

// ===== 2. 点赞帖子 + 通知作者 =====
router.post("/like", authMiddleware, async (req, res) => {
    const {
        user_id,
        square_id
    } = req.body;
    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 user_id"
        });
    }

    try {
        // 1. 防止重复点赞
        const [existing] = await db.query(
            `SELECT * FROM square_likes WHERE user_id = ? AND square_id = ?`,
            [user_id, square_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "已经点赞过了"
            });
        }

        // 2. 点赞操作
        await db.query(`INSERT INTO square_likes (user_id, square_id) VALUES (?, ?)`, [user_id, square_id]);
        await db.query(`UPDATE square SET likes_count = likes_count + 1 WHERE id = ?`, [square_id]);

        // 3. 获取作者信息 & 用户名
        const [
            [{
                user_id: receiver_id
            }]
        ] = await db.query(
            `SELECT user_id FROM square WHERE id = ?`, [square_id]
        );

        const [
            [{
                username
            }]
        ] = await db.query(
            `SELECT username FROM users WHERE id = ?`, [user_id]
        );

        // 4. 插入通知（别忘了你叫 notification 表）
        if (receiver_id && receiver_id !== user_id) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, content, is_read) VALUES (?, 'like', NULL, ?, 0)`,
                [receiver_id, `${username} 赞了你的一条动态`]
            );
        }

        res.json({
            success: true,
            message: "点赞成功"
        });
    } catch (err) {
        console.error("❌ 点赞失败:", err);
        res.status(500).json({
            success: false,
            message: "点赞失败"
        });
    }
});

// ===== 3. 取消点赞 =====
router.post("/unlike", authMiddleware, async (req, res) => { // 添加了认证中间件
    const {
        user_id,
        square_id
    } = req.body;
    if (!user_id) return res.status(400).json({
        success: false,
        message: "缺少 user_id"
    });

    try {
        const [result] = await db.query(
            `DELETE FROM square_likes WHERE user_id = ? AND square_id = ?`,
            [user_id, square_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: "未点赞，无法取消"
            });
        }

        await db.query(
            `UPDATE square SET likes_count = likes_count - 1 WHERE id = ? AND likes_count > 0`,
            [square_id]
        );

        res.json({
            success: true,
            message: "取消点赞成功"
        });
    } catch (err) {
        console.error("❌ 取消点赞失败:", err);
        res.status(500).json({
            success: false,
            message: "取消点赞失败"
        });
    }
});

// ===== 4. 创建帖子 =====
router.post("/create", authMiddleware, async (req, res) => { // 添加了认证中间件
    const {
        user_id,
        category,
        content
    } = req.body;
    if (!user_id || !category || !content) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO square (user_id, category, content, likes_count, comments_count, created_time, school_id)
             VALUES (?, ?, ?, 0, 0, NOW(), 1)`,
            [user_id, category, content]
        );

        res.json({
            success: true,
            square_id: result.insertId
        });
    } catch (err) {
        console.error("❌ 创建帖子失败:", err);
        res.status(500).json({
            success: false,
            message: "创建帖子失败"
        });
    }
});

// ===== 5. 更新图片 =====
router.post("/update-images", authMiddleware, async (req, res) => {
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

    try {
        // 👇 每张图的审核状态初始化为 pending
        const imageInserts = images.map(url => [square_id, url, 'pending']);

        await db.query(
            `INSERT INTO square_images (square_id, image_url, audit_status) VALUES ?`,
            [imageInserts]
        );

        res.json({
            success: true
        });
    } catch (err) {
        console.error("❌ 存储图片失败:", err);
        res.status(500).json({
            success: false,
            message: "存储图片失败"
        });
    }
});

// 获取帖子详情
router.get("/detail", async (req, res) => {
    const {
        post_id,
        user_id
    } = req.query;

    if (!post_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 post_id"
        });
    }

    try {
        const [posts] = await db.query(`
            SELECT s.*, 
                   u.username, 
                   u.avatar_url, 
                   u.vip_expire_time,
                   (SELECT COUNT(*) FROM square_likes WHERE square_id = s.id AND user_id = ?) AS isLiked
            FROM square s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = ?;
        `, [user_id || null, post_id]);

        if (posts.length === 0) {
            return res.json({
                success: false,
                message: "帖子不存在"
            });
        }

        const post = posts[0];
        post.isLiked = Boolean(post.isLiked);

        const [images] = await db.query(
            "SELECT image_url FROM square_images WHERE square_id = ?",
            [post_id]
        );

        post.images = images.map(img => img.image_url);
        res.json({
            success: true,
            post
        });

    } catch (err) {
        console.error("❌ 获取帖子详情失败:", err);
        res.status(500).json({
            success: false,
            message: "获取帖子失败"
        });
    }
});

// 获取评论列表
router.get("/comments", async (req, res) => {
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

    try {
        const [comments] = await db.query(
            `SELECT 
                c.*, 
                u.username, 
                u.avatar_url,
                u.vip_expire_time,
                COALESCE(pu.username, '') AS reply_to_username, 
                pu.vip_expire_time AS reply_to_vip_expire_time,
                (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) AS isLiked
             FROM square_comments c 
             LEFT JOIN users u ON c.user_id = u.id 
             LEFT JOIN square_comments p ON c.parent_id = p.id 
             LEFT JOIN users pu ON p.user_id = pu.id  
             WHERE c.square_id = ?
             ORDER BY c.created_time ASC`,
            [user_id || null, square_id]
        );

        const rootComments = [];
        const subCommentsMap = {};

        comments.forEach(comment => {
            comment.isLiked = Boolean(comment.isLiked);
            comment.children = [];
            if (!comment.parent_id) {
                rootComments.push(comment);
            } else {
                if (!subCommentsMap[comment.root_parent_id]) {
                    subCommentsMap[comment.root_parent_id] = [];
                }
                subCommentsMap[comment.root_parent_id].push(comment);
            }
        });

        rootComments.forEach(root => {
            root.children = subCommentsMap[root.id] || [];
        });

        res.json({
            success: true,
            comments: rootComments
        });

    } catch (err) {
        console.error("❌ 获取评论失败:", err);
        res.status(500).json({
            success: false,
            message: "获取评论失败"
        });
    }
});

router.post("/comments/create", authMiddleware, async (req, res) => {
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

    try {
        let newCommentId;

        if (!parent_id) {
            // 一级评论（直接对帖子）
            const [result] = await db.query(
                `INSERT INTO square_comments (user_id, square_id, content, parent_id, root_parent_id) 
                 VALUES (?, ?, ?, NULL, NULL)`,
                [user_id, square_id, content]
            );

            newCommentId = result.insertId;

            // 设置 root_parent_id 为自己（方便后续回复结构）
            await db.query(
                `UPDATE square_comments SET root_parent_id = ? WHERE id = ?`,
                [newCommentId, newCommentId]
            );

            // 更新评论数
            await db.query(
                `UPDATE square SET comments_count = comments_count + 1 WHERE id = ?`,
                [square_id]
            );

            // 给帖子作者发通知
            const [
                [post]
            ] = await db.query(
                `SELECT user_id FROM square WHERE id = ?`,
                [square_id]
            );

            if (post && post.user_id !== user_id) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, title, content) 
                     VALUES (?, 'comment', '💬 有人评论了你的帖子', ?)`,
                    [post.user_id, content.slice(0, 50)]
                );
            }

        } else {
            // 二级评论（回复评论）
            const [result] = await db.query(
                `INSERT INTO square_comments (user_id, square_id, content, parent_id, root_parent_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [user_id, square_id, content, parent_id, root_parent_id]
            );

            newCommentId = result.insertId;

            await db.query(
                `UPDATE square SET comments_count = comments_count + 1 WHERE id = ?`,
                [square_id]
            );

            // 发通知给被回复的人
            const [
                [targetComment]
            ] = await db.query(
                `SELECT user_id FROM square_comments WHERE id = ?`,
                [parent_id]
            );

            if (targetComment && targetComment.user_id !== user_id) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, title, content) 
                     VALUES (?, 'reply', '💬 有人回复了你', ?)`,
                    [targetComment.user_id, content.slice(0, 50)]
                );
            }
        }

        res.json({
            success: true,
            message: "评论成功",
            comment_id: newCommentId
        });

    } catch (err) {
        console.error("❌ 评论失败:", err);
        res.status(500).json({
            success: false,
            message: "发表评论失败"
        });
    }
});

// 点赞评论
router.post("/comments/like", async (req, res) => { // 添加了认证中间件
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

    try {

        // 1. 查询是否已经点赞
        const [existingLike] = await db.query(
            "SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?",
            [user_id, comment_id]
        );

        if (existingLike.length > 0) {
            return res.status(400).json({
                success: false,
                message: "已经点赞过"
            });
        }

        // 2. 插入点赞记录
        await db.query(
            "INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)",
            [user_id, comment_id]
        );

        // 3. 更新评论点赞数
        await db.query(
            "UPDATE square_comments SET likes_count = likes_count + 1 WHERE id = ?",
            [comment_id]
        );

        return res.json({
            success: true,
            message: "点赞成功"
        });

    } catch (err) {
        console.error("❌ 点赞失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post("/comments/unlike", async (req, res) => {
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

    try {

        // 1. 确认是否已点赞
        const [results] = await db.query(
            "SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?",
            [user_id, comment_id]
        );

        if (results.length === 0) {
            return res.status(400).json({
                success: false,
                message: "尚未点赞，无法取消"
            });
        }

        // 2. 删除点赞记录
        await db.query(
            "DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?",
            [user_id, comment_id]
        );

        // 3. 更新点赞数（防止小于0）
        await db.query(
            "UPDATE square_comments SET likes_count = likes_count - 1 WHERE id = ? AND likes_count > 0",
            [comment_id]
        );

        return res.json({
            success: true,
            message: "取消点赞成功"
        });

    } catch (err) {
        console.error("❌ 取消点赞失败:", err);
        return res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post('/report', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const {
        post_id,
        reason = '',
        description = ''
    } = req.body;

    if (!post_id || !reason) {
        return res.status(400).json({
            success: false,
            message: '缺少参数'
        });
    }

    try {
        // 写入举报表
        await db.query(
            'INSERT INTO square_reports (post_id, reporter_id, reason, description) VALUES (?, ?, ?, ?)',
            [post_id, userId, reason, description]
        );

        // 发通知给 10 号管理员（你）
        await db.query(
            `INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)`,
            [
                10, // 接收人就是你
                'report',
                '📢 有新的举报',
                `用户 ${userId} 举报了帖子 ${post_id}\n理由：${reason}${description ? `\n补充说明：${description}` : ''}`
            ]
        );

        res.json({
            success: true,
            message: '举报成功，正在送去星际仲裁庭 🪐'
        });
    } catch (err) {
        console.error('❌ 举报失败:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.get("/mine", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const [posts] = await db.query(
            `SELECT id, content, category, likes_count, comments_count, created_time 
             FROM square 
             WHERE user_id = ? 
             ORDER BY created_time DESC`,
            [userId]
        );

        const postIds = posts.map(p => p.id);
        const [images] = await db.query(
            `SELECT square_id, image_url FROM square_images WHERE square_id IN (?)`,
            [postIds.length ? postIds : [0]]
        );

        const postsWithImages = posts.map(post => ({
            ...post,
            images: images.filter(img => img.square_id === post.id).map(img => img.image_url)
        }));

        res.json({
            success: true,
            posts: postsWithImages
        });
    } catch (err) {
        console.error("❌ 获取我的帖子失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

router.post("/delete", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const {
        post_id
    } = req.body;

    if (!post_id) {
        return res.status(400).json({
            success: false,
            message: "缺少 post_id"
        });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // ✅ 确保用户只能删自己的帖子
        const [posts] = await conn.query(`SELECT id FROM square WHERE id = ? AND user_id = ?`, [post_id, userId]);
        if (posts.length === 0) {
            await conn.release();
            return res.status(404).json({
                success: false,
                message: "帖子不存在或无权限"
            });
        }

        // 🚮 删除点赞记录
        await conn.query(`DELETE FROM square_likes WHERE square_id = ?`, [post_id]);

        // 🧹 删除评论和点赞
        await conn.query(`DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM square_comments WHERE square_id = ?)`, [post_id]);
        await conn.query(`DELETE FROM square_comments WHERE square_id = ?`, [post_id]);

        // 🖼️ 删除图片记录
        await conn.query(`DELETE FROM square_images WHERE square_id = ?`, [post_id]);

        // 🪓 最后删帖子本体
        await conn.query(`DELETE FROM square WHERE id = ? AND user_id = ?`, [post_id, userId]);

        await conn.commit();
        res.json({
            success: true,
            message: "删除成功"
        });
    } catch (err) {
        await conn.rollback();
        console.error("❌ 删除帖子失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    } finally {
        conn.release();
    }
});

router.post("/edit", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const {
        post_id,
        content,
        category
    } = req.body;

    if (!post_id || !content) {
        return res.status(400).json({
            success: false,
            message: "缺少参数"
        });
    }

    try {
        const [result] = await db.query(
            `UPDATE square SET content = ?, category = ? WHERE id = ? AND user_id = ?`,
            [content, category || '', post_id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "帖子不存在或无权限"
            });
        }

        res.json({
            success: true,
            message: "更新成功"
        });
    } catch (err) {
        console.error("❌ 编辑帖子失败:", err);
        res.status(500).json({
            success: false,
            message: "服务器错误"
        });
    }
});

module.exports = router;