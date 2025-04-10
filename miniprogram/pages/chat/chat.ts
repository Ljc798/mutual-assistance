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
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        const targetId = options.targetId;
        const targetName = options.targetName || '对方用户';

        if (!userId || !targetId) {
            wx.showToast({ title: '聊天对象缺失', icon: 'none' });
            return;
        }

        const room_id = this.getRoomId(userId, targetId);

        this.setData({
            userId,
            targetId,
            targetName,
            room_id,
            socketUrl: `wss://mutualcampus.top/ws?userId=${userId}`,
        });

        this.fetchHistoryMessages();
        this.initWebSocket();
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
                    const history = res.data.messages.map((msg) => ({
                        ...msg,
                        isSelf: msg.sender_id === userId,
                    }));
                    this.setData({ messages: history }, this.scrollToBottom);
                }
            },
            fail: () => {
                wx.showToast({ title: '消息历史获取失败', icon: 'none' });
            },
        });
    },

    initWebSocket() {
        wx.connectSocket({
            url: this.data.socketUrl,
            success: () => console.log('🔌 WebSocket 发起连接'),
            fail: (err) => console.error('❌ WebSocket 连接失败', err),
        });

        wx.onSocketOpen(() => {
            this.setData({ socketOpen: true });
            console.log('✅ WebSocket 连接成功');

            // 👇 发送初始化
            wx.sendSocketMessage({
                data: JSON.stringify({
                    type: 'init',
                    userId: this.data.userId,
                }),
            });
        });

        wx.onSocketMessage((res) => {
            const msg = JSON.parse(res.data);
            console.log('📩 收到消息:', msg);

            const { userId, targetId } = this.data;

            // ✅ 判断是不是当前对话双方
            const from = msg.sender_id;
            const to = msg.receiver_id;

            if (![from, to].includes(Number(userId)) || ![from, to].includes(Number(targetId))) return;

            const newMsg = {
                ...msg,
                isSelf: from === userId,
                is_read: true,
            };

            this.setData({ messages: [...this.data.messages, newMsg] }, this.scrollToBottom);
        });

        wx.onSocketError((err) => {
            console.error('❌ WebSocket 错误', err);
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
                    const selfMsg = {
                        ...msg,
                        sender_id: userId,
                        receiver_id: targetId,
                        isSelf: true,
                        is_read: true,
                        created_time: new Date().toISOString(),
                    };
                    this.setData({
                        messages: [...this.data.messages, selfMsg],
                        inputText: '',
                    }, this.scrollToBottom);
                },
                fail: (err) => {
                    wx.showToast({ title: '发送失败', icon: 'none' });
                    console.error('❌ 发送失败:', err);
                },
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
    },
});