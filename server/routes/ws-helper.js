// ws-helper.js

// 用户 ID 对应的 WebSocket 实例池（用于单点推送）
const clients = new Map(); // userId => WebSocket

/**
 * 向特定用户发送 WebSocket 消息
 * @param {number} userId 
 * @param {object} payload 消息内容（会被 JSON.stringify）
 * @returns {boolean} 是否成功发送
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
 * 向多个用户广播通知消息（适用于系统推送）
 * @param {number[]} userIds
 * @param {object} payload
 */
function broadcastNotify(userIds, payload) {
  userIds.forEach((uid) => {
    sendToUser(uid, payload);
  });
}

module.exports = {
  clients,
  sendToUser,
  broadcastNotify
};
