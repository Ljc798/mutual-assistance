Page({
    data: {
        post: null, // 存储帖子详情
        postId: null, // 记录帖子 ID
        isLoading: true, // 加载状态
        comments: [], // 评论列表
        newComment: "", // 新评论内容
        replyTo: null,  // 回复的评论 ID
        replyPlaceholder: "发布你的评论...",  // 输入框 placeholder
        inputFocus: false,  // 控制输入框 focus
        rootParentId: null, // 🔹 记录 root_parent_id
    },

    onLoad(options: any) {
        if (options.post_id) {
            this.setData({ postId: options.post_id });
            this.fetchPostDetail(options.post_id);
            this.fetchComments(options.post_id);
        } else {
            wx.showToast({ title: "无效的帖子 ID", icon: "none" });
            wx.navigateBack();
        }
    },

    // ✅ 获取帖子详情
    fetchPostDetail(postId: string) {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        const token = wx.getStorageSync("token");
    
        wx.request({
            url: `https://mutualcampus.top/api/square/detail`,
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            data: { post_id: postId, user_id },
            success: (res: any) => {
                wx.hideLoading();
                if (res.data.success) {
                    let post = res.data.post;
                    const isVip = post.vip_expire_time && new Date(post.vip_expire_time).getTime() > Date.now();
    
                    post = {
                        ...post,
                        isLiked: Boolean(post.isLiked),
                        isVip,
                        created_time: this.formatTime(post.created_time)
                    };
    
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

    toggleLike() {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        const post = this.data.post;
        const token = wx.getStorageSync("token");

        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        const url = post.isLiked
            ? "https://mutualcampus.top/api/square/unlike"
            : "https://mutualcampus.top/api/square/like";

        wx.request({
            url,
            method: "POST",
            header: {
                Authorization: `Bearer ${token}` // 加入 token 认证
            },
            data: {
                user_id,
                square_id: post.id
            },
            success: (res: any) => {
                if (res.data.success) {
                    // 本地更新 UI 状态
                    const updatedPost = {
                        ...post,
                        isLiked: !post.isLiked,
                        likes_count: post.likes_count + (post.isLiked ? -1 : 1)
                    };
                    this.setData({ post: updatedPost });
                }
            },
            fail: (err) => {
                console.error("❌ 点赞/取消点赞失败:", err);
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // ✅ 格式化时间（YYYY-MM-DD HH:mm）
    formatTime(timeStr: string): string {
        const date = new Date(timeStr);
        date.setHours(date.getHours() - 8);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    },

    // ✅ 格式化时间（MM-DD HH:mm）
    formatTime2(timeStr: string): string {
        const date = new Date(timeStr);
        date.setHours(date.getHours() - 8);
        return `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    },

    // ✅ 预览图片
    previewImage(e: any) {
        const current = e.currentTarget.dataset.current;
        const urls = e.currentTarget.dataset.urls;

        wx.previewImage({
            current,  // 当前预览的图片
            urls,     // 预览图片列表
        });
    },

    // ✅ 获取帖子评论
    fetchComments(postId: string) {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        const token = wx.getStorageSync("token");
    
        wx.request({
            url: "https://mutualcampus.top/api/square/comments",
            method: "GET",
            header: { Authorization: `Bearer ${token}` },
            data: { square_id: postId, user_id },
            success: (res: any) => {
                if (res.data.success) {
                    const comments = res.data.comments.map(comment => {
                        const isVip = comment.vip_expire_time && new Date(comment.vip_expire_time).getTime() > Date.now();
    
                        comment = {
                            ...comment,
                            isVip,
                            created_time: this.formatTime2(comment.created_time),
                            children: comment.children?.map(child => {
                                const isVip = child.vip_expire_time && new Date(child.vip_expire_time).getTime() > Date.now();
                                return {
                                    ...child,
                                    isVip,
                                    created_time: this.formatTime2(child.created_time)
                                };
                            }) || []
                        };
    
                        return comment;
                    });
    
                    this.setData({ comments });
                }
            },
            fail: (err) => {
                console.error("❌ 获取评论失败:", err);
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // ✅ 点击评论进行回复
    handleReply(e) {
        const { commentid, username, parentid, rootid } = e.currentTarget.dataset;
        const isFirstLevel = parentid == null;

        // 设置回复状态
        this.setData({
            replyTo: commentid,
            rootParentId: isFirstLevel ? commentid : rootid,
            replyPlaceholder: `回复 @${username}...`
        }, () => {
            // 设置输入框 focus 为 true 以弹出键盘
            setTimeout(() => {
                this.setData({ inputFocus: true });
            }, 100); // 100ms 延迟，确保页面渲染完
        });
    },

    focusComment(e: any) {
    },

    // ✅ 输入框失焦（取消回复状态）
    blurComment() {
        this.setData({
            inputFocus: false,  // 取消焦点，收起键盘
            replyTo: null,      // 清除回复评论状态
            rootParentId: null, // 清除根评论 ID
            replyPlaceholder: "发布你的评论..." // 重置 placeholder
        });
    },

    // ✅ 输入监听
    handleInput(e) {
        this.setData({ newComment: e.detail.value });
    },

    // ✅ 发布评论
    submitComment() {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        const token = wx.getStorageSync("token");

        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        if (!this.data.newComment.trim()) {
            wx.showToast({ title: "评论不能为空", icon: "none" });
            return;
        }

        const isReply = !!this.data.replyTo;

        // 构建评论对象
        const commentData = {
            user_id,
            square_id: this.data.postId,
            content: this.data.newComment
        };

        if (isReply) {
            commentData.parent_id = this.data.replyTo;
            commentData.root_parent_id = this.data.rootParentId ?? this.data.replyTo;
        }

        wx.request({
            url: "https://mutualcampus.top/api/square/comments/create",
            method: "POST",
            header: { Authorization: `Bearer ${token}` }, // 加入 token 认证
            data: commentData,
            success: (res: any) => {
                if (res.data.success) {
                    wx.showToast({ title: "评论成功", icon: "success" });
                    this.fetchComments(this.data.postId); // 刷新评论列表
                    this.setData({
                        newComment: "",
                        replyTo: null,
                        rootParentId: null,
                        replyPlaceholder: "发布你的评论...",
                        inputFocus: false
                    }, () => {
                        // 自动滚动到底部
                        wx.pageScrollTo({
                            scrollTop: 999999,
                            duration: 300
                        });
                    });
                } else {
                    wx.showToast({ title: "发布失败", icon: "none" });
                    console.error("❌ 发布失败:", res.data);
                }
            },
            fail: (err) => {
                wx.showToast({ title: "发布失败", icon: "none" });
                console.error("❌ 网络错误:", err);
            }
        });
    },

    // ✅ 展开更多子评论
    expandReplies(e) {
        const commentId = e.currentTarget.dataset.commentid;
        const comments = this.data.comments.map(comment => {
            if (comment.id === commentId) {
                comment.showAllReplies = true;
                comment.displayedChildren = comment.children;  // **显示全部**
            }
            return comment;
        });
        this.setData({ comments });
    },

    // ✅ 点赞/取消点赞评论
    toggleCommentLike(e: any) {
        const { commentid, isliked } = e.currentTarget.dataset;
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        const url = isliked ? "https://mutualcampus.top/api/square/comments/unlike" : "https://mutualcampus.top/api/square/comments/like";

        wx.request({
            url,
            method: "POST",
            data: { user_id, comment_id: commentid },
            success: (res: any) => {
                if (res.data.success) {
                    this.fetchComments(this.data.postId);
                }
            },
            fail: (err) => {
                console.error("❌ 点赞/取消点赞失败:", err);
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    goBack() {
        wx.navigateBack({ delta: 1 });
    }
});