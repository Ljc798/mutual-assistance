// routes/pay.js
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const router = express.Router();
require("dotenv").config();

const APP_ID = process.env.WX_APPID;
const MCH_ID = process.env.MCH_ID;
const API_V3_KEY = process.env.API_V3_KEY;
const PRIVATE_KEY = fs.readFileSync("./cert/apiclient_key.pem", "utf8");
const CERT_SERIAL_NO = process.env.MCH_CERT_SERIAL_NO; // 商户API证书序列号

// 工具函数：生成签名
function generateSignature(timestamp, nonceStr, body) {
  const message = `POST\n/v3/pay/transactions/jsapi\n${timestamp}\n${nonceStr}\n${JSON.stringify(body)}\n`;
  return crypto.createSign("RSA-SHA256").update(message).sign(PRIVATE_KEY, "base64");
}

// 创建 JSAPI 支付订单
router.post("/create", async (req, res) => {
  const { openid, description, order_no, total_fee } = req.body;

  if (!openid || !description || !order_no || !total_fee) {
    return res.status(400).json({ success: false, message: "缺少必要参数" });
  }

  const url = "https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");

  const body = {
    appid: APP_ID,
    mchid: MCH_ID,
    description,
    out_trade_no: order_no,
    notify_url: "https://yourdomain.com/api/pay/notify", // 替换为你的回调地址
    amount: {
      total: total_fee,
      currency: "CNY",
    },
    payer: {
      openid,
    },
  };

  const signature = generateSignature(timestamp, nonceStr, body);

  try {
    const result = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `WECHATPAY2-SHA256-RSA2048 mchid=\"${MCH_ID}\",nonce_str=\"${nonceStr}\",signature=\"${signature}\",timestamp=\"${timestamp}\",serial_no=\"${CERT_SERIAL_NO}\"`,
      },
    });

    const prepay_id = result.data.prepay_id;
    const packageStr = `prepay_id=${prepay_id}`;

    // 前端所需参数
    const paySignStr = `${APP_ID}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
    const paySign = crypto.createSign("RSA-SHA256").update(paySignStr).sign(PRIVATE_KEY, "base64");

    return res.json({
      success: true,
      timeStamp: timestamp,
      nonceStr,
      package: packageStr,
      signType: "RSA",
      paySign,
    });
  } catch (err) {
    console.error("❌ 创建微信支付订单失败:", err.response?.data || err);
    return res.status(500).json({ success: false, message: "微信支付接口调用失败" });
  }
});

module.exports = router;
