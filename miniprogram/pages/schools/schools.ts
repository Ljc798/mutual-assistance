Page({
    data: {
        mode: 'task',
        provinces: [],
        cities: [],
        schoolList: [],
        selectedProvince: '',
        selectedCity: '',
        searchKeyword: '',
        page: 1,
        pageSize: 20,
        hasMore: true,
        showFeedbackModal: false,
        newSchoolName: '',
    },

    onLoad() {
        const mode = options.mode || 'task';  // 接受页面传的 mode
        this.setData({ mode });

        this.loadProvinces();
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    },

    loadProvinces() {
        wx.request({
            url: 'https://mutualcampus.top/api/school/provinces',
            success: (res) => {
                if (res.data.success) {
                    this.setData({ provinces: res.data.provinces });
                }
            }
        });
    },

    onProvinceChange(e) {
        const province = this.data.provinces[e.detail.value];
        this.setData({ selectedProvince: province, selectedCity: '', cities: [], schoolList: [], page: 1, hasMore: true });
        this.loadCities(province);
    },

    loadCities(province: string) {
        wx.request({
            url: `https://mutualcampus.top/api/school/cities?province=${encodeURIComponent(province)}`,
            success: (res) => {
                if (res.data.success) {
                    this.setData({ cities: res.data.cities });
                }
            }
        });
    },

    onCityChange(e) {
        const city = this.data.cities[e.detail.value];
        this.setData({ selectedCity: city, schoolList: [], page: 1, hasMore: true });
        this.loadSchools();
    },

    onSearchInput(e) {
        this.setData({ searchKeyword: e.detail.value });
    },

    onSearchConfirm() {
        if (!this.data.searchKeyword.trim()) {
            wx.showToast({ title: '请输入关键词', icon: 'none' });
            return;
        }
        this.setData({ selectedProvince: '', selectedCity: '', schoolList: [], page: 1, hasMore: true });
        this.searchSchools();
    },

    searchSchools() {
        wx.request({
            url: `https://mutualcampus.top/api/school/search?keyword=${encodeURIComponent(this.data.searchKeyword)}`,
            success: (res) => {
                if (res.data.success) {
                    this.setData({ schoolList: res.data.schools, hasMore: false });
                }
            }
        });
    },

    loadSchools() {
        const { selectedCity, page, pageSize, schoolList } = this.data;
        if (!selectedCity) return;

        wx.request({
            url: `https://mutualcampus.top/api/school/list?city=${encodeURIComponent(selectedCity)}&page=${page}&pageSize=${pageSize}`,
            success: (res) => {
                if (res.data.success) {
                    const newSchools = res.data.schools;
                    this.setData({
                        schoolList: schoolList.concat(newSchools),
                        hasMore: newSchools.length === pageSize
                    });
                }
            }
        });
    },

    onLoadMore() {
        if (!this.data.hasMore) return;
        this.setData({ page: this.data.page + 1 }, () => {
            this.loadSchools();
        });
    },

    onSelectSchool(e) {
        const schoolName = e.currentTarget.dataset.name;
        const schoolId = e.currentTarget.dataset.id;

        const app = getApp();

        if (this.data.mode === 'task') {
            app.globalData.selectedTaskSchoolId = schoolId;
            app.globalData.selectedTaskSchoolName = schoolName;
            wx.navigateBack();
        } else if (this.data.mode === 'square') {
            app.globalData.selectedSquareSchoolId = schoolId;
            app.globalData.selectedSquareSchoolName = schoolName;
            wx.navigateBack();
        } else if (this.data.mode === 'user') {
            // 通过事件通道通知上一页
            const eventChannel = this.getOpenerEventChannel();
            eventChannel.emit('schoolSelected', {
                id: schoolId,
                name: schoolName
            });
            wx.navigateBack();
        }
    },

    openFeedbackModal() {
        this.setData({ showFeedbackModal: true });
    },

    closeFeedbackModal() {
        this.setData({ showFeedbackModal: false });
    },

    onProvincePickerChange(e: any) {
        const index = e.detail.value;
        const selectedProvince = this.data.provinces[index];
        this.setData({ selectedProvince });
        this.fetchCities(selectedProvince); // 根据省份去拉城市
    },

    onCityPickerChange(e: any) {
        const index = e.detail.value;
        const selectedCity = this.data.cities[index];
        this.setData({ selectedCity });
    },

    onSchoolNameInput(e: any) {
        this.setData({ newSchoolName: e.detail.value });
    },

    async submitFeedback() {
        const { selectedProvince, selectedCity, newSchoolName } = this.data;
        if (!selectedProvince || !selectedCity || !newSchoolName.trim()) {
            wx.showToast({ title: "请填写完整信息", icon: "none" });
            return;
        }

        wx.showLoading({ title: "提交中..." });

        try {
            const token = wx.getStorageSync('token');
            await wx.request({
                url: 'https://mutualcampus.top/api/school/feedback',
                method: 'POST',
                header: { Authorization: `Bearer ${token}` },
                data: {
                    name: newSchoolName,
                    province: selectedProvince,
                    city: selectedCity
                },
                success: (res: any) => {
                    if (res.data.success) {
                        wx.showToast({ title: "反馈成功", icon: "success" });
                        this.setData({
                            showFeedbackModal: false,
                            selectedProvince: '',
                            selectedCity: '',
                            newSchoolName: '',
                        });
                    } else {
                        wx.showToast({ title: res.data.message || "反馈失败", icon: "none" });
                    }
                },
                fail: () => {
                    wx.showToast({ title: "网络错误", icon: "none" });
                },
                complete: () => {
                    wx.hideLoading();
                }
            });
        } catch (err) {
            console.error("❌ 提交失败", err);
            wx.hideLoading();
        }
    },

    fetchCities(province: string) {
        // 去请求城市列表，随便写个假的
    }
});