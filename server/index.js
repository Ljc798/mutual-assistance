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

    // 添加根路径 "/" 处理
    app.get("/", (req, res) => {
        res.send("🚀 服务器已启动！API 访问 /api/");
    });

    // 监听端口
    const PORT = process.env.APP_PORT || 80;
    app.listen(PORT, () => {
        console.log(`✅ 服务器运行在端口 ${PORT}`);
    });
    
    const cors = require("cors");
    app.use(cors({
      origin: "*", // 允许所有来源访问
      methods: ["GET", "POST"], 
      allowedHeaders: ["Content-Type", "Authorization"]
    }));