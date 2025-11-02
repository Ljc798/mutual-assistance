import { BASE_URL } from "../../config/env";

Page({
    data: {
        userId: null,             // 当前查看的用户 ID
        userInfo: {},             // 用户基本信息
        reputation: {},           // 信誉数据
        posts: [],                // 帖子数据
        weightedScore: 0,         // 加权星级
        creditLevel: '',          // 信誉等级文本
        activeTab: "posts",       // 当前选中的 tab：'posts' | 'reviews'
    },

    onLoad(options) {
        const app = getApp();
        // ✅ 如果有传别人 id，则是查看他人主页，否则默认自己
        const userId = options.userId ? parseInt(options.userId) : app.globalData.user?.id;
        if (!userId) {
            wx.showToast({ title: "用户不存在", icon: "none" });
            return;
        }

        this.setData({ userId });
        this.loadUserInfo();
        this.loadReputation();
        this.loadUserPosts();
    },

    /** ✅ 加载用户基本信息 */
    loadUserInfo() {
        const { userId } = this.data;
        wx.request({
            url: `${BASE_URL}/user/public/${userId}`,
            success: (res: any) => {
                if (res.data.success) {
                    this.setData({ userInfo: res.data.data });
                } else {
                    wx.showToast({ title: "获取用户信息失败", icon: "none" });
                }
            },
            fail: () => {
                wx.showToast({ title: "网络错误", icon: "none" });
            },
        });
    },

    /** ✅ 加载用户信誉 */
    loadReputation() {
        const { userId } = this.data;
        wx.request({
            url: `${BASE_URL}/user/reputation/${userId}`,
            success: (res: any) => {
                if (!res.data.success) return;

                const data = res.data.data;
                const avg = parseFloat(data.average_rating || 0);
                const score = parseFloat(data.total_score || 0);
                const weighted = avg * 0.7 + (score / 20) * 0.3;

                let level = "";
                if (weighted >= 4.5) level = "极好";
                else if (weighted >= 4.0) level = "良好";
                else if (weighted >= 3.0) level = "中等";
                else if (weighted >= 2.0) level = "一般";
                else if (weighted >= 1.0) level = "较差";
                else level = "极差";

                this.setData({
                    reputation: data,
                    weightedScore: weighted.toFixed(2),
                    creditLevel: level,
                });
            },
            fail: () => {
                wx.showToast({ title: "获取信誉失败", icon: "none" });
            },
        });
    },

    /** ✅ 加载用户帖子 */
    loadUserPosts() {
        const { userId } = this.data;
        wx.showLoading({ title: "加载中..." });
        wx.request({
            url: `${BASE_URL}/square/public/${userId}/posts`,
            success: (res: any) => {
                wx.hideLoading();
                if (res.data.success) {
                    const formattedPosts = res.data.posts.map((post) => ({
                        ...post,
                        formattedTime: this.formatTime(post.created_time),
                    }));
                    this.setData({ posts: formattedPosts });
                } else {
                    wx.showToast({ title: "获取帖子失败", icon: "none" });
                }
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({ title: "网络错误", icon: "none" });
            },
        });
    },

    /** ✅ 切换帖子 / 评价 tab */
    onTabChange(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ activeTab: tab });
        // 如果切换到“评价”，后续可以再加 loadReviews()
    },

    /** ✅ 时间格式化函数 */
    formatTime(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / 1000;
        if (diff < 60) return "刚刚";
        if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
        return date.toLocaleDateString().replace(/\//g, "-");
    },
});
