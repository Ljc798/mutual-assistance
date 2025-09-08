// 定义聊天消息类型
interface ChatMessage {
  type: "user" | "ai";
  content: string;
  timestamp: string;
}

Component({
  properties: {
    apiUrl: {
      type: String,
      value: "https://mutualcampus.top/api/ai/extract"
    }
  },

  data: {
    ballPosition: { x: 0, y: 0 },
    isDragging: false,
    startX: 0,
    startY: 0,
    showChatPopup: false,
    chatMessages: [] as ChatMessage[],
    chatInput: "",
    conversationId: "",
    isLoading: false,
    scrollIntoView: ""
  },

  lifetimes: {
    attached() {
      const systemInfo = wx.getSystemInfoSync();
      this.setData({
        ballPosition: {
          x: systemInfo.windowWidth - 80,
          y: systemInfo.windowHeight - 200
        }
      });
    }
  },

  methods: {
    onTouchStart(e: any) {
      if (this.data.showChatPopup) return;
      const touch = e.touches[0];
      this.setData({
        isDragging: true,
        startX: touch.clientX - this.data.ballPosition.x,
        startY: touch.clientY - this.data.ballPosition.y
      });
    },

    onTouchMove(e: any) {
      if (!this.data.isDragging || this.data.showChatPopup) return;
      const touch = e.touches[0];
      const systemInfo = wx.getSystemInfoSync();
      let newX = touch.clientX - this.data.startX;
      let newY = touch.clientY - this.data.startY;
      newX = Math.max(0, Math.min(newX, systemInfo.windowWidth - 60));
      newY = Math.max(0, Math.min(newY, systemInfo.windowHeight - 60));
      this.setData({ ballPosition: { x: newX, y: newY } });
    },

    onTouchEnd() {
      this.setData({ isDragging: false });
    },

    onBallTap() {
      console.log("onBallTap called, isDragging:", this.data.isDragging);
      if (this.data.isDragging) {
        console.log("Still dragging, ignoring tap");
        return;
      }
      console.log("Opening chat popup");
      this.openChatPopup();
    },

    openChatPopup() {
      console.log("openChatPopup called");
      this.setData({
        showChatPopup: true,
        chatMessages: [],
        conversationId: "",
        chatInput: ""
      });
      
      const welcomeMessage: ChatMessage = {
        type: "ai",
        content: "?? 你好！我是你的全能AI助手，有什么可以帮助你的吗？",
        timestamp: new Date().toLocaleTimeString()
      };
      
      this.setData({ chatMessages: [welcomeMessage] });
      setTimeout(() => { this.scrollToBottom(); }, 300);
    },

    closeChatPopup() {
      this.setData({ showChatPopup: false });
    },

    handleChatInput(e: any) {
      this.setData({ chatInput: e.detail.value });
    },

    async sendChatMessage() {
      const { chatInput, chatMessages, conversationId } = this.data;
      if (!chatInput.trim()) return;

      const token = wx.getStorageSync("token");
      if (!token) {
        wx.showToast({ title: "请先登录", icon: "none" });
        return;
      }

      const userMessage: ChatMessage = {
        type: "user",
        content: chatInput,
        timestamp: new Date().toLocaleTimeString()
      };

      this.setData({
        chatMessages: [...chatMessages, userMessage],
        chatInput: "",
        isLoading: true
      });

      this.scrollToBottom();

      try {
        const response = await new Promise((resolve, reject) => {
          wx.request({
            url: this.properties.apiUrl,
            method: "POST",
            data: {
              text: chatInput,
              conversation_id: conversationId
            },
            header: { Authorization: `Bearer ${token}` },
            success: resolve,
            fail: reject
          });
        });

        const { data } = response as any;

        if (data.status === "ok") {
          const aiMessage: ChatMessage = {
            type: "ai",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString()
          };

          this.setData({
            chatMessages: [...this.data.chatMessages, aiMessage],
            conversationId: data.conversation_id || conversationId,
            isLoading: false
          });

          this.scrollToBottom();
        } else {
          this.setData({ isLoading: false });
          wx.showToast({ title: "AI回复失败", icon: "none" });
        }
      } catch (error) {
        console.error("发送消息失败:", error);
        this.setData({ isLoading: false });
        wx.showToast({ title: "网络错误", icon: "none" });
      }
    },

    scrollToBottom() {
      const that = this;
      setTimeout(() => {
        that.setData({ scrollIntoView: "last-message" });
      }, 100);
    }
  }
});
