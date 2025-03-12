const express = require("express");
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

// 中间件
app.use(express.json());
app.use(cors());

// 挂载 API
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// 监听端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在端口 ${PORT}`);
});