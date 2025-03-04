Page({
    data: {
        schoolName: "九江学院", // 默认学校
        categories: ["全部", "校园墙", "吐槽", "失物", "拼车", "二手交易", "拼单", "选课分享", "社团", "好物美景分享"], // 分类列表
        postCategories: ["校园墙", "吐槽", "失物", "拼车", "二手交易", "拼单", "选课分享", "社团", "好物美景分享", "其他"], // 发布帖子时的分类
        selectedCategory: "全部", // 默认选中
        posts: [], // 这里存放假数据
        checkinIcon: "/assets/icons/rili-2.svg", // 默认签到图标
        isCheckedIn: false, // 是否已签到
        isModalOpen: false, // 控制发布页面开关
        newPostContent: "", // 存储用户输入的内容
    },

    onLoad() {
        this.fetchPosts("全部"); // 初始加载所有帖子
    },

    // 切换分类时，从本地数据获取相应的帖子
    selectCategory(e: any) {
        const category = e.currentTarget.dataset.category;
        this.setData({ selectedCategory: category });

        this.fetchPosts(category); // 更新数据
    },

    // 选择发布分类
  selectPostCategory(e: any) {
    this.setData({ selectedPostCategory: this.data.postCategories[e.detail.value] });
  },

    // **使用本地假数据**
    fetchPosts(category: string) {
        const fakePosts = [
            {
                post_id: "1",
                category: "校园墙",
                user_avatar: "/assets/icons/zuoye.svg",
                username: "张三",
                content: "今天的天空好蓝！希望期末考试顺利！📚✨",
                images: ["/assets/icons/zuoye.svg", "/assets/icons/zuoye.svg", "/assets/icons/zuoye.svg"],
                timestamp: "2025-03-04 10:30",
                likes: 12,
                comments: 3,
                isLiked: false,
            },
            {
                post_id: "2",
                category: "吐槽",
                user_avatar: "/assets/icons/user2.png",
                username: "李四",
                content: "学校食堂的饭又涨价了…😭",
                images: [],
                timestamp: "2025-03-04 09:15",
                likes: 25,
                comments: 10,
                isLiked: false,
            },
            {
                post_id: "3",
                category: "失物",
                user_avatar: "/assets/icons/user3.png",
                username: "王五",
                content: "有人在教学楼 302 教室捡到一串钥匙吗？📢",
                images: [],
                timestamp: "2025-03-03 18:45",
                likes: 8,
                comments: 2,
                isLiked: false,
            },
            {
                post_id: "4",
                category: "拼车",
                user_avatar: "/assets/icons/user4.png",
                username: "赵六",
                content: "明天 8:00 从学校去市中心，有人一起拼车吗？🚗",
                images: [],
                timestamp: "2025-03-03 22:10",
                likes: 15,
                comments: 5,
                isLiked: false,
            },
            {
                post_id: "5",
                category: "二手交易",
                user_avatar: "/assets/icons/user5.png",
                username: "孙七",
                content: "出一台 9 成新的 iPad Pro，有意者私聊📱",
                images: [],
                timestamp: "2025-03-02 15:30",
                likes: 30,
                comments: 12,
                isLiked: false,
            }
        ];

        // 如果选中的是 "全部"，显示所有数据，否则筛选数据
        const filteredPosts = category === "全部" ? fakePosts : fakePosts.filter(post => post.category === category);

        this.setData({ posts: filteredPosts });
    },

    // **点赞 / 取消点赞**
  toggleLike(e: any) {
    const index = e.currentTarget.dataset.index;
    let posts = [...this.data.posts];

    posts[index].isLiked = !posts[index].isLiked;
    posts[index].likes += posts[index].isLiked ? 1 : -1;

    this.setData({ posts });
  },

    // 处理签到
    handleCheckIn() {
        if (!this.data.isCheckedIn) {
            this.setData({
                checkinIcon: "/assets/icons/daka.svg", // 切换为已签到图标
                isCheckedIn: true
            });
            wx.showToast({
                title: "签到成功！",
                icon: "success"
            });
        } else {
            wx.showToast({
                title: "今天已签到",
                icon: "none"
            });
        }
    },
    // 打开发布页面
    openPostModal() {
        this.setData({ isModalOpen: true });
    },

    // 关闭发布页面
    closePostModal() {
        this.setData({ isModalOpen: false });
    },

    // 监听输入内容
    handlePostInput(e: any) {
        this.setData({ newPostContent: e.detail.value });
    },

    // 提交发布内容
    submitPost() {
        if (!this.data.newPostContent.trim()) {
            wx.showToast({ title: "内容不能为空", icon: "none" });
            return;
        }

        wx.showToast({ title: "发布成功", icon: "success" });

        // 模拟将新帖子加入数据
        const newPost = {
            post_id: new Date().getTime().toString(),
            category: "校园墙",
            user_avatar: "/assets/icons/user1.png",
            username: "张三",
            content: this.data.newPostContent,
            images: [],
            timestamp: "刚刚",
            likes: 0,
            comments: 0
        };

        // 添加到帖子列表
        const updatedPosts = [newPost, ...this.data.posts];

        this.setData({
            posts: updatedPosts,
            newPostContent: "",
            isModalOpen: false // 关闭模态框
        });
    },
});