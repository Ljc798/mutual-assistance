Page({
    data: {
      targetId: '',
      userId: '',
      messages: [],
      inputText: '',
      socketOpen: false,
      socketUrl: '',
    },
  
    onLoad(options) {
      const app = getApp();
      const userId = app.globalData.userInfo?.id;
      const targetId = options.targetId;
  
      this.setData({
        userId,
        targetId,
        socketUrl: `wss://mutualcampus.top/ws?userId=${userId}`
      });
  
      this.loadLocalMessages(userId, targetId);
      this.initWebSocket();
    },
  
    initWebSocket() {
      wx.connectSocket({
        url: this.data.socketUrl,
        success: () => console.log("🔌 WebSocket 发起连接"),
        fail: (err) => console.error("❌ WebSocket 连接失败", err),
      });
  
      wx.onSocketOpen(() => {
        this.setData({ socketOpen: true });
        console.log("✅ WebSocket 连接成功");
      });
  
      wx.onSocketMessage((res) => {
        const msg = JSON.parse(res.data);
  
        if (msg.from !== this.data.targetId && msg.from !== this.data.userId) return;
  
        const newMessage = {
          ...msg,
          isSelf: msg.from === this.data.userId,
          is_read: true,
        };
  
        this.setData({
          messages: [...this.data.messages, newMessage]
        }, () => {
          this.saveToLocalCache(newMessage);
        });
      });
  
      wx.onSocketError((err) => {
        console.error("❌ WebSocket 错误", err);
      });
    },
  
    onInput(e) {
      this.setData({ inputText: e.detail.value });
    },
  
    sendMessage() {
      const { inputText, userId, targetId } = this.data;
      if (!inputText.trim()) return;
  
      const msg = {
        type: "chat",
        from: userId,
        to: targetId,
        content: inputText,
        timestamp: new Date().toISOString(),
        is_read: false
      };
  
      if (this.data.socketOpen) {
        wx.sendSocketMessage({
          data: JSON.stringify(msg),
          success: () => {
            const newMsg = { ...msg, isSelf: true, is_read: true };
            this.setData({
              messages: [...this.data.messages, newMsg],
              inputText: ''
            }, () => {
              this.saveToLocalCache(newMsg);
            });
          },
          fail: (err) => {
            wx.showToast({ title: "发送失败", icon: "none" });
            console.error("❌ 发送失败:", err);
          }
        });
      }
    },
  
    loadLocalMessages(userId, targetId) {
      const history = wx.getStorageSync("chatHistory") || {};
      const messages = history[targetId] || [];
      const updatedMessages = messages.map(m => ({
        ...m,
        isSelf: m.from === userId
      }));
  
      this.setData({ messages: updatedMessages });
    },
  
    saveToLocalCache(message) {
      const history = wx.getStorageSync("chatHistory") || {};
      const key = message.to === this.data.userId ? message.from : message.to;
  
      if (!history[key]) history[key] = [];
      history[key].push(message);
      wx.setStorageSync("chatHistory", history);
    },
  
    onUnload() {
      wx.closeSocket();
    }
  });