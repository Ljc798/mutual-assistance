const express = require("express");
const cors = require("cors");
const taskRouter = require("./routes/task");
const userRouter = require("./routes/user");
const squareRouter = require("./routes/square");
const uploadsRouter = require("./routes/uploads");
const checkinsRouter = require("./routes/checkins");
const shopRouter = require("./routes/shop");
const timetableRouter = require("./routes/timetable");
const timetableConfigRouter = require("./routes/timetableConfig");

const app = express();

// 中间件
app.use(express.json());
app.use(cors());

// 绑定 API
app.use("/api/task", taskRouter);
app.use("/api/user", userRouter);
app.use("/api/square", squareRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/checkins", checkinsRouter);
app.use("/api/shop", shopRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/timetableConfig", timetableConfigRouter);

// 监听端口
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});

// 配置静态文件托管（如部署了前端页面）
const path = require("path");
app.use(express.static(path.join(__dirname, "public"))); // 假设前端打包目录为 public

app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });