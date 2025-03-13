const express = require("express");
const cors = require("cors"); // 解决跨域问题
const tasksRouter = require("./routes/tasks"); // 任务 API

const app = express();

// 中间件
app.use(express.json()); // 解析 JSON
app.use(cors()); // 允许跨域访问

// API 路由
app.use("/api", tasksRouter); // 绑定任务 API

// 服务器监听端口
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});