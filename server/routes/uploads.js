const express = require("express");
const router = express.Router();
const COS = require("cos-nodejs-sdk-v5");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
    v4: uuidv4
} = require("uuid");
const FormData = require("form-data");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
});

const bucketName = process.env.COS_BUCKET;
const region = process.env.COS_REGION;

// multer 使用本地文件存储
const upload = multer({
    dest: path.join(__dirname, "../temp")
});

// 帮助调用 COS 官方异步审核 API
async function submitImageAudit(tempPath, objectKey) {
    const host = `${bucketName}.ci.${region}.myqcloud.com`;
    const url = `https://${host}/image/auditing`;

    const xml = COS.util.json2xml({
        Request: {
            Input: [{
                Object: objectKey
            }],
            Conf: {
                BizType: ""
            }
        }
    });

    return new Promise((resolve, reject) => {
        cos.request({
            Bucket: bucketName,
            Region: region,
            Method: "POST",
            Url: url,
            Key: "/image/auditing",
            ContentType: "application/xml",
            Body: xml,
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
        const tempPath = file.path;

        let objectKey = "";
        if (type === "avatar") {
            objectKey = `pending/avatar/${username}${extension}`;
        } else if (type === "square") {
            objectKey = `pending/square/${postId}_${uuidv4()}${extension}`;
        } else {
            objectKey = `pending/other/${uuidv4()}${extension}`;
        }

        // 先上传到 COS 的 pending 文件夹
        const fileBuffer = fs.readFileSync(tempPath);
        await cos.putObject({
            Bucket: bucketName,
            Region: region,
            Key: objectKey,
            Body: fileBuffer,
            ContentType: file.mimetype,
        });

        // 发起审核
        const auditRes = await submitImageAudit(tempPath, objectKey);
        fs.unlinkSync(tempPath); // 删除本地文件

        return res.json({
            success: true,
            message: "图片已上传并提交审核",
            auditJob: auditRes.JobsDetail,
            objectKey
        });
    } catch (err) {
        console.error("❌ 图片上传/审核失败:", err);
        return res.status(500).json({
            success: false,
            message: "图片上传或审核失败",
            error: err
        });
    }
});

router.get("/audit-result", async (req, res) => {
    const jobId = req.query.jobId;
  
    if (!jobId) {
      return res.status(400).json({ success: false, message: "缺少 jobId" });
    }
  
    const host = `${bucketName}.ci.${region}.myqcloud.com`;
    const url = `https://${host}/image/auditing/${jobId}`;
  
    try {
      cos.request({
        Bucket: bucketName,
        Region: region,
        Method: "GET",
        Url: url,
        Key: `/image/auditing/${jobId}`
      }, (err, data) => {
        if (err) {
          console.error("❌ 获取审核结果失败:", err);
          return res.status(500).json({ success: false, message: "获取失败", error: err });
        }
  
        const result = data.JobsDetail;
        const isPass = result?.Suggestion === "Pass";
  
        res.json({
          success: true,
          safe: isPass,
          result: result
        });
      });
    } catch (err) {
      console.error("❌ 审核状态请求异常:", err);
      res.status(500).json({ success: false, message: "审核状态异常", error: err });
    }
  });
  

module.exports = router;