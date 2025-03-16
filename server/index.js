const express = require("express");
const cors = require("cors");
const tasksRouter = require("./routes/tasks");
const userRouter = require("./routes/user");
const squareRouter = require("./routes/square");
const uploadsRouter = require("./routes/uploads");

const app = express();

// 中间件
app.use(express.json());
app.use(cors());

// 绑定 API
app.use("/api", tasksRouter);
app.use("/api/user", userRouter);
app.use("/api/square", squareRouter);
app.use("/api/uploads", uploadsRouter);

// 监听端口
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});