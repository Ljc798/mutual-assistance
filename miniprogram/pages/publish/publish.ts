Page({
    data: {
      categories: ['代拿快递', '代拿外卖', '兼职发布', '作业协助', '二手交易', '寻物启事'], // 任务分类选项
      selectedCategory: '', // 当前选择的任务分类
      title: '', // 标题输入
      content: '', // 任务简介
      takeCode: '', // 取件码
      takeName: '', // 外卖姓名
      takeTel: '', // 外卖电话
      DDL: '', // 截止日期
      adress: '', // 交易地址
      offer: '', // 报价
      showTakeCode: false, // 控制是否显示取件码输入框
      showTakeAwayCode: false, // 控制是否显示外卖输入框
      isDisabled: true, // 发布按钮是否禁用
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
  
    // 处理外卖电话输入
    handleTakeTelInput(e: any) {
      this.setData({
        takeTel: e.detail.value,
      });
      this.checkFormValidity();
    },
  
    // 处理任务简介输入
    handleContentInput(e: any) {
      this.setData({
        content: e.detail.value,
      });
      this.checkFormValidity();
    },
  
    // 处理报价输入
    handleOfferInput(e: any) {
      this.setData({
        offer: e.detail.value,
      });
      this.checkFormValidity();
    },

    // 处理截止日期输入
    handleDDLInput(e: any) {
        this.setData({
          DDL: e.detail.value,
        });
        this.checkFormValidity();
      },

      // 处理地址输入
    handleAdressInput(e: any) {
        this.setData({
          adress: e.detail.value,
        });
        this.checkFormValidity();
      },
  
    // 校验表单完整性
    checkFormValidity() {
      const { title, content, selectedCategory, offer, takeCode, takeName, takeTel, DDL, adress } = this.data;
      let isValid = true;
  
      // 检查必填字段
      if (!title || !content || !selectedCategory || !offer || !DDL || !adress) {
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
    handlePublish() {
      // 执行发布操作，发送数据到服务器等
      console.log('发布成功');
    },
  });