const express = require("express");
const cors = require("cors");
const app = express();

// 允许解析 JSON
app.use(express.json());
app.use(cors());

// 引入路由
const wechatRoutes = require("./routes/wechat"); // 确保路径正确
app.use("/wechat", wechatRoutes);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});