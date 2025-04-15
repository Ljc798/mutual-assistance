const express = require("express");
const router = express.Router();
const COS = require("cos-nodejs-sdk-v5");
const multer = require("multer");
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

// ✅ 封装上传为 Promise
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

// ✅ 上传图片接口
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

        // ✅ 上传到 COS
        await uploadToCOS({
            Bucket: bucketName,
            Region: region,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        const imageUrl = `https://${bucketName}.cos.${region}.myqcloud.com/${fileName}`;
        console.log("✅ 图片上传成功:", imageUrl);

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

// COS 审核回调接口
router.post("/cos-callback", express.text({
    type: "*/*"
}), async (req, res) => {
    try {
        const xmlData = req.body;
        const json = require("xml2js").parseString;

        json(xmlData, async (err, result) => {
            if (err) {
                console.error("❌ 回调 XML 解析失败:", err);
                return res.status(400).send("Invalid XML");
            }

            const job = result?.Response?.JobsDetail?.[0];
            const state = job?.State?.[0]; // "Success"
            const label = job?.Result?.[0]?.Label?.[0]; // "Normal" 或 "Porn" 等
            const key = job?.Object?.[0]; // 审核的文件路径

            console.log("📩 收到 COS 审核回调:", {
                key,
                state,
                label
            });

            // ✅ 示例：更新数据库记录（你自己实现）
            if (key && state === "Success") {
                const status = label === "Normal" ? "pass" : "fail";

                await db.query(
                    `UPDATE square_images SET audit_status = ? WHERE image_url LIKE ?`,
                    [status, `%${key}`]
                );
            }

            return res.send("OK");
        });
    } catch (err) {
        console.error("❌ 审核回调处理失败:", err);
        return res.status(500).send("Server Error");
    }
});

// COS 审核结果回调接口
router.post("/image-review", async (req, res) => {
    try {
        const job = req.body?.JobsDetail;
        if (!job || !job.Object || !job.Result?.Label) {
            return res.status(400).json({
                success: false,
                message: "格式错误"
            });
        }

        const objectKey = job.Object;
        const label = job.Result.Label;

        const auditStatus = label === "Normal" ? "pass" : "fail";

        // ✅ 更新数据库中审核状态（你需要提前加好 audit_status 字段）
        await db.query(
            `UPDATE square_images SET audit_status = ? WHERE image_url LIKE ?`,
            [auditStatus, `%${objectKey}`]
        );

        console.log("✅ 回调审核成功：", objectKey, auditStatus);
        res.send("OK");
    } catch (err) {
        console.error("❌ 审核回调异常:", err);
        res.status(500).send("FAIL");
    }
});


module.exports = router;