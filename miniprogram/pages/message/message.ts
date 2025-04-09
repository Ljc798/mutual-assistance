interface ChatItem {
    target_id: number;
    username: string;
    avatar_url: string;
    last_msg: string;
    last_time: string;
    unread: number;
}

Page({
    data: {
        chatList: [],
        userId: null,
        latestNotification: {},
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
        this.loadChatList(); // 返回时刷新
        this.fetchLatestNotification();
    },

    loadChatList() {
        const token = wx.getStorageSync("token");
        if (!token) {
            wx.showToast({ title: "未登录", icon: "none" });
            return;
        }

        wx.request({
            url: `https://mutualcampus.top/api/messages/list?userId=${this.data.userId}`,
            method: "GET",
            header: {
                Authorization: `Bearer ${token}`
            },
            success: (res) => {
                console.log(res);

                if (res.data.success) {
                    const raw = res.data.chats;

                    // 提取目标用户 id（不是自己的那一方）
                    const chatList = raw.map(msg => {
                        const isSender = msg.sender_id === this.data.userId;
                        const target_id = isSender ? msg.receiver_id : msg.sender_id;
                        return {
                            target_id,
                            username: msg.username,
                            avatar_url: msg.avatar_url,
                            last_message: msg.content,
                            timestamp: msg.created_time,
                            unread: msg.is_read ? 0 : 1 // 暂时不做累计未读数
                        };
                    });

                    this.setData({ chatList });
                } else {
                    wx.showToast({ title: res.data.message || "加载失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    goToChat(e) {
        const targetId = e.currentTarget.dataset.targetid;
        const targetName = e.currentTarget.dataset.username;
        wx.navigateTo({
            url: `/pages/chat/chat?targetId=${targetId}&targetName=${targetName}`
        });
    },

    fetchLatestNotification() {
        const token = wx.getStorageSync('token');
        wx.request({
            url: 'https://mutualcampus.top/api/notification/latest',
            method: 'GET',
            header: {
                Authorization: `Bearer ${token}`
            },
            success: (res) => {
                if (res.data.success) {
                    this.setData({ latestNotification: res.data.notification || {} });
                }
            }
        });
    },

    goToSystemNotifications() {
        wx.navigateTo({
            url: '/pages/notifications/notifications'
        });
    },
});