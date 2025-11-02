import { BASE_URL } from "../../config/env";

Page({
    data: {
        userId: null,             // 当前查看的用户 ID
        userInfo: {},             // 用户基本信息
        reputation: {},           // 信誉数据
        posts: [],                // 帖子数据
        weightedScore: 0,         // 加权星级
        creditLevel: '',          // 信誉等级文本
        tabs: ["帖子", "评价"],
        activeTab: 0, // 默认显示“帖子”
        isVip: 0,
        showReportModal: false,
        selectedPostId: null,
        reportReasons: ["骚扰辱骂", "不实信息", "违规广告", "违法内容", "色情低俗", "其他"],
        selectedReasonIndex: -1,
        reportDetail: '',
    },

    onLoad(options) {
        const app = getApp();
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
                    weightedScore: Number(weighted.toFixed(2)),
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
                    console.log(formattedPosts);
                    
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

    switchTab(e: any) {
        const index = e.currentTarget.dataset.index;
        this.setData({ activeTab: index });

        if (index === 0) {
            // 切换到帖子
            this.loadUserPosts();
        } else if (index === 1) {
            // 切换到评价
            //   this.fetchEvaluations(this.data.userId);
        }
    },

    formatTime(timeStr: string): string {
        const date = new Date(timeStr);
        date.setHours(date.getHours());
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${month}-${day} ${hours}:${minutes}`;
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    },

        // ✅ 点赞/取消点赞
        toggleLike(e: any) {
            const index = e.currentTarget.dataset.index;
            let posts = [...this.data.posts];
            let post = posts[index];
    
            const app = getApp();
            const user_id = app.globalData.userInfo?.id;
    
            if (!user_id) {
                wx.showToast({ title: "请先登录", icon: "none" });
                return;
            }
    
            const url = post.isLiked
                ? `${BASE_URL}/square/unlike`
                : `${BASE_URL}/square/like`;
    
            wx.request({
                url,
                method: "POST",
                header: { Authorization: `Bearer ${app.globalData.token}` },
                data: { user_id, square_id: post.id },
                success: (res: any) => {
                    if (res.data.success) {
                        post.isLiked = !post.isLiked;
                        post.likes_count += post.isLiked ? 1 : -1;
                        this.setData({ posts });
                    }
                },
                fail: (err) => {
                    console.error("❌ 点赞/取消点赞失败:", err);
                }
            });
        },
    
        // 跳转到帖子详情页
        goToDetail(e: any) {
            const postId = e.currentTarget.dataset.postid;
            wx.navigateTo({
                url: `/pages/square-detail/square-detail?post_id=${postId}`
            });
        },

    // 点击三个点触发
    onReportTap(e) {
        const postId = e.currentTarget.dataset.postid;
        this.setData({
            selectedPostId: postId,
            showReportModal: true,
            selectedReasonIndex: -1,
            reportDetail: ''
        });
    },

    onReasonChange(e) {
        this.setData({
            selectedReasonIndex: e.detail.value
        });
    },

    onReportDetailInput(e) {
        this.setData({
            reportDetail: e.detail.value
        });
    },

    cancelReport() {
        this.setData({
            showReportModal: false
        });
    },

    submitReport() {
        const token = wx.getStorageSync("token");
        const { selectedPostId, selectedReasonIndex, reportReasons, reportDetail } = this.data;

        if (selectedReasonIndex === -1) {
            return wx.showToast({ title: "请选择举报原因", icon: "none" });
        }

        wx.request({
            url: `${BASE_URL}/square/report`,
            method: "POST",
            header: { Authorization: `Bearer ${token}` },
            data: {
                post_id: selectedPostId,
                reason: reportReasons[selectedReasonIndex],
                description: reportDetail
            },
            success: (res) => {
                if (res.data.success) {
                    wx.showToast({ title: "举报成功", icon: "success" });
                } else {
                    wx.showToast({ title: res.data.message || "举报失败", icon: "none" });
                }
                this.setData({ showReportModal: false });
            }
        });
    },

});
