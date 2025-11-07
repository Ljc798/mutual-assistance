const express = require("express");
const router = express.Router();
const COS = require("cos-nodejs-sdk-v5");
const multer = require("multer");
const {
    v4: uuidv4
} = require('uuid');
const path = require("path");
const dotenv = require("dotenv");
const db = require("../config/db")

dotenv.config();

// 初始化 COS 客户端
const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
});

const bucketName = process.env.COS_BUCKET;
const region = process.env.COS_REGION;

// multer 使用内存存储（避免写入本地磁盘）
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024 // 限制最大 10MB
    }
});

// 封装上传为 Promise
function uploadToCOS({
    Bucket,
    Region,
    Key,
    Body,
    ContentType
}) {
    return new Promise((resolve, reject) => {
        cos.putObject({
            Bucket,
            Region,
            Key,
            Body,
            ContentType
        }, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
}

// 上传图片接口
router.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "未上传文件"
            });
        }

        const type = req.body.type || "other";
        const username = req.body.username || "anonymous";
        const postId = req.body.postId || "temp";
        const extension = path.extname(file.originalname);

        let fileName = "";
        if (type === "avatar") {
            fileName = `avatar/${username}${extension}`;
        } else if (type === "square") {
            fileName = `square/${postId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
        } else if (type === "chat") {
            const userId = req.body.userId || "unknown";
            fileName = `chat/${userId}/${Date.now()}${extension}`;
        } else {
            fileName = `other/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
        }

        // 上传到 COS
        await uploadToCOS({
            Bucket: bucketName,
            Region: region,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        const imageUrl = `https://${bucketName}.cos.${region}.myqcloud.com/${fileName}`;
        console.log("图片上传成功:", imageUrl);

        return res.json({
            success: true,
            imageUrl
        });

    } catch (err) {
        console.error("❌ 图片上传失败:", err);
        return res.status(500).json({
            success: false,
            message: "上传失败",
            error: err
        });
    }
});

router.post("/upload-voice", upload.single("voice"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "未上传文件",
            });
        }

        let {
            userId,
            conversation_id
        } = req.body;
        userId = userId && !isNaN(userId) ? Number(userId) : null;
        const extension = path.extname(file.originalname) || ".mp3";

        // 🧠 检查是否已有本地 conversation 记录
        let localConvId = null;
        if (conversation_id) {
            // 如果传的是 Dify conversation_id，则在本地查找是否存在对应记录
            const [convRows] = await db.query(
                `SELECT id FROM ai_conversation WHERE conversation_id = ? AND user_id = ?`,
                [conversation_id, userId]
            );
            if (convRows.length > 0) {
                localConvId = convRows[0].id;
            }
        }

        // 🪄 如果数据库没有这条会话，则创建新会话（暂时没有 Dify conversation_id）
        if (!localConvId) {
            const [result] = await db.query(
                `INSERT INTO ai_conversation (user_id, title, created_at) VALUES (?, ?, NOW())`,
                [userId, "语音会话"]
            );
            localConvId = result.insertId;
        }

        // ✅ 生成唯一文件名
        const fileName = `voice/${userId}/${localConvId}/${uuidv4()}${extension}`;

        // ✅ 上传至 COS
        await uploadToCOS({
            Bucket: bucketName,
            Region: region,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        // ✅ 拼接公网访问 URL
        const voiceUrl = `https://${bucketName}.cos.${region}.myqcloud.com/${fileName}`;

        // ✅ 插入消息表
        const [msgResult] = await db.query(
            `INSERT INTO ai_message (conversation_id, user_id, role, message_type, content, created_at)
         VALUES (?, ?, 'user', 'voice', '[语音消息]', NOW())`,
            [localConvId, userId]
        );

        const message_id = msgResult.insertId;

        // ✅ 插入附件表
        await db.query(
            `INSERT INTO ai_attachment (message_id, file_url, file_type, created_at)
         VALUES (?, ?, 'voice', NOW())`,
            [message_id, voiceUrl]
        );

        // ✅ 返回 COS 地址 + 本地 conversation 主键
        return res.json({
            success: true,
            conversation_id: localConvId, // 🧩 本地数据库 id，不是 Dify 的
            message_id,
            voiceUrl,
        });
    } catch (err) {
        console.error("❌ 语音上传失败:", err);
        return res.status(500).json({
            success: false,
            message: "上传失败",
            error: err.message,
        });
    }
});

// COS 审核结果回调接口
router.post("/image-review", express.json(), async (req, res) => {
    // 立即返回 200
    res.status(200).send("OK");

    try {
        const {
            data
        } = req.body;

        if (!data || !data.url || data.forbidden_status === undefined) {
            console.warn("⚠️ 回调格式异常:", req.body);
            return;
        }

        // 提取 object key（去掉签名参数）
        const urlPart = data.url.split(".myqcloud.com/")[1] || "";
        const objectKey = urlPart.split("?")[0];

        // 审核状态
        const auditStatus = data.forbidden_status === 0 ? "pass" : "fail";

        // 使用连接池独立连接执行更新
        const conn = await db.getConnection();
        const [result] = await conn.query(
            `UPDATE square_images 
         SET audit_status = ? 
         WHERE image_url LIKE ?`,
            [auditStatus, `%${objectKey}%`]
        );
        conn.release();

        console.log("COS 回调成功:", {
            url: data.url,
            objectKey,
            auditStatus,
            affectedRows: result.affectedRows
        });

        if (result.affectedRows === 0) {
            console.warn("⚠️ 未匹配到对应图片记录:", objectKey);
        }
    } catch (err) {
        console.error("❌ COS 回调异常:", err);
    }
});



module.exports = router;