Page({
    data: {
        post: {},
        comments: [],
        isCommentModalOpen: false,
        commentText: ""
    },

    onLoad(options: any) {
        const postId = options.post_id;

        // 模拟帖子数据
        const fakePost = {
            post_id: postId,
            title: "出售 9 成新 iPad Pro，有意者私聊！",
            category: "二手交易",
            user_avatar: "/assets/icons/ditu.svg",
            username: "张三",
            content: "几乎全新，没有磕碰，低价出售。",
            images: ["/assets/icons/zuoye.svg"],
            timestamp: "2025-03-04 10:30",
            likes: 12,
            comments: 3,
            isLiked: false
        };

        // 模拟评论数据
        const fakeComments = [
            { comment_id: "1", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "2", username: "王五", avatar: "/assets/icons/user3.png", text: "能走闲鱼吗？" },
            { comment_id: "3", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "4", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "5", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "6", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "7", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "8", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "9", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "10", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "11", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },
            { comment_id: "12", username: "李四", avatar: "/assets/icons/user2.png", text: "多少钱？" },

        ];

        this.setData({ post: fakePost, comments: fakeComments });

    },

    // **返回上一页**
    goBack() {
        wx.navigateBack();
    },

    // **点赞 / 取消点赞**
    toggleLike() {
        let post = this.data.post;
        post.isLiked = !post.isLiked;
        post.likes += post.isLiked ? 1 : -1;
        this.setData({ post });
    },
    // 打开输入框模态
    openCommentModal() {
        this.setData({
            isCommentModalOpen: true
        });
    },

    // 关闭输入框模态
    closeCommentModal() {
        this.setData({
            isCommentModalOpen: false
        });
    },

    // 监听输入
    handleCommentInput(e: any) {
        this.setData({
            commentText: e.detail.value
        });
    },

    // 发送评论
    sendComment() {
        if (!this.data.commentText.trim()) {
            wx.showToast({ title: "请输入评论内容", icon: "none" });
            return;
        }

        wx.showToast({ title: "评论成功！", icon: "success" });

        this.setData({
            isCommentModalOpen: false,
            commentText: ""
        });
    }

});