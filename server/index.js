const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");

const taskRouter = require("./routes/task");
const userRouter = require("./routes/user");
const squareRouter = require("./routes/square");
const uploadsRouter = require("./routes/uploads");
const checkinsRouter = require("./routes/checkins");
const shopRouter = require("./routes/shop");
const timetableRouter = require("./routes/timetable");
const timetableConfigRouter = require("./routes/timetableConfig");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;

// =======================
// 🧩 中间件配置
// =======================
app.use(express.json());
app.use(cors());

// =======================
// 📦 路由绑定
// =======================
app.use("/api/task", taskRouter);
app.use("/api/user", userRouter);
app.use("/api/square", squareRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/checkins", checkinsRouter);
app.use("/api/shop", shopRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/timetableConfig", timetableConfigRouter);

// =======================
// 🌐 启动 HTTP 服务
// =======================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ HTTP 服务运行中: http://0.0.0.0:${PORT}`);
});

// =======================
// 📡 WebSocket 服务逻辑
// =======================
const wss = new WebSocket.Server({ server });
const clients = new Map(); // userId => ws

wss.on("connection", (ws, req) => {
  console.log("📡 新客户端连接");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      const { type, userId, targetId, content } = data;

      // ✅ 初始化连接（绑定 userId）
      if (type === "init") {
        clients.set(userId, ws);
        ws.userId = userId;
        console.log(`🔐 用户 ${userId} 上线`);
        return;
      }

      // ✅ 处理私聊消息
      if (type === "chat") {
        const targetSocket = clients.get(targetId);
        const messagePayload = {
          from: userId,
          content,
          time: new Date().toISOString()
        };

        // 如果目标在线，转发消息
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify(messagePayload));
        }

        // 👉 TODO：写入数据库记录（你可以封装一个 insertChatMessage(data) 函数）
        return;
      }

    } catch (err) {
      console.error("❌ 消息解析失败:", err);
    }
  });

  ws.on("close", () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      console.log(`🚪 用户 ${ws.userId} 下线`);
    }
  });
});