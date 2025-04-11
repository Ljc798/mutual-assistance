// ws-helper.js

const clients = new Map(); // userId => WebSocket

/**
 * 向特定用户发送 WebSocket 消息
 */
function sendToUser(userId, payload) {
    const socket = clients.get(userId);
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(payload));
        return true;
    } else {
        console.warn(`⚠️ 用户 ${userId} 不在线，消息未发送`);
        return false;
    }
}

/**
 * 向多个用户广播通知消息
 */
function broadcastNotify(userIds, payload) {
    userIds.forEach((uid) => {
        sendToUser(uid, payload);
    });
}

/**
 * 注册用户 WebSocket（用于初始化绑定）
 */
function registerUser(userId, ws) {
    clients.set(userId, ws);
    ws.userId = userId;
    console.log(`✅ 已注册 WebSocket 用户 ${userId}`);
}

/**
 * 注销用户 WebSocket（断开连接时调用）
 */
function unregisterUser(userId) {
    clients.delete(userId);
    console.log(`❎ 用户 ${userId} 已断开连接`);
}

module.exports = {
    clients,
    sendToUser,
    broadcastNotify,
    registerUser,
    unregisterUser
};