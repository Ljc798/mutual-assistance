const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const dayjs = require("dayjs");

const taskRouter = require("./routes/task");
const userRouter = require("./routes/user");
const squareRouter = require("./routes/square");
const uploadsRouter = require("./routes/uploads");
const checkinsRouter = require("./routes/checkins");
const shopRouter = require("./routes/shop");
const timetableRouter = require("./routes/timetable");
const timetableConfigRouter = require("./routes/timetableConfig");
const messagesRouter = require("./routes/messages");

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
app.use("/api/messages", messagesRouter);

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

const wss = new WebSocket.Server({
    server
});
const clients = new Map(); // userId => ws

wss.on("connection", (ws) => {
    console.log("📡 新客户端连接");

    ws.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg);
            const {
                type,
                userId,
                targetId,
                content
            } = data;

            // 🟢 初始化连接：仅绑定 userId
            if (type === "init") {
                clients.set(userId, ws);
                ws.userId = userId;
                console.log(`✅ 用户 ${userId} 上线`);
                return;
            }

            // 💬 处理聊天消息
            if (type === "chat") {
                if (!userId || !targetId || !content) {
                    console.warn("⚠️ 消息字段缺失");
                    return;
                }

                const timestamp = dayjs().add(8, 'hour').format("YYYY-MM-DD HH:mm:ss");

                // 📝 写入数据库
                const [result] = await db.query(
                    `INSERT INTO messages (sender_id, receiver_id, content, type, created_time, is_read)
             VALUES (?, ?, ?, ?, ?, 0)`,
                    [userId, targetId, content, 'text', timestamp]
                );

                const messagePayload = {
                    type: "chat",
                    id: result.insertId,
                    sender_id: userId,
                    receiver_id: targetId,
                    content,
                    message_type: 'text',
                    created_time: timestamp,
                };

                // 📤 推送给目标用户（如果在线）
                const targetSocket = clients.get(targetId);
                if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
                    console.log(`📤 向 ${targetId} 推送消息`);
                    targetSocket.send(JSON.stringify(messagePayload));
                } else {
                    console.warn(`⚠️ 用户 ${targetId} 不在线`);
                }

                // 🔄 回显给发送者
                ws.send(JSON.stringify({
                    ...messagePayload,
                    selfEcho: true
                }));
            }

        } catch (err) {
            console.error("❗ 消息处理异常:", err);
            try {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "服务器处理消息失败"
                }));
            } catch (e) {
                console.error("⚠️ 无法向客户端发送错误提示", e);
            }
        }
    });

    ws.on("close", () => {
        if (ws.userId) {
            clients.delete(ws.userId);
            console.log(`🚪 用户 ${ws.userId} 下线`);
        }
    });
});