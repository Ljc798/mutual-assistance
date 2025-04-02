interface Message {
    from_id: number;
    to_id: number;
    content: string;
    timestamp: string;
    is_read: boolean;
  }
  
  interface ChatHistory {
    [targetUserId: string]: Message[]; // 每个聊天对象一组消息
  }

  Page({
    data: {
      chatList: [],
      userId: null,
    },
  
    onLoad() {
      const app = getApp();
      const userId = app.globalData.userInfo?.id;
  
      if (!userId) {
        wx.showToast({ title: "请先登录", icon: "none" });
        return;
      }
  
      this.setData({ userId });
      this.loadChatList();
    },
  
    onShow() {
      this.loadChatList();
    },
  
    loadChatList() {
      const chatHistory = wx.getStorageSync("chatHistory") || {};
      const chatList = [];
  
      for (const targetId in chatHistory) {
        const messages = chatHistory[targetId];
        if (messages && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          const unreadCount = messages.filter(msg => !msg.is_read && msg.to_id === this.data.userId).length;
  
          chatList.push({
            target_id: parseInt(targetId),
            last_message: lastMsg.content,
            timestamp: lastMsg.timestamp,
            unread: unreadCount,
          });
        }
      }
  
      // 按时间倒序排列
      chatList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
      this.setData({ chatList });
    },
  
    goToChat(e) {
      const targetId = e.currentTarget.dataset.targetid;
      wx.navigateTo({
        url: `/pages/chat/chat?target_id=${targetId}`
      });
    },
  });