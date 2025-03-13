const express = require("express");
const cors = require("cors");
const app = express();

// 允许解析 JSON
app.use(express.json());
app.use(cors());

// 引入路由
const wechatRoutes = require("./routes/wechat"); // 确保路径正确
const taskRoutes = require("./routes/tasks");
app.use("/wechat", wechatRoutes);
app.use("/tasks", taskRoutes);

app.get('/', (req, res) => {
    res.send("🌍 服务器运行正常！");
});
app.get('/api/test', (req, res) => {
    res.json({ message: "API 正常运行" });
});

// 启动服务器
const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});