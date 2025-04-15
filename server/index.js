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
const paymentRouter = require("./routes/payment");
const timetableRouter = require("./routes/timetable");
const timetableConfigRouter = require("./routes/timetableConfig");
const messagesRouter = require("./routes/messages");
const walletRouter = require("./routes/wallet");
const vipRouter = require("./routes/vip");
const feedbackRouter = require("./routes/feedback");
const notificationRouter = require("./routes/notification");
const taskPaymentRouter = require("./routes/taskPayment");
const orderRouter = require("./routes/order");

const { registerUser, unregisterUser, sendToUser, broadcastNotify } = require("./routes/ws-helper");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;

// =======================
// 🧹 中间件配置
// =======================
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use("/api/payment", paymentRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/timetableConfig", timetableConfigRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/vip", vipRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/taskPayment", taskPaymentRouter);
app.use("/api/order", orderRouter);

app.get("/", (req, res) => {
    res.redirect("https://admin.mutualcampus.top");
});

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

function getRoomId(userA, userB) {
    const sorted = [userA, userB].sort((a, b) => a - b);
    return `room_${sorted[0]}_${sorted[1]}`;
}

wss.on("connection", (ws) => {
    ws.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg);
            const { type, userId, targetId, content } = data;

            if (type === "init") {
                registerUser(userId, ws);
                return;
            }

            if (type === "chat") {
                if (!userId || !targetId || !content) {
                    console.warn("⚠️ 消息字段缺失");
                    return;
                }

                const timestamp = dayjs().add(8, "hour").format("YYYY-MM-DD HH:mm:ss");
                const roomId = getRoomId(userId, targetId);

                const [result] = await db.query(
                    `INSERT INTO messages (room_id, sender_id, receiver_id, content, type, created_time, is_read)
                     VALUES (?, ?, ?, ?, 'text', ?, 0)`,
                    [roomId, userId, targetId, content, timestamp]
                );

                const messagePayload = {
                    type: "chat",
                    id: result.insertId,
                    sender_id: userId,
                    receiver_id: targetId,
                    content,
                    room_id: roomId,
                    message_type: "text",
                    created_time: timestamp,
                };

                sendToUser(targetId, messagePayload);
                sendToUser(userId, { ...messagePayload, selfEcho: true });

                const notifyPayload = {
                    type: "notify",
                    content: `你收到来自用户 ${userId} 的新消息`,
                    created_time: timestamp
                };

                console.log("📢 推送 notify 给用户", targetId, notifyPayload);
                sendToUser(targetId, notifyPayload);
            }

            if (type === "notify") {
                const notifyPayload = {
                    type: "notify",
                    title: data.title || "系统通知",
                    content: data.content || "",
                    created_time: dayjs().add(8, "hour").format("YYYY-MM-DD HH:mm:ss"),
                };

                if (Array.isArray(data.to)) {
                    broadcastNotify(data.to, notifyPayload);
                } else if (data.to) {
                    sendToUser(data.to, notifyPayload);
                } else {
                    console.warn("⚠️ notify 缺少目标用户");
                }
            }

        } catch (err) {
            console.error("❗ 消息处理异常:", err);
            try {
                ws.send(JSON.stringify({ type: "error", message: "服务器处理消息失败" }));
            } catch (e) {
                console.error("⚠️ 无法向客户端发送错误提示", e);
            }
        }
    });

    ws.on("close", () => {
        if (ws.userId) {
            unregisterUser(ws.userId);
        }
    });
});