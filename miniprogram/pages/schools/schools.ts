Page({
    data: {
      provinces: [],
      cities: [],
      schoolList: [],
      selectedProvince: '',
      selectedCity: '',
      searchKeyword: '',
      page: 1,
      pageSize: 20,
      hasMore: true,
    },
  
    onLoad() {
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
      wx.showToast({ title: `选择了${schoolName}`, icon: 'success' });
      // 你可以在这里写逻辑，比如保存到全局变量或者返回上个页面
    }
  });