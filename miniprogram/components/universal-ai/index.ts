interface ChatMessage {
    type: "user" | "ai";
    content: string;
    timestamp: string;
    isFormatted?: boolean;
}

import { BASE_URL } from '../../config/env';

const TAP_MOVE_THRESHOLD = 8;     // 小于 8px 视为点击
const TAP_TIME_THRESHOLD = 300;   // 小于 300ms 视为点击

const CODE_ROUTE_MAP: Record<string, string> = {
    // 基础页
    home: '/pages/home/home',
    square: '/pages/square/square',
    publish: '/pages/publish/publish',
    message: '/pages/message/message',
    user: '/pages/user/user',
    task: '/pages/task/task',
    order: '/pages/order/order',
    timetable: '/pages/timetable/timetable',
    register: '/pages/register/register',
    course: '/pages/course/course',
    shop: '/pages/shop/shop',
    chat: '/pages/chat/chat',
    wallet: '/pages/wallet/wallet',
    vip: '/pages/vip/vip',
    mysquare: '/pages/mysquare/mysquare',
    notifications: '/pages/notifications/notifications',
    schools: '/pages/schools/schools',
    reputation: '/pages/reputation/reputation',
    profile: '/pages/user/profile',

    // 带中划线/下划线别名
    'task-list': '/pages/task-list/task-list',
    task_list: '/pages/task-list/task-list',
    'square-detail': '/pages/square-detail/square-detail',
    square_detail: '/pages/square-detail/square-detail',
    'edit-profile': '/pages/edit-profile/edit-profile',
    edit_profile: '/pages/edit-profile/edit-profile',
    'timetable-config': '/pages/timetable-config/timetable-config',
    timetable_config: '/pages/timetable-config/timetable-config',
    'edit-task': '/pages/edit-task/edit-task',
    edit_task: '/pages/edit-task/edit-task',

    // 子页映射
    'mysquare/edit': '/pages/mysquare/edit',
    mysquare_edit: '/pages/mysquare/edit',
    'order/other-orders': '/pages/order/other-orders',
    'other-orders': '/pages/order/other-orders',
    other_orders: '/pages/order/other-orders',
    'agreements/terms': '/pages/agreements/terms',
    terms: '/pages/agreements/terms',
    'agreements/privacy': '/pages/agreements/privacy',
    privacy: '/pages/agreements/privacy',
    'user/profile': '/pages/user/profile',
    user_profile: '/pages/user/profile',
};

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
        isSVIP: false,
        showActionButton: false,
        actionButtonLabel: "",
        actionPayload: null as any,
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
            const app = getApp();
            const level = Number(app?.globalData?.userInfo?.vip_level || 0);
            this.setData({ isSVIP: level === 2 });
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
                chatInput: "",
                showActionButton: false,
                actionButtonLabel: "",
                actionPayload: null
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
                    const handled = this.handleAiReply(data.answer);
                    this.setData({
                        conversationId: data.conversation_id || conversationId || null,
                        isLoading: false
                    });
                    this.fetchAiUsage();
                    if (!handled) this.scrollToBottom();
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
            // 同步 SVIP 状态（防止组件挂载时未加载用户信息）
            const app = getApp();
            const level = Number(app?.globalData?.userInfo?.vip_level || 0);
            this.setData({ isSVIP: level === 2 });
        },

        handleAiReply(reply: string) {
            try {
                const jsonMatch = reply.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const json = JSON.parse(jsonMatch[0]);
                    const rest = reply.replace(jsonMatch[0], "").replace(/^[\s\n]+/, "");
                    const replyText =
                        (typeof json.reply === "string" && json.reply.trim())
                            || (typeof json.message === "string" && json.message.trim())
                            || rest
                            || "（没有得到回答）";

                    const newMessage: ChatMessage = {
                        type: "ai",
                        content: replyText,
                        timestamp: new Date().toLocaleTimeString()
                    };

                    // 解析按钮
                    let btnText = "";
                    let btnCode = "";
                    const btn = json.button;
                    if (Array.isArray(btn)) {
                        const b = btn[0] || {};
                        btnText = String(b.text || "");
                        btnCode = String(b.code || "");
                    } else if (typeof btn === "object" && btn) {
                        btnText = String(btn.text || "");
                        btnCode = String(btn.code || "");
                    } else if (typeof btn === "string") {
                        btnText = btn;
                    }

                    this.setData({
                        chatMessages: [...this.data.chatMessages, newMessage],
                        showActionButton: !!btnText,
                        actionButtonLabel: btnText || "",
                        actionPayload: btnCode ? { code: btnCode } : null,
                    });
                    this.scrollToBottom();
                    return true;
                }
            } catch {}
            const aiMessage: ChatMessage = {
                type: "ai",
                content: reply || "（没有得到回答）",
                timestamp: new Date().toLocaleTimeString()
            };
            this.setData({ chatMessages: [...this.data.chatMessages, aiMessage] });
            return false;
        },

        async triggerAiAction() {
            const action = this.data.actionPayload;
            if (!action) return;
            try {
                if (action.code) {
                    console.log('[universal-ai] trigger action:', action);
                    const code: string = String(action.code).trim();
                    const url = safePageUrlFromCode(code);
                    console.log('[universal-ai] navigate url:', url, 'from code:', code);
                    const pages = getCurrentPages();
                    const useRedirect = pages.length >= 9;
                    const navigate = () => new Promise<void>((resolve, reject) => {
                        (useRedirect ? wx.redirectTo : wx.navigateTo)({
                            url: url || '',
                            success: () => resolve(),
                            fail: (err) => {
                                console.error('[universal-ai] navigate fail:', err, 'url:', url);
                                reject(new Error('navigate'));
                            },
                        });
                    });
                    try {
                        await navigate();
                        this.setData({ showActionButton: false, actionButtonLabel: '', actionPayload: null });
                        return;
                    } catch {
                        try {
                            await new Promise<void>((resolve, reject) => {
                                wx.reLaunch({
                                    url: url || '',
                                    success: () => resolve(),
                                    fail: (err) => {
                                        console.error('[universal-ai] reLaunch fail:', err, 'url:', url);
                                        reject(new Error('relaunch'));
                                    }
                                });
                            });
                            this.setData({ showActionButton: false, actionButtonLabel: '', actionPayload: null });
                            return;
                        } catch {
                            wx.showToast({ title: '跳转失败', icon: 'none' });
                        }
                    }
                    return;
                }
                wx.showToast({ title: "未提供跳转页面", icon: "none" });
            } catch (e) {
                console.error('[universal-ai] triggerAiAction exception:', e);
                wx.showToast({ title: "跳转失败", icon: "none" });
            }
        },

        // 保留空占位，未来如需扩展其他处理再加
    }
});
function safePageUrlFromCode(codeRaw: string): string | null {
    let code = String(codeRaw || '').trim();
    code = code.replace(/[\s\n]+/g, ' ');
    code = code.replace(/["']/g, '');
    code = code.replace(/[\)\}]+/g, '');
    const parts = code.split('?');
    let path = parts[0].trim();
    const query = parts[1] ? `?${parts.slice(1).join('?')}` : '';
    if (path.startsWith('pages/')) path = `/${path}`;
    if (!path.startsWith('/')) {
        const mapped = CODE_ROUTE_MAP[path];
        if (mapped) path = mapped;
    }
    const m = path.match(/^\/pages\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?$/);
    if (!m) {
        const seg = path.replace(/^\//, '').split('/');
        const last = seg.pop() || '';
        if (last) path = `/pages/${last}/${last}`;
    }
    const valid = path.match(/^\/pages\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/);
    if (!valid) return null;
    return `${path}${query}`;
}
