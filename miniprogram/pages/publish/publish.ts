Page({
    data: {
        categories: ['代拿快递', '代拿外卖', '兼职发布', '作业协助', '二手交易', '寻物启事', '代办服务', '万能服务'], // 任务分类选项
        selectedCategory: '', // 当前选择的任务分类
        title: '', // 标题输入
        detail: '', // 任务简介
        takeCode: '', // 取件码
        takeName: '', // 外卖姓名
        takeTel: '', // 外卖电话
        DDL: '', // 截止日期
        position: '', //  交易地点
        address: '', // 交付地点
        reward: '', // 报价
        showTakeCode: false, // 控制是否显示取件码输入框
        showTakeAwayCode: false, // 控制是否显示外卖输入框
        isDisabled: true, // 发布按钮是否禁用
        isTakeTelValid: true,
        date: '',  // 存储选择的日期
        time: '',  // 存储选择的时间
    },

    // 处理任务分类选择
    handleCategoryChange(e: any) {
        const selectedCategory = this.data.categories[e.detail.value];
        this.setData({
            selectedCategory,
        });

        // 根据选中的任务分类显示不同的输入框
        if (selectedCategory === '代拿快递') {
            this.setData({
                showTakeCode: true,
                showTakeAwayCode: false,
            });
        } else if (selectedCategory === '代拿外卖') {
            this.setData({
                showTakeCode: false,
                showTakeAwayCode: true,
            });
        } else {
            this.setData({
                showTakeCode: false,
                showTakeAwayCode: false,
            });
        }

        // 检查表单是否完整，更新发布按钮状态
        this.checkFormValidity();
    },

    // 处理标题输入
    handleTitleInput(e: any) {
        this.setData({
            title: e.detail.value,
        });
        this.checkFormValidity();
    },

    // 处理取件码输入
    handleTakeCodeInput(e: any) {
        this.setData({
            takeCode: e.detail.value,
        });
        this.checkFormValidity();
    },

    // 处理外卖姓名输入
    handleTakeNameInput(e: any) {
        this.setData({
            takeName: e.detail.value,
        });
        this.checkFormValidity();
    },

    // 处理手机号尾号的校验
    handleTakeTelInput(e: any) {
        const tel = e.detail.value;
        const isValid = /^\d{4}$/.test(tel);  // 校验是否是四位数字
        this.setData({
            takeTel: tel,
            isTakeTelValid: isValid,
        });
        this.checkFormValidity();
    },

    // 处理任务简介输入
    handleDetailInput(e: any) {
        this.setData({
            detail: e.detail.value,
        });
        this.checkFormValidity();
    },

    // 处理报价输入
    handleRewardInput(e: any) {
        this.setData({
            reward: e.detail.value,
        });
        this.checkFormValidity();
    },

    // 处理日期选择
    handleDateInput(e: any) {
        this.setData({
            date: e.detail.value,  // 更新日期
        });
        this.updateDatetime();  // 拼接日期和时间
    },

    // 处理时间选择
    handleTimeInput(e: any) {
        this.setData({
            time: e.detail.value,  // 更新时间
        });
        this.updateDatetime();  // 拼接日期和时间
    },

    // 拼接日期和时间
    updateDatetime() {
        const { date, time } = this.data;
        if (date && time) {
            const DDL = `${date} ${time}`;  // 拼接日期和时间
            this.setData({
                DDL: DDL,
            });
        }
    },

    // 处理地址输入
    handleAddressInput(e: any) {
        this.setData({
            address: e.detail.value,
        });
        this.checkFormValidity();
    },

    handlePositionInput(e: any) {
        this.setData({
            position: e.detail.value,
        });
        this.checkFormValidity();
    },

    // 校验表单完整性
    checkFormValidity() {
        const { title, detail, selectedCategory, reward, takeCode, takeName, takeTel, DDL, address, position } = this.data;
        let isValid = true;

        // 检查必填字段
        if (!title || !detail || !selectedCategory || !reward || !DDL || !address || !position) {
            isValid = false;
        }

        // 根据任务分类进行额外校验
        if (selectedCategory === '代拿快递' && !takeCode) {
            isValid = false;  // 快递任务，必须有取件码
        }

        if (selectedCategory === '代拿外卖' && (!takeTel || !takeName)) {
            isValid = false;  // 外卖任务，必须有姓名和电话
        }

        // 设置发布按钮的禁用状态
        this.setData({
            isDisabled: !isValid,
        });
    },

    // 处理发布操作
    // 处理发布操作
handlePublish() {
    const app = getApp();
    const user_id = app.globalData?.userInfo?.id;
  
    if (!user_id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
  
    const {
      selectedCategory,
      position,
      address,
      DDL,
      title,
      reward,
      detail,
      takeCode,
      takeTel,
      takeName
    } = this.data;
  
    const payload = {
      employer_id: user_id,
      category: selectedCategory,
      position,
      address,
      DDL,
      title,
      offer: parseFloat(reward),
      detail,
      takeaway_code: takeCode || '',
      takeaway_tel: takeTel || null,
      takeaway_name: takeName || ''
    };
  
    console.log("📤 正在提交任务发布请求:", payload);
  
    wx.request({
      url: 'https://mutualcampus.top/api/task/create', // ✅ 修改为你线上接口时记得更新
      method: 'POST',
      data: payload,
      success: (res: any) => {
        if (res.data.success) {
          wx.showToast({ title: '发布成功', icon: 'success' });
          // ✅ 成功后返回上一页或跳转任务列表页
          wx.navigateBack();
        } else {
          wx.showToast({ title: '发布失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('❌ 发布失败:', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});