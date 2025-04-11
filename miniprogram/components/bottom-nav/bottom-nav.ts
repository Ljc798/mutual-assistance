import { on, off } from '../../utils/ws';

Component({
    data: {
        hasUnread: false,
        unreadCount: 0
    },

    lifetimes: {
        attached() {
            this.checkUnreadStatus();

            // ✅ WebSocket 通知推送实时更新小红点
            this._boundNotify = this.handleNotify.bind(this);
            on('notify', this._boundNotify);
        },
        detached() {
            off('notify', this._boundNotify);
        }
    },

    methods: {
        goToPage(e: WechatMiniprogram.BaseEvent) {
            const page: string = e.currentTarget.dataset.page;
            let url: string;
            switch (page) {
                case 'home':
                    url = '/pages/home/home';
                    break;
                case 'square':
                    url = '/pages/square/square';
                    break;
                case 'publish':
                    url = '/pages/publish/publish';
                    break;
                case 'message':
                    url = '/pages/message/message';
                    this.setData({ hasUnread: false });
                    break;
                case 'user':
                    url = '/pages/user/user';
                    break;
                default:
                    url = '/pages/home/home';
            }

            wx.redirectTo({ url });
        },

        checkUnreadStatus() {
            const token = wx.getStorageSync("token");
            if (!token) return;

            wx.request({
                url: 'https://mutualcampus.top/api/messages/unread-count',
                method: 'GET',
                header: {
                    Authorization: `Bearer ${token}`
                },
                success: (res) => {
                    const count = res.data?.total || 0;
                    this.setData({
                        unreadCount: count,
                        hasUnread: count > 0
                    });
                },
                fail: () => {
                    console.warn('❌ 获取未读消息失败');
                }
            });
        },

        handleNotify(msg: any) {
            console.log("🔴 收到 WebSocket 通知:", msg);
            if (!msg || !msg.content) return;

            // ✅ 收到通知就标记红点
            this.setData({
                hasUnread: true,
                unreadCount: this.data.unreadCount + 1
            });
        }
    }
});