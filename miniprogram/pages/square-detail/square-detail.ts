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

    // ✅ 格式化时间（YYYY-MM-DD HH:mm）
    formatTime(timeStr: string): string {
        const date = new Date(timeStr);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    },

    // ✅ 格式化时间（MM-DD HH:mm）
    formatTime2(timeStr: string): string {
        const date = new Date(timeStr);
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

        wx.request({
            url: "http://localhost:3000/api/square/comments",
            method: "GET",
            data: { square_id: postId, user_id },
            success: (res: any) => {
                if (res.data.success) {
                    let comments = res.data.comments.map(comment => {
                        comment.created_time = this.formatTime2(comment.created_time);
                        if (comment.children && comment.children.length > 0) {
                            comment.children = comment.children.map(child => {
                                child.created_time = this.formatTime2(child.created_time);
                                return child;
                            });
                        }
                        return comment;
                    });
                    console.log(comments);
                    
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
        const { commentid, username, rootid } = e.currentTarget.dataset;
        console.log(`📝 处理回复: comment_id=${commentid}, root_parent_id=${rootid || commentid}`);
    
        this.setData({
            replyTo: commentid,  
            rootParentId: rootid || commentid,  
            replyPlaceholder: `回复 @${username}...`,
            inputFocus: true
        });
    },

    // ✅ 监听输入框失去焦点，恢复默认 placeholder
    blurComment() {
        this.setData({
            replyTo: null,
            replyPlaceholder: "发布你的评论..."
        });
    },

    // ✅ 监听输入框输入
    handleInput(e: any) {
        this.setData({ newComment: e.detail.value });
    },

    // 发布评论
    submitComment() {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
    
        if (!this.data.newComment.trim()) {
            wx.showToast({ title: "评论不能为空", icon: "none" });
            return;
        }
    
        const isReply = !!this.data.replyTo; // 是否是回复评论
    
        wx.request({
            url: "http://localhost:3000/api/square/comments/create",
            method: "POST",
            data: {
                user_id,
                square_id: this.data.postId,
                content: this.data.newComment,
                parent_id: isReply ? this.data.replyTo : null,  // ✅ 二级评论的 parent_id 是回复对象的 id
                root_parent_id: isReply ? this.data.rootParentId : null  // ✅ 保持 root_parent_id 一致
            },
            success: (res: any) => {
                if (res.data.success) {
                    wx.showToast({ title: "评论成功", icon: "success" });
    
                    this.fetchComments(this.data.postId);  // ✅ 重新获取评论列表
                    this.setData({
                        newComment: "",
                        replyTo: null,
                        rootParentId: null,  
                        replyPlaceholder: "发布你的评论...",
                        inputFocus: false
                    });
                }
            },
            fail: (err) => {
                wx.showToast({ title: "发布失败", icon: "none" });
                console.error("❌ 发布失败:", err);
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

        const url = isliked ? "http://localhost:3000/api/square/comments/unlike" : "http://localhost:3000/api/square/comments/like";

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
        wx.navigateBack({delta: 1});
    }
});