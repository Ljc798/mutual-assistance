const express = require("express");
const router = express.Router();
const COS = require("cos-nodejs-sdk-v5");
const multer = require("multer");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config(); 

const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
});

const bucketName = process.env.COS_BUCKET;
const region = process.env.COS_REGION;

// ✅ **动态文件存储**
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
        const file = req.file;
        const type = req.body.type || "other"; // **默认存储到 "other/"**
        const username = req.body.username || "anonymous"; // **获取用户name**
        const postId = req.body.postId || "temp"; // **如果是帖子，获取帖子ID**
        const extension = path.extname(file.originalname); // 获取文件后缀

        let folder = "other/";
        let fileName = "";

        // **不同类型的存储路径**
        if (type === "avatar") {
            folder = "avatar/";
            fileName = `avatar/${username}${extension}`; // **用户头像直接覆盖**
        } else if (type === "square") {
            folder = `square/${postId}/`;
            fileName = `${folder}${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
        } else if (type === "chat") {
            folder = `chat/${userId}/`;
            fileName = `${folder}${Date.now()}${extension}`;
        } else {
            fileName = `${folder}${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
        }

        // ✅ **上传到腾讯 COS**
        cos.putObject({
            Bucket: bucketName,
            Region: region,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype
        }, (err, data) => {
            if (err) {
                console.error("❌ 图片上传失败:", err);
                return res.status(500).json({ success: false, message: "图片上传失败", error: err });
            }

            // **返回可访问的 URL**
            const imageUrl = `https://${bucketName}.cos.${region}.myqcloud.com/${fileName}`;
            console.log("✅ 图片上传成功:", imageUrl);
            res.json({ success: true, imageUrl });
        });

    } catch (err) {
        console.error("❌ 服务器错误:", err);
        res.status(500).json({ success: false, message: "服务器错误", error: err });
    }
});

module.exports = router;