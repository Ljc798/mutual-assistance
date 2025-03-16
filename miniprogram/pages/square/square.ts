Page({
    data: {
        categories: ["全部", "校园墙", "吐槽", "失物", "拼车", "二手交易", "拼单", "选课分享", "社团", "好物美景分享"],
        selectedCategory: "全部",
        posts: [],
        isModalOpen: false,
        postCategories: ["校园墙", "吐槽", "失物", "拼车", "二手交易", "拼单", "选课分享", "社团", "好物美景分享", "其他"],
        selectedPostCategory: "",
        newPostContent: "",
        tempImageList: [], // 临时存储选中的图片（但未上传）
        uploadedImages: [], // 已上传的图片 URL
    },

    onLoad() {
        this.fetchPosts("全部");
    },

    selectCategory(e: any) {
        const category = e.currentTarget.dataset.category;
        this.setData({ selectedCategory: category });
        this.fetchPosts(category);
    },

    // ✅ 获取帖子数据
    fetchPosts(category: string) {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id || null;
        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        wx.request({
            url: "http://localhost:3000/api/square/posts",
            method: "GET",
            data: { category, user_id },
            success: (res: any) => {
                if (res.data.success) {
                    let posts = res.data.posts || [];
                    posts = posts.map(post => ({
                        ...post,
                        isLiked: post.isLiked || false,
                        created_time: this.formatTime(post.created_time)
                    }));
                    this.setData({ posts });
                }
            },
            fail: (err) => {
                console.error("❌ 获取帖子失败:", err);
            }
        });
    },

    // ✅ 时间格式化
    formatTime(timeStr: string): string {
        const date = new Date(timeStr);
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${month}-${day} ${hours}:${minutes}`;
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
                    this.setData({ posts });
                }
            },
            fail: (err) => {
                console.error("❌ 点赞/取消点赞失败:", err);
            }
        });
    },

    // **跳转到帖子详情页**
    goToDetail(e: any) {
        const postId = e.currentTarget.dataset.postid;
        wx.navigateTo({
            url: `/pages/square-detail/square-detail?post_id=${postId}`
        });
    },

    // **打开发布界面**
    openPostModal() {
        this.setData({ isModalOpen: true });
    },

    // **关闭发布界面**
    closePostModal() {
        this.setData({ isModalOpen: false });
    },

    // **选择发布分类**
    selectPostCategory(e: any) {
        this.setData({ selectedPostCategory: this.data.postCategories[e.detail.value] });
    },

    // **监听输入内容**
    handlePostInput(e: any) {
        this.setData({ newPostContent: e.detail.value });
    },

    // ✅ 选择图片（但不立即上传）
    chooseImage() {
        this.setData({
            tempImageList: this.data.tempImageList || [] // ✅ 确保 tempImageList 是数组
        });

        wx.chooseMedia({
            count: 9 - this.data.tempImageList.length, // 这里可能报错，如果 tempImageList 是 undefined
            mediaType: ["image"],
            sourceType: ["album", "camera"],
            success: (res) => {
                console.log("✅ 选中的图片:", res.tempFiles);
                const tempFilePaths = res.tempFiles.map(file => file.tempFilePath);
                this.setData({ tempImageList: [...this.data.tempImageList, ...tempFilePaths] });
            }
        });
    },

    // ✅ 移除未上传的图片
    removeImage(e: any) {
        const index = e.currentTarget.dataset.index;
        let tempImageList = [...this.data.tempImageList];
        tempImageList.splice(index, 1);
        this.setData({ tempImageList });
    },

    // ✅ 上传单张图片到 COS
    uploadImageToCOS(filePath: string, square_id: number): Promise<string | null> {
        return new Promise((resolve) => {
            wx.uploadFile({
                url: "http://localhost:3000/api/uploads/upload-image",
                filePath,
                name: "image",
                formData: {
                    type: "square",
                    postId: square_id
                },
                success: (res: any) => {
                    const data = JSON.parse(res.data);
                    if (data.success) {
                        console.log("✅ 图片上传成功:", data.imageUrl);
                        resolve(data.imageUrl);
                    } else {
                        console.error("❌ 图片上传失败:", data);
                        resolve(null);
                    }
                },
                fail: (err) => {
                    console.error("❌ 图片上传错误:", err);
                    resolve(null);
                }
            });
        });
    },

    async submitPost() {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
    
        if (!this.data.selectedPostCategory) {
            wx.showToast({ title: "请选择分类", icon: "none" });
            return;
        }
    
        if (!this.data.newPostContent.trim()) {
            wx.showToast({ title: "内容不能为空", icon: "none" });
            return;
        }
    
        wx.showLoading({ title: "发布中..." });
    
        // **🚀 先创建帖子（无图片）**
        wx.request({
            url: "http://localhost:3000/api/square/create",
            method: "POST",
            header: { Authorization: `Bearer ${app.globalData.token}` },
            data: {
                user_id,
                category: this.data.selectedPostCategory,
                content: this.data.newPostContent,
                images: []  // 先不传图片
            },
            success: async (res) => {
                if (res.data.success) {
                    const square_id = res.data.square_id;
                    console.log("✅ 帖子创建成功:", square_id);
    
                    // **如果没有图片，直接完成**
                    if (this.data.tempImageList.length === 0) {
                        wx.hideLoading();
                        wx.showToast({ title: "发布成功", icon: "success" });
                        this.fetchPosts("全部");  // ✅ 重新拉取帖子
                        this.resetPostForm();
                        return;
                    }
    
                    // **🚀 上传所有图片**
                    let uploadedImageUrls = [];
                    for (const filePath of this.data.tempImageList) {
                        const uploadedImageUrl = await this.uploadImageToCOS(filePath, square_id);
                        if (uploadedImageUrl) {
                            uploadedImageUrls.push(uploadedImageUrl);
                        }
                    }
    
                    // **🚀 更新帖子，添加图片**
                    wx.request({
                        url: "http://localhost:3000/api/square/update-images",
                        method: "POST",
                        data: {
                            square_id,  // 只需要更新已有的帖子
                            images: uploadedImageUrls
                        },
                        success: () => {
                            wx.hideLoading();
                            wx.showToast({ title: "发布成功", icon: "success" });
    
                            this.fetchPosts("全部");  // ✅ 重新拉取帖子
                            this.resetPostForm();
                        },
                        fail: (err) => {
                            wx.hideLoading();
                            console.error("❌ 更新帖子图片失败:", err);
                            wx.showToast({ title: "发布失败", icon: "none" });
                        }
                    });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                console.error("❌ 发布帖子失败:", err);
                wx.showToast({ title: "发布失败", icon: "none" });
            }
        });
    },
    // **重置表单**
    resetPostForm() {
        this.setData({
            isModalOpen: false,
            selectedPostCategory: "",
            newPostContent: "",
            tempImageList: []
        });
    }
});