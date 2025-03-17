Page({
    data: {
        post: null, // 存储帖子详情
        postId: null, // 记录帖子 ID
        isLoading: true, // 加载状态
    },

    onLoad(options: any) {
        if (options.post_id) {
            this.setData({ postId: options.post_id });
            this.fetchPostDetail(options.post_id);
        } else {
            wx.showToast({ title: "无效的帖子 ID", icon: "none" });
            wx.navigateBack();
        }
    },

    // ✅ 获取帖子详情
    fetchPostDetail(postId: string) {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
    
        wx.showLoading({ title: "加载中..." });
    
        wx.request({
            url: `http://localhost:3000/api/square/detail`,
            method: "GET",
            data: { post_id: postId, user_id }, // ✅ 传递 user_id
            success: (res: any) => {
                wx.hideLoading();
                if (res.data.success) {
                    let post = res.data.post;
                    post.created_time = this.formatTime(post.created_time); // ✅ 格式化时间
                    post.isLiked = Boolean(post.isLiked); // ✅ 确保 `isLiked` 是布尔值
    
                    this.setData({ post, isLoading: false });
                } else {
                    wx.showToast({ title: "获取帖子失败", icon: "none" });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                console.error("❌ 获取帖子失败:", err);
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // ✅ 时间格式化（YYYY-MM-DD HH:mm）
    formatTime(timeStr: string): string {
        const date = new Date(timeStr);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    // ✅ 点赞/取消点赞
    toggleLike() {
        let post = this.data.post;
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        const url = post.isLiked
            ? "http://localhost:3000/api/square/unlike"
            : "http://localhost:3000/api/square/like";

        wx.request({
            url,
            method: "POST",
            header: { Authorization: `Bearer ${app.globalData.token}` },
            data: { user_id, square_id: post.id },
            success: (res: any) => {
                if (res.data.success) {
                    post.isLiked = !post.isLiked;
                    post.likes_count += post.isLiked ? 1 : -1;
                    this.setData({ post });
                }
            },
            fail: (err) => {
                console.error("❌ 点赞/取消点赞失败:", err);
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // ✅ 返回上一页
    goBack() {
        wx.navigateBack();
    }
});