// utils/ws.ts
let socket = null;
let listeners = {
  chat: [],
  notify: [],
  read_ack: [],
};

let userId: number;

export function initWebSocket(_userId: number) {
  if (socket) return;
  userId = _userId;
  socket = wx.connectSocket({
    url: `wss://mutualcampus.top/ws?userId=${userId}`
  });

  socket.onOpen(() => {
    sendMessage({ type: 'init', userId });
    startHeartbeat();
  });

  socket.onMessage((res) => {
    const data = JSON.parse(res.data);
    console.log('🛰️ WebSocket 收到消息:', data); // ✅ 看这条有没有打印
    const type = data.type;

    if (listeners[type]) {
      listeners[type].forEach(fn => fn(data));
    }
  });

  socket.onClose(() => {
    console.warn('WebSocket closed, retrying in 3s');
    socket = null;
    setTimeout(() => initWebSocket(userId), 3000);
  });
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