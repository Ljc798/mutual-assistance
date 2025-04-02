    Page({
        data: {
            targetId: '',
            targetName: '',
            userId: '',
            messages: [],
            inputText: '',
            socketOpen: false,
            socketUrl: '',
            scrollIntoView: 'bottom-anchor', // 👈 滚动到底部锚点
        },

        onLoad(options: any) {
            const app = getApp();
            const userId = app.globalData.userInfo?.id;
            const targetId = options.targetId;
            const targetName = options.targetName || '对方用户';

            if (!userId || !targetId) {
                wx.showToast({ title: '聊天对象缺失', icon: 'none' });
                return;
            }

            this.setData({
                userId,
                targetId,
                targetName,
                socketUrl: `wss://mutualcampus.top/ws?userId=${userId}`
            });

            this.fetchHistoryMessages(userId, targetId); // 拉取历史消息
            this.initWebSocket();
        },

        // ✅ 拉取历史消息（来自后端）
        fetchHistoryMessages(userId: string, targetId: string) {
            wx.request({
                url: `https://mutualcampus.top/api/messages/history`,
                method: 'GET',
                data: { userId, targetId },
                success: (res) => {
                    if (res.data.success && Array.isArray(res.data.messages)) {
                        const history = res.data.messages.map(msg => ({
                            ...msg,
                            isSelf: msg.sender_id === userId
                        }));
                        this.setData({ messages: history }, this.scrollToBottom);
                    }
                },
                fail: () => {
                    wx.showToast({ title: '消息历史获取失败', icon: 'none' });
                }
            });
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
                        userId: this.data.userId
                    })
                });
            });

            wx.onSocketMessage((res) => {
                const msg = JSON.parse(res.data);
                console.log("📩 收到消息:", msg); // 加这一行
                const { sender_id, receiver_id } = msg;

                // 接收到的消息不是本次对话的，忽略
                if (
                    ![sender_id, receiver_id].includes(Number(this.data.userId)) ||
                    ![sender_id, receiver_id].includes(Number(this.data.targetId))
                ) return;

                const newMsg = {
                    ...msg,
                    isSelf: sender_id === this.data.userId,
                    is_read: true
                };

                this.setData({
                    messages: [...this.data.messages, newMsg]
                }, this.scrollToBottom);
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
                        }, this.scrollToBottom);
                    },
                    fail: (err) => {
                        wx.showToast({ title: "发送失败", icon: "none" });
                        console.error("❌ 发送失败:", err);
                    }
                });
            }
        },

        scrollToBottom() {
            this.setData({ scrollIntoView: 'bottom-anchor' });
        },

        onUnload() {
            wx.closeSocket();
        },

        handleBack() {
            wx.navigateBack({ delta: 1 });
        }
    });