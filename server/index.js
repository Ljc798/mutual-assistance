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
const db = require("./config/db");

const wss = new WebSocket.Server({ server });
const clients = new Map(); // userId => ws

wss.on("connection", (ws) => {
  console.log("📡 新客户端连接");

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);
      const { type, sender_id, receiver_id, content } = data;
  
      // 🟢 初始化连接
      if (type === "init") {
        clients.set(sender_id, ws);
        ws.userId = sender_id;
        console.log(`✅ 用户 ${sender_id} 上线`);
  
        // 拉取历史记录（optional）
        if (receiver_id) {
          const [messages] = await db.query(
            `SELECT * FROM messages
             WHERE (sender_id = ? AND receiver_id = ?)
                OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_time ASC`,
            [sender_id, receiver_id, receiver_id, sender_id]
          );
          ws.send(JSON.stringify({ type: "history", messages }));
        }
  
        return;
      }
  
      // 💬 处理私聊消息
      if (type === "chat") {
        const timestamp = new Date();
  
        // ✅ 存入数据库
        const [result] = await db.query(
          `INSERT INTO messages (sender_id, receiver_id, content, type, created_time, is_read) 
           VALUES (?, ?, ?, ?, ?, 0)`,
          [sender_id, receiver_id, content, 'text', timestamp]
        );
  
        const messagePayload = {
          type: "chat",
          id: result.insertId,
          sender_id,
          receiver_id,
          content,
          message_type: 'text',
          created_time: timestamp,
        };
  
        // ✅ 转发给对方
        const targetSocket = clients.get(receiver_id);
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify(messagePayload));
        }
  
        // ✅ 回显给自己
        ws.send(JSON.stringify({ ...messagePayload, selfEcho: true }));
      }
    } catch (err) {
      console.error("❌ 消息处理失败:", err);
    }
  });

  // 🔌 断开连接
  ws.on("close", () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      console.log(`🚪 用户 ${ws.userId} 下线`);
    }
  });
});