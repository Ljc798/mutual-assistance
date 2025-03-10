Page({
    data: {
      post: {},
      comments: [],
      keyboardHeight: 0, // 记录键盘高度
        isKeyboardOpen: false,
        preventScroll: false, // 用于控制页面滚动
        pageScrollTop: 0 // 记录页面初始滚动位置
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
        { comment_id: "2", username: "王五", avatar: "/assets/icons/user3.png", text: "能走闲鱼吗？" }
      ];
  
      this.setData({ post: fakePost, comments: fakeComments });

      // 监听键盘高度变化
      wx.onKeyboardHeightChange(res => {
        if (res.height > 0) {
            this.setData({
                keyboardHeight: res.height,
                isKeyboardOpen: true,
                preventScroll: true
            });

            // **确保输入框缓慢升起，避免突兀**
            setTimeout(() => {
                this.setData({
                    keyboardHeight: res.height
                });
            }, 50); // **50ms 让 UI 和键盘动画匹配**
        } else {
            this.setData({
                keyboardHeight: 0,
                isKeyboardOpen: false,
                preventScroll: false
            });
        }
    });
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
  
    focusComment(e: any) {
        // **提前记录页面当前滚动位置**
        wx.createSelectorQuery()
            .selectViewport()
            .scrollOffset(res => {
                this.setData({ pageScrollTop: res.scrollTop });
            })
            .exec();

        // **提前调整页面，防止上移**
        wx.pageScrollTo({
            scrollTop: this.data.pageScrollTop,
            duration: 0 // **0ms 立即生效**
        });

        this.setData({
            preventScroll: true
        });
    },

    blurComment() {
        this.setData({
            keyboardHeight: 0,
            isKeyboardOpen: false,
            preventScroll: false
        });
    }
  });