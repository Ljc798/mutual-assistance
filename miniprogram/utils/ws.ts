let socket = null;
let listeners = {
  chat: [],
  notify: [],
  read_ack: [],
};

let userId: number;
let unreadCount = 0; // ✅ 未读消息计数器

export function initWebSocket(_userId: number) {
  if (socket) return;
  userId = _userId;

  socket = wx.connectSocket({
    url: `wss://mutualcampus.top/ws?userId=${userId}`
  });

  socket.onOpen(() => {
    console.log('🌐 WebSocket 已连接');
    sendMessage({ type: 'init', userId });
    startHeartbeat();
  });

  socket.onMessage((res) => {
    const data = JSON.parse(res.data);
    console.log('🛰️ WebSocket 收到消息:', data);

    const type = data.type;

    if (type === 'notify') {
      unreadCount += 1;
      // ✅ 向页面广播未读数变化
      wx?.emit?.('notifyUnreadChanged', unreadCount);
    }

    if (listeners[type]) {
      listeners[type].forEach(fn => fn(data));
    }
  });

  socket.onClose(() => {
    console.warn('⚠️ WebSocket 已关闭，3 秒后重连');
    socket = null;
    setTimeout(() => initWebSocket(userId), 3000);
  });
}

// ✅ 获取未读消息数量
export function getUnreadCount() {
  return unreadCount;
}

// ✅ 重置未读计数（例如进入消息页后）
export function resetUnreadCount() {
  unreadCount = 0;
  wx?.emit?.('notifyUnreadChanged', unreadCount); // 通知更新 UI
}

export function sendMessage(msg: any) {
  if (socket?.readyState === 1) {
    socket.send({ data: JSON.stringify(msg) });
  }
}

function startHeartbeat() {
  setInterval(() => {
    if (socket?.readyState === 1) {
      socket.send({ data: JSON.stringify({ type: 'ping' }) });
    }
  }, 30000);
}

export function on(type: string, handler: Function) {
  if (listeners[type]) {
    listeners[type].push(handler);
  }
}

export function off(type: string, handler: Function) {
  if (listeners[type]) {
    listeners[type] = listeners[type].filter(fn => fn !== handler);
  }
}