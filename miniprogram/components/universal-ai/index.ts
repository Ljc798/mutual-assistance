interface ChatMessage {
    type: "user" | "ai";
    content: string;
    timestamp: string;
}

import { BASE_URL } from '../../config/env';

const TAP_MOVE_THRESHOLD = 8;     // 小于 8px 视为点击
const TAP_TIME_THRESHOLD = 300;   // 小于 300ms 视为点击

Component({
    properties: {
        apiUrl: { type: String, value: `${BASE_URL}/ai/almighty` }
    },

        data: {
            ballPosition: { x: 0, y: 0 },
        // 拖动/点击判定
        isDragging: false,
        startX: 0,
        startY: 0,
        downX: 0,
        downY: 0,
        downTime: 0,
        moved: false,

        showChatPopup: false,
        chatMessages: [] as ChatMessage[],
        chatInput: "",
        conversationId: "",
        isLoading: false,
            scrollIntoView: "",
            remaining: 0,
            limit: 0,
            dailyBonus: 0,
            quotaRemain: 0,
        },

    lifetimes: {
        attached() {
            this.fetchAiUsage();
            const systemInfo = wx.getSystemInfoSync();
            this.setData({
                ballPosition: {
                    x: systemInfo.windowWidth - 80,
                    y: systemInfo.windowHeight - 200
                }
            });
        },

        ready() {
            this.fetchAiUsage();
        }
    },

    methods: {
        // ------- 小球交互：不再用 bindtap，统一在 touchend 判定 -------
        onTouchStart(e: WechatMiniprogram.TouchEvent) {
            if (this.data.showChatPopup) return;
            const t = e.touches[0];
            this.setData({
                isDragging: true,
                moved: false,
                startX: t.clientX - this.data.ballPosition.x,
                startY: t.clientY - this.data.ballPosition.y,
                downX: t.clientX,
                downY: t.clientY,
                downTime: Date.now()
            });
        },

        onTouchMove(e: WechatMiniprogram.TouchEvent) {
            if (!this.data.isDragging || this.data.showChatPopup) return;

            const t = e.touches[0];
            const sys = wx.getSystemInfoSync();

            let newX = t.clientX - this.data.startX;
            let newY = t.clientY - this.data.startY;

            // 边界限制
            newX = Math.max(0, Math.min(newX, sys.windowWidth - 60));
            newY = Math.max(0, Math.min(newY, sys.windowHeight - 60));

            // 只要移动超阈值，就标记为 moved
            const dx = Math.abs(t.clientX - this.data.downX);
            const dy = Math.abs(t.clientY - this.data.downY);
            if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) {
                this.setData({ moved: true });
            }

            this.setData({ ballPosition: { x: newX, y: newY } });
        },

        onTouchEnd() {
            const pressTime = Date.now() - this.data.downTime;

            // 结束拖动
            this.setData({ isDragging: false });

            // “点击”判定：时间短 & 几乎没位移
            if (!this.data.moved && pressTime < TAP_TIME_THRESHOLD) {
                this.openChatPopup();
            }
        },

        // ------- 弹窗 & 聊天 -------
        openChatPopup() {
            this.setData({
                showChatPopup: true,
                chatMessages: [],
                conversationId: "",
                chatInput: ""
            });

            const welcomeMessage: ChatMessage = {
                type: "ai",
                content: "你好，我是全能 AI 助手，有什么可以帮你的吗？",
                timestamp: new Date().toLocaleTimeString()
            };

            this.setData({ chatMessages: [welcomeMessage] });
            setTimeout(() => this.scrollToBottom(), 300);
        },

        closeChatPopup() {
            this.setData({ showChatPopup: false });
        },

        handleChatInput(e: WechatMiniprogram.Input) {
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
                const response: any = await new Promise((resolve, reject) => {
                    wx.request({
                        url: this.properties.apiUrl,     // 指向刚才这个后端路由
                        method: "POST",
                        data: {
                            query: chatInput,
                            conversation_id: conversationId || null,
                        },
                        header: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        success: resolve,
                        fail: reject
                    });
                });

                const { data } = response;

                if (data?.success && typeof data?.answer === "string") {
                    const aiMessage: ChatMessage = {
                        type: "ai",
                        content: data.answer || "（没有得到回答）",
                        timestamp: new Date().toLocaleTimeString()
                    };
                    this.setData({
                        chatMessages: [...this.data.chatMessages, aiMessage],
                        conversationId: data.conversation_id || conversationId || null,
                        isLoading: false
                    });
                    this.fetchAiUsage();
                    this.scrollToBottom();
                } else {
                    this.setData({ isLoading: false });
                    wx.showToast({ title: data?.message || "AI 回复失败", icon: "none" });
                }
            } catch (err) {
                console.error("发送消息失败:", err);
                this.setData({ isLoading: false });
                wx.showToast({ title: "网络异常", icon: "none" });
            }
        },

        scrollToBottom() {
            setTimeout(() => this.setData({ scrollIntoView: "last-message" }), 100);
        },

        async fetchAiUsage() {
            const token = wx.getStorageSync("token");
            const res = await new Promise((resolve, reject) => {
                wx.request({
                    url: `${BASE_URL}/ai/almighty/usage`,
                    header: { Authorization: `Bearer ${token}` },
                    success: resolve,
                    fail: reject,
                });
            });

            let { remaining, limit, daily_bonus, quota_remain } = res.data as any;
            if (typeof remaining === 'string') {
                remaining = remaining === '无限' ? -1 : 0;
            }
            if (limit === null || limit === undefined) {
                limit = -1;
            }
            this.setData({ remaining, limit, dailyBonus: Number(daily_bonus || 0), quotaRemain: Number(quota_remain || 0) });
        },
    }
});