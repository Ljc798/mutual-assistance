Page({
    data: {
      targetId: '',
      userId: '',
      messages: [],
      inputText: '',
      socketOpen: false,
      socketUrl: '',
    },
  
    onLoad(options: any) {
      const app = getApp();
      const userId = app.globalData.userInfo?.id;
      const targetId = options.targetId;
  
      if (!userId || !targetId) {
        wx.showToast({ title: '聊天对象缺失', icon: 'none' });
        return;
      }
  
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
  
        // 主动发送身份初始化
        wx.sendSocketMessage({
          data: JSON.stringify({
            type: "init",
            userId: this.data.userId,
            targetId: this.data.targetId,
          })
        });
      });
  
      wx.onSocketMessage((res) => {
        const msg = JSON.parse(res.data);
  
        // 接收到的消息不属于当前会话，忽略
        if (
          msg.sender_id !== this.data.targetId &&
          msg.sender_id !== this.data.userId
        ) return;
  
        const newMessage = {
          ...msg,
          isSelf: msg.sender_id === this.data.userId,
          is_read: true
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
  
    onInput(e: any) {
      this.setData({ inputText: e.detail.value });
    },
  
    sendMessage() {
      const { inputText, userId, targetId } = this.data;
      if (!inputText.trim()) return;
  
      const msg = {
        type: "chat",
        sender_id: userId,
        receiver_id: targetId,
        content: inputText,
        created_time: new Date().toISOString(),
        is_read: false
      };
  
      if (this.data.socketOpen) {
        wx.sendSocketMessage({
          data: JSON.stringify(msg),
          success: () => {
            const selfMsg = { ...msg, isSelf: true, is_read: true };
            this.setData({
              messages: [...this.data.messages, selfMsg],
              inputText: ''
            }, () => {
              this.saveToLocalCache(selfMsg);
            });
          },
          fail: (err) => {
            wx.showToast({ title: "发送失败", icon: "none" });
            console.error("❌ 发送失败:", err);
          }
        });
      }
    },
  
    loadLocalMessages(userId: string, targetId: string) {
      const allHistory = wx.getStorageSync("chatHistory") || {};
      const messages = allHistory[targetId] || [];
  
      const mappedMessages = messages.map((msg: any) => ({
        ...msg,
        isSelf: msg.sender_id === userId
      }));
  
      this.setData({ messages: mappedMessages });
    },
  
    saveToLocalCache(message: any) {
      const history = wx.getStorageSync("chatHistory") || {};
      const key = message.receiver_id === this.data.userId ? message.sender_id : message.receiver_id;
  
      if (!history[key]) history[key] = [];
      history[key].push(message);
      wx.setStorageSync("chatHistory", history);
    },
  
    onUnload() {
      wx.closeSocket();
    },
  
    handleBack() {
      wx.navigateBack({ delta: 1 });
    }
  });