import { checkTextContent } from "../../utils/security";

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
        checkinIcon: "../../assets/icons/rili-2.svg", // 默认签到前的图标
        checkedIn: false, // 是否已签到
        showReportModal: false,
        selectedPostId: null,
        reportReasons: ["骚扰辱骂", "不实信息", "违规广告", "违法内容", "色情低俗", "其他"],
        selectedReasonIndex: -1,
        reportDetail: '',
        currentPage: 1,
        pageSize: 10,
        hasMore: true,
        selectedSchoolName: '',
    },

    onLoad() {
        const app = getApp();
        const userInfo = app.globalData.userInfo;
        if (userInfo?.id) {
            // ✅ 已登录，设置数据后再加载
            this.setData({ userInfo }, () => {
                this.fetchPosts(false); // 带 user_id 获取是否点赞等
                this.getCheckinStatus();
            });
        } else {
            // ✅ 未登录，只加载帖子列表（不传 user_id）
            this.fetchPosts(false);
            wx.showToast({ title: "请先登录", icon: "none" });
        }
    },

    onShow() {
        // 防止用户在其他页面退出登录后返回广场页，此处再校验一次
        const app = getApp();
        const userInfo = app.globalData.userInfo;

        if (!userInfo?.id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        // ✅ 已登录，确保 userInfo 已同步
        this.setData({ userInfo, selectedSchoolName: app.globalData.selectedSquareSchoolName || '' });
        this.fetchPosts(false); // 带 user_id 获取是否点赞等

    },

    // ✅ 获取签到状态
    getCheckinStatus() {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        const token = wx.getStorageSync("token");

        wx.request({
            url: "https://mutualcampus.top/api/checkins/status",
            method: "GET",
            header: { Authorization: `Bearer ${token}` }, // 添加 token
            data: { user_id },
            success: (res) => {
                if (res.data.success) {
                    this.setData({
                        userInfo: app.globalData.userInfo,
                        checkedIn: res.data.checked_in,
                        checkinIcon: res.data.checked_in ? "../../assets/icons/daka.svg" : "../../assets/icons/rili-2.svg"
                    });
                }
            }
        });
    },

    // ✅ 处理签到逻辑
    handleCheckIn() {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id;
        const token = wx.getStorageSync("token");

        if (!user_id) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        wx.request({
            url: "https://mutualcampus.top/api/checkins/checkin",
            method: "POST",
            header: { Authorization: `Bearer ${token}` }, // 添加 token
            data: { user_id },
            success: (res) => {
                if (res.data.success) {
                    const { message, earned_points, consecutive_days, is_vip } = res.data;
                    let content = message;
                    if (consecutive_days > 1) {
                        content += `\n已连续签到${consecutive_days} 天！`;
                    }

                    if (is_vip) {
                        content += "\n（VIP双倍积分）";
                    }

                    wx.showModal({
                        title: "签到成功",
                        content: content,
                        showCancel: false,
                        confirmText: "知道了"
                    });

                    app.globalData.userInfo.points += earned_points;
                    wx.setStorageSync("user", app.globalData.userInfo);
                    this.getCheckinStatus();
                } else {
                    wx.showModal({
                        title: "签到失败",
                        content: res.data.message || "网络错误，请稍后再试",
                        showCancel: false
                    });
                }
            },
            fail: (err) => {
                wx.showModal({
                    title: "签到失败",
                    content: "网络错误，请稍后再试",
                    showCancel: false
                });
                console.error("❌ 签到失败:", err);
            }
        });
    },

    selectCategory(e: any) {
        const selectedCategory = e.currentTarget.dataset.category;
        this.setData({
            selectedCategory,
            currentPage: 1,
            hasMore: true
        });

        this.fetchPosts(false); // 刷新第一页
    },

    // ✅ 获取帖子数据
    fetchPosts(isLoadMore = false, callback?: Function) {
        const app = getApp();
        const user_id = app.globalData.userInfo?.id; // ❌ 不传 null
        const school_id = app.globalData.selectedSquareSchoolId;  // 👈 新加的


        const { currentPage, pageSize, selectedCategory } = this.data;

        const requestData: any = {
            category: selectedCategory,
            page: currentPage,
            pageSize
        };

        // ✅ 仅在登录状态下附带 user_id
        if (user_id) {
            requestData.user_id = user_id;
        }

        if (school_id) {
            requestData.school_id = school_id;  // 👈 加进去一起传
        }

        wx.request({
            url: "https://mutualcampus.top/api/square/posts",
            method: "GET",
            data: requestData,
            success: (res: any) => {
                if (res.data.success) {
                    let newPosts = res.data.posts || [];
                    const isVip = (vipTime) =>
                        vipTime && new Date(vipTime).getTime() > Date.now();

                    newPosts = newPosts.map(post => {
                        const approvedImages = (post.images || []).filter(img => img.status === "pass");
                        const reviewedImages = (post.images || []).map(img => ({
                            url: img.url,
                            status: img.status || "checking"
                        }));

                        return {
                            ...post,
                            images: reviewedImages, // 用于前端展示 + 占位
                            approvedImages,         // 若你后续只想拿审核通过的可用
                            isLiked: post.isLiked || false,
                            isVip: isVip(post.vip_expire_time),
                            created_time: this.formatTime(post.created_time)
                        };
                    });

                    console.log(newPosts);


                    this.setData({
                        posts: isLoadMore ? [...this.data.posts, ...newPosts] : newPosts,
                        hasMore: newPosts.length === pageSize
                    });
                } else {
                    console.error("❌ API 返回错误:", res.data.message);
                }
            },
            fail: (err) => {
                console.error("❌ 获取帖子失败:", err);
                wx.showToast({ title: "获取帖子失败", icon: "none" });
            },
            complete: () => {
                wx.hideLoading();
                if (callback) callback();
            }
        });
    },

    onReachBottom() {
        if (!this.data.hasMore) return;

        this.setData({
            currentPage: this.data.currentPage + 1
        });

        this.fetchPosts(true);
    },

    // ✅ 时间格式化
    formatTime(timeStr: string): string {
        const date = new Date(timeStr);
        date.setHours(date.getHours() - 8);
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
        console.log(app.globalData.token);

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

    // 打开发布界面
    openPostModal() {
        const token = wx.getStorageSync("token");  // 获取 token
        if (!token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }
        this.setData({ isModalOpen: true });
    },

    // 关闭发布界面
    closePostModal() {
        this.setData({ isModalOpen: false });
    },

    // 选择发布分类
    selectPostCategory(e: any) {
        this.setData({ selectedPostCategory: this.data.postCategories[e.detail.value] });
    },

    // 监听输入内容
    handlePostInput(e: any) {
        this.setData({ newPostContent: e.detail.value });
    },

    // ✅ 选择图片（但不立即上传）
    chooseImage() {
        const remain = 9 - (this.data.tempImageList?.length || 0);
        if (remain <= 0) return;

        wx.chooseMedia({
            count: remain,
            mediaType: ["image"],
            sourceType: ["album", "camera"],
            success: async (res) => {
                const compressedList: string[] = [];

                for (const file of res.tempFiles) {
                    const originalPath = file.tempFilePath;

                    const compressedPath = await new Promise<string>((resolve) => {
                        wx.compressImage({
                            src: originalPath,
                            quality: 30,
                            success: (res) => resolve(res.tempFilePath),
                            fail: () => resolve(originalPath) // 压缩失败就用原图
                        });
                    });

                    compressedList.push(compressedPath);
                }

                this.setData({
                    tempImageList: [...(this.data.tempImageList || []), ...compressedList]
                });
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
                url: "https://mutualcampus.top/api/uploads/upload-image",
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
        const school_id = app.globalData.selectedSquareSchoolId;
        const token = wx.getStorageSync("token");

        if (!user_id || !school_id) {   // 👈 这里也加校验
            wx.showToast({ title: "请先选择学校", icon: "none" });
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

        const isSafe = await checkTextContent(this.data.newPostContent);
        if (!isSafe) return;

        wx.showLoading({ title: "发布中..." });

        // 🚀 先创建帖子（无图片）
        wx.request({
            url: "https://mutualcampus.top/api/square/create",
            method: "POST",
            header: { Authorization: `Bearer ${token}` }, // 添加 token
            data: {
                user_id,
                school_id,
                category: this.data.selectedPostCategory,
                content: this.data.newPostContent,
                images: []  // 先不传图片
            },
            success: async (res) => {
                if (res.data.success) {
                    const square_id = res.data.square_id;
                    console.log("✅ 帖子创建成功:", square_id);

                    // 如果没有图片，直接完成
                    if (this.data.tempImageList.length === 0) {
                        wx.hideLoading();
                        wx.showToast({ title: "发布成功", icon: "success" });
                        this.fetchPosts(false);
                        this.resetPostForm();
                        return;
                    }

                    // 🚀 上传所有图片
                    let uploadedImageUrls = [];
                    for (const filePath of this.data.tempImageList) {
                        const uploadedImageUrl = await this.uploadImageToCOS(filePath, square_id);
                        if (uploadedImageUrl) {
                            uploadedImageUrls.push(uploadedImageUrl);
                        }
                    }

                    // 🚀 更新帖子，添加图片
                    wx.request({
                        url: "https://mutualcampus.top/api/square/update-images",
                        method: "POST",
                        header: { Authorization: `Bearer ${token}` }, // 添加 token
                        data: {
                            square_id,
                            images: uploadedImageUrls
                        },
                        success: () => {
                            wx.hideLoading();
                            wx.showToast({ title: "发布成功", icon: "success" });
                            setTimeout(() => {
                                this.fetchPosts(false);
                            }, 1000);
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

    // 重置表单
    resetPostForm() {
        this.setData({
            isModalOpen: false,
            selectedPostCategory: "",
            newPostContent: "",
            tempImageList: []
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
            url: "https://mutualcampus.top/api/square/report",
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

    handleSchoolClick() {
        wx.navigateTo({
            url: '/pages/schools/schools?mode=square'
        });
    },
});