Page({
    data: {
        targetId: '',
        targetName: '',
        userId: '',
        messages: [],
        inputText: '',
        socketOpen: false,
        socketUrl: '',
        scrollIntoView: 'bottom-anchor',
    },

    onLoad(options: any) {
        console.log('[onLoad] options:', options);
        const app = getApp();
        const userId = Number(app.globalData.userInfo?.id);
        const targetId = Number(options.targetId);
        const targetName = options.targetName || '对方用户';

        if (!userId || !targetId) {
            wx.showToast({ title: '聊天对象缺失', icon: 'none' });
            return;
        }

        const room_id = this.getRoomId(userId, targetId);

        console.log('[onLoad] userId:', userId, 'targetId:', targetId, 'room_id:', room_id);

        this.setData({
            userId,
            targetId,
            targetName,
            room_id: this.getRoomId(userId, targetId),
            socketUrl: `wss://mutualcampus.top/ws?userId=${userId}`,
        });

        this.fetchHistoryMessages();
        this.initWebSocket();
    },

    onUnload() {
        console.log('[onUnload] 清除心跳并关闭 socket');
        this.stopHeartbeat();
        wx.closeSocket();
    },

    onHide() {
        console.log('[onHide] 页面隐藏，停止心跳');
        this.stopHeartbeat();
    },

    onShow() {
        console.log('[onShow] 页面展示，尝试重连 WebSocket');
        wx.getNetworkType({
            success: (res) => {
                console.log('[onShow] 当前网络类型:', res.networkType);
                if (res.networkType !== 'none' && !this.data.socketOpen) {
                    console.log('[onShow] socket 不在线，重新连接');
                    this.reconnectWebSocket();
                }
            }
        });

        wx.nextTick(() => {
            this.scrollToBottom();
        });

        this.checkReadStatus();
    },

    startHeartbeat() {
        this.stopHeartbeat();
        console.log('[Heartbeat] 开始');
        this.heartbeatTimer = setInterval(() => {
            if (this.data.socketOpen) {
                wx.sendSocketMessage({
                    data: JSON.stringify({ type: 'ping' }),
                    success: () => console.log('[Heartbeat] ping 成功'),
                    fail: () => {
                        console.warn('[Heartbeat] ping 失败，尝试重连');
                        this.reconnectWebSocket();
                    }
                });
            }
        }, 30000);
    },

    stopHeartbeat() {
        console.log('[Heartbeat] 停止');
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    },

    reconnectWebSocket() {
        console.log('[reconnectWebSocket] 重连中...');
        this.setData({ socketOpen: false });
        wx.closeSocket();
        setTimeout(() => this.initWebSocket(), 1000);
    },

    getRoomId(userA, userB) {
        const sorted = [Number(userA), Number(userB)].sort((a, b) => a - b);
        return `room_${sorted[0]}_${sorted[1]}`;
    },

    fetchHistoryMessages() {
        const { room_id, userId } = this.data;
        wx.request({
          url: `https://mutualcampus.top/api/messages/history`,
          method: 'GET',
          data: { room_id },
          success: (res) => {
            if (res.data.success && Array.isArray(res.data.messages)) {
              const history = res.data.messages.map((msg) => {
                const date = new Date(msg.created_time);
                date.setHours(date.getHours() - 8); // UTC ➝ 本地时间
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return {
                  ...msg,
                  isSelf: msg.sender_id === userId,
                  created_time_formatted: `${hours}:${minutes}`,
                };
              });
      
              // ✅ 找出最后一条自己发的消息（用于显示已读状态）
              const lastSelfMessage = [...history].reverse().find(msg => msg.isSelf);
              const lastSelfMessageId = lastSelfMessage ? lastSelfMessage.id : null;
      
              this.setData({
                messages: history,
                lastSelfMessageId: lastSelfMessageId, // ✅ 存到 data
              }, () => {
                wx.nextTick(() => {
                  this.scrollToBottom();
                });
              });
            }
          },
          fail: () => {
            wx.showToast({ title: '消息历史获取失败', icon: 'none' });
          },
        });
      },


    initWebSocket() {
        console.log('[initWebSocket] 开始连接:', this.data.socketUrl);
        wx.connectSocket({
            url: this.data.socketUrl,
            success: () => console.log('[initWebSocket] 发起连接成功'),
            fail: (err) => console.error('[initWebSocket] 连接失败:', err),
        });

        wx.onSocketOpen(() => {
            console.log('[WebSocket] ✅ 连接成功');
            this.setData({ socketOpen: true });
            this.startHeartbeat();

            wx.sendSocketMessage({
                data: JSON.stringify({
                    type: 'init',
                    userId: this.data.userId,
                }),
                success: () => console.log('[WebSocket] 发送初始化成功'),
                fail: (err) => console.error('[WebSocket] 发送初始化失败:', err),
            });
        });

        wx.onSocketMessage((res) => {
            console.log('[WebSocket] 📩 收到消息:', res);
            const msg = JSON.parse(res.data);

            if (msg.selfEcho) return;

            const { userId, targetId } = this.data;
            const from = Number(msg.sender_id);
            const to = Number(msg.receiver_id);
            const localUserId = Number(this.data.userId);
            const localTargetId = Number(this.data.targetId);

            if (![from, to].includes(localUserId) || ![from, to].includes(localTargetId)) {
                console.log('[WebSocket] 🚫 不属于当前会话（userId:', localUserId, 'targetId:', localTargetId, '）');
                return;
            }

            const date = new Date(msg.created_time);
            date.setHours(date.getHours() - 8);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            const newMsg = {
                ...msg,
                isSelf: from === userId,
                is_read: true,
                created_time_formatted: `${hours}:${minutes}`,
            };

            const updatedMessages = [...this.data.messages, newMsg];
            console.log('[WebSocket] 📬 更新 messages:', updatedMessages);
            this.setData({ messages: updatedMessages }, this.scrollToBottom);
        });

        wx.onSocketError((err) => {
            console.error('[WebSocket] ❌ 连接错误:', err);
        });
    },

    checkReadStatus() {
        const { room_id, userId } = this.data;
        wx.request({
          url: `https://yourapi.com/api/messages/read-status`,
          method: 'GET',
          data: { room_id },
          success: (res) => {
            const lastReadId = res.data.last_read_message_id;
            this.setData({ lastReadMessageId: lastReadId });
          },
          fail: () => {
            console.warn('获取已读状态失败');
          }
        });
      },

      markMessagesAsRead() {
        const { room_id, userId } = this.data;
        wx.request({
          url: 'https://mutualcampus.top/api/messages/mark-read',
          method: 'POST',
          data: {
            room_id,
            user_id: userId
          },
          success: (res) => {
            console.log('[已读] 标记成功', res.data);
          },
          fail: () => {
            console.warn('[已读] 标记失败');
          }
        });
      },

    onInput(e: any) {
        this.setData({ inputText: e.detail.value });
    },

    sendMessage() {
        const { inputText, userId, targetId, room_id } = this.data;
        if (!inputText.trim()) return;

        const msg = {
            type: 'chat',
            userId,
            targetId,
            room_id,
            content: inputText,
        };


        if (this.data.socketOpen) {
            wx.sendSocketMessage({
                data: JSON.stringify(msg),
                success: () => {
                    const now = new Date();
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');

                    const selfMsg = {
                        ...msg,
                        sender_id: userId,
                        receiver_id: targetId,
                        isSelf: true,
                        is_read: true,
                        created_time: now.toISOString(),
                        created_time_formatted: `${hours}:${minutes}`,
                    };
                    const updatedMessages = [...this.data.messages, selfMsg];
                    console.log('[sendMessage] 添加本地消息:', updatedMessages);
                    this.setData({
                        messages: updatedMessages,
                        inputText: '',
                    }, () => {
                        wx.nextTick(() => {
                            this.scrollToBottom();
                        });
                    });
                },
                fail: (err) => {
                    wx.showToast({ title: '发送失败', icon: 'none' });
                    console.error('[sendMessage] ❌ 失败:', err);
                },
            });
        }
    },

    scrollToBottom() {
        console.log('[scrollToBottom] 触发滚动到底部');
        this.setData({ scrollIntoView: 'bottom-anchor' });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    },
});