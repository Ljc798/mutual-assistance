import { checkTextContent } from "../../utils/security";

// 定义聊天消息类型
interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  isFormatted?: boolean; // 是否为格式化消息
}

// 定义提取的数据类型
interface ExtractedData {
  category?: string;
  title?: string;
  detail?: string;
  takeCode?: string;
  takeName?: string;
  takeTel?: string;
  date?: string;
  time?: string;
  DDL?: string;
  position?: string;
  address?: string;
  reward?: string;
}

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
        showCommissionPopup: false,
    commissionAmount: '0', // 改为字符串类型
    // 聊天相关状态
    showChatPopup: false, // 控制聊天弹窗显示
    // 删除showTagSelectPopup等tag选择相关
    chatMessages: [] as ChatMessage[], // 聊天消息列表
    chatInput: '', // 聊天输入框内容
    conversationId: '', // 对话ID
    extractedData: null as ExtractedData | null, // 提取的数据
    showFillButton: false, // 是否显示帮我填按钮
    isLoading: false, // 是否正在加载
    scrollIntoView: '', // 滚动到指定消息
    currentTag: '', // 当前选择的tag
    currentTagName: '', // 当前选择的tag友好名称
    showPriceSuggestIcon: false,
    showSummaryIcon: false,
    priceSuggesting: false,
    summarySuggesting: false,
    suggestedPrice: '',
    suggestedPriceReason: '',
    suggestedDetail: '',
    showPriceConfirm: false,
    showSummaryConfirm: false,
    originalReward: '',
    originalDetail: '',
    highlightReward: false,
    highlightDetail: false,
    aiQuestion: '', // 价格估算AI问题
    summaryQuestion: '', // 简介生成AI问题
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

    // 校验表单完整性，决定icon显示
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

        // 简介icon显示条件（除detail和reward外都非空）
        const summaryFieldsFilled = !!(title && selectedCategory && DDL && address && position && ((selectedCategory === '代拿快递' && takeCode) || (selectedCategory === '代拿外卖' && takeName && takeTel) || (selectedCategory !== '代拿快递' && selectedCategory !== '代拿外卖')));
        // 报价icon显示条件（除reward外都非空）
        const priceFieldsFilled = !!(title && detail && selectedCategory && DDL && address && position && ((selectedCategory === '代拿快递' && takeCode) || (selectedCategory === '代拿外卖' && takeName && takeTel) || (selectedCategory !== '代拿快递' && selectedCategory !== '代拿外卖')));
        this.setData({
            showPriceSuggestIcon: priceFieldsFilled,
            showSummaryIcon: summaryFieldsFilled,
            isDisabled: !isValid,
        });
    },

    calculateCommissionInFen(amountYuan: number): number {
        return Math.max(Math.floor(amountYuan * 100 * 0.02), 1); // 保底 1 分
    },

    async handlePublish() {
        const app = getApp();
        const token = wx.getStorageSync("token");
        const user_id = app.globalData?.userInfo?.id;
        if (!user_id || !token) {
            wx.showToast({ title: "请先登录", icon: "none" });
            return;
        }

        const { reward, title, detail } = this.data;
        if (!reward || isNaN(parseFloat(reward))) {
            wx.showToast({ title: "请填写正确的金额", icon: "none" });
            return;
        }

        // ✅ 检查标题和详情是否合规
        const isTitleSafe = await checkTextContent(title);
        if (!isTitleSafe) return;

        // ✅ 审核 address
        const isAddressSafe = await checkTextContent(this.data.address);
        if (!isAddressSafe) return;

        // ✅ 审核 position
        const isPositionSafe = await checkTextContent(this.data.position);
        if (!isPositionSafe) return;

        const isDetailSafe = await checkTextContent(detail);
        if (!isDetailSafe) return;

        const offer = parseFloat(reward);
        const commission = this.calculateCommissionInFen(offer);

        this.setData({
            commissionAmount: (commission / 100).toFixed(2),
            showCommissionPopup: true
        });
    },

  choosePublishMethod(e: any) {
        const method = e.currentTarget.dataset.method;
        this.setData({ showCommissionPopup: false });

        const app = getApp();
        const token = wx.getStorageSync("token");
        const userId = app.globalData?.userInfo?.id;
        const {
            selectedCategory, position, address, DDL, title, reward,
            detail, takeCode, takeTel, takeName
        } = this.data;
        const schoolId = app.globalData?.selectedTaskSchoolId || app.globalData?.userInfo?.school_id || null;
        
        const offer = parseFloat(reward);
        const payload = {
            employer_id: userId,
            school_id: schoolId,
            category: selectedCategory,
            position,
            address,
            DDL,
            title,
            offer,
            detail,
            takeaway_code: takeCode || '',
            takeaway_tel: takeTel || null,
            takeaway_name: takeName || '',
            publish_method: method,
            status: method === 'pay' ? -1 : 0
        };

        wx.request({
            url: 'https://mutualcampus.top/api/task/create',
            method: 'POST',
            data: payload,
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    if (method === 'pay') {
                        const taskId = res.data.task_id;
                        wx.request({
                            url: 'https://mutualcampus.top/api/taskPayment/prepay',
                            method: 'POST',
                            data: { task_id: taskId },
                            header: { Authorization: `Bearer ${token}` },
                            success: (payRes: any) => {
                                if (payRes.data.success) {
                                    wx.requestPayment({
                                        ...payRes.data.paymentParams,
                                        success: () => {
                                            wx.showToast({ title: "支付成功", icon: "success" });
                                            wx.redirectTo({ url: "/pages/home/home" });
                                        },
                                        fail: () => {
                                            wx.showToast({ title: "支付失败或取消", icon: "none" });
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        wx.showToast({ title: '发布成功', icon: 'success' });
                        wx.redirectTo({ url: "/pages/home/home" });
                    }
                } else {
                    wx.showToast({ title: res.data.message || '发布失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.showToast({ title: '网络错误', icon: 'none' });
            }
        });
    },

    closeCommissionPopup() {
        this.setData({ showCommissionPopup: false });
    },

  // 打开聊天弹窗
  openChatPopup() {
    // 移除tag选择弹窗
    this.setData({ 
        showChatPopup: true,
        chatMessages: [],
        conversationId: '',
        extractedData: null,
        showFillButton: false,
        currentTag: 'field_filling',
        currentTagName: '智能提取任务信息',
    });
    setTimeout(() => {
        this.scrollToBottom();
    }, 300);
  },

  // 关闭聊天弹窗
  closeChatPopup() {
    this.setData({ showChatPopup: false });
  },

  // 处理聊天输入
  handleChatInput(e: any) {
    this.setData({
      chatInput: e.detail.value
    });
  },

  // 发送聊天消息
  async sendChatMessage() {
    const { chatInput, chatMessages, conversationId } = this.data;
    if (!chatInput.trim()) return;

    const app = getApp();
    const token = wx.getStorageSync("token");

    if (!token) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    // 添加用户消息到聊天记录
    const userMessage: ChatMessage = {
      type: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };

    this.setData({
      chatMessages: [...chatMessages, userMessage],
      chatInput: '',
      isLoading: true
    });

    // 滚动到底部
    this.scrollToBottom();

    function getBeijingTimeISO() {
      const now = new Date();
      const offsetTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 加8小时
      const iso = offsetTime.toISOString().replace('Z', '+08:00'); // 替换 Z 为 +08:00
      return iso;
    }

    // 构造payload，所有字段+user_input
    const payload = {
        category: this.data.selectedCategory || '',
        title: this.data.title || '',
        detail: this.data.detail || '',
        takeCode: this.data.takeCode || '',
        takeName: this.data.takeName || '',
        takeTel: this.data.takeTel || '',
        position: this.data.position || '',
        address: this.data.address || '',
        reward: this.data.reward || '',
        date: this.data.date || '',
        time: this.data.time || '',
        current_time: getBeijingTimeISO(),
        user_input: chatInput
    };

    try {
        // 调用后端API
        const response = await new Promise((resolve, reject) => {
            wx.request({
                url: 'https://mutualcampus.top/api/ai/extract',
                method: 'POST',
                data: {
                    text: JSON.stringify(payload),
                    tag: 'field_filling',
                    conversation_id: this.data.conversationId
                },
                header: { Authorization: `Bearer ${token}` },
                success: resolve,
                fail: reject
            });
        });

        const { data } = response as any;

        if (data.status === 'ok') {
            // 检查是否返回了JSON数据
            const hasJsonData = this.checkForJsonData(data.reply);

            if (!hasJsonData) {
                // 如果没有JSON数据，才添加AI的原始回复
                const aiMessage: ChatMessage = {
                    type: 'ai',
                    content: data.reply,
                    timestamp: new Date().toLocaleTimeString()
                };

                this.setData({
                    chatMessages: [...this.data.chatMessages, aiMessage],
                    conversationId: data.conversation_id || conversationId,
                    isLoading: false
                });

                // 滚动到底部
                this.scrollToBottom();
            } else {
                // 如果有JSON数据，只更新conversationId和loading状态
                this.setData({
                    conversationId: data.conversation_id || conversationId,
                    isLoading: false
                });

                // 滚动到底部（格式化消息会在checkForJsonData中添加）
                setTimeout(() => {
                    this.scrollToBottom();
                }, 100);
            }
        } else {
            this.setData({ isLoading: false });
            wx.showToast({ title: "AI回复失败", icon: "none" });
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        this.setData({ isLoading: false });
        wx.showToast({ title: "网络错误", icon: "none" });
    }
  },

  // 检查AI回复中是否包含JSON数据
  checkForJsonData(reply: string) {
    try {
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        const expectedFields = ['category', 'title', 'detail', 'takeCode', 'takeName', 'takeTel', 'DDL', 'position', 'address', 'reward'];
        const hasValidStructure = expectedFields.some(field => jsonData.hasOwnProperty(field));
        if (hasValidStructure) {
          this.setData({
            extractedData: jsonData,
            showFillButton: true
          });
  
          // 生成格式化内容
          let readableText = this.formatExtractedData(jsonData);
  
          // 拼接提问（如果有）
          const rest = reply.replace(jsonMatch[0], '').replace(/^[\s\n]+/, '');
          if (rest) {
            const questions = rest.split('\n').map(q => q.trim()).filter(q => q);
            if (questions.length > 0) {
              const questionsText = questions.map(q => `🤖 ${q}`).join('<br>');
              readableText += '<br><br>' + questionsText;
            }
          }
  
          // 统一加入一条富文本消息
          const newMessage: ChatMessage = {
            type: 'ai',
            content: readableText,
            timestamp: new Date().toLocaleTimeString(),
            isFormatted: true
          };
  
          this.setData({
            chatMessages: [...this.data.chatMessages, newMessage]
          });
          this.scrollToBottom();
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  formatExtractedData(data: ExtractedData): string {
    const lines = [];

    // 必填字段
    if (data.category) lines.push(`📋 <strong>任务分类：</strong>${data.category}`);
    if (data.title) lines.push(`📝 <strong>任务标题：</strong>${data.title}`);
    if (data.detail) lines.push(`📄 <strong>任务详情：</strong>${data.detail}`);
    if (data.position) lines.push(`📍 <strong>交易地点：</strong>${data.position}`);
    if (data.address) lines.push(`🏠 <strong>送达地址：</strong>${data.address}`);
    if (data.reward) lines.push(`💰 <strong>任务奖励：</strong>${data.reward}元`);

    // 可选字段 - 根据任务类型显示
    if (data.category === '代拿快递' && data.takeCode) {
      lines.push(`📦 <strong>取件码：</strong>${data.takeCode}`);
    }

    if (data.category === '代拿外卖') {
      if (data.takeName) lines.push(`👤 <strong>外卖姓名：</strong>${data.takeName}`);
      if (data.takeTel) lines.push(`📱 <strong>手机尾号：</strong>${data.takeTel}`);
    }

    // 时间字段
    if (data.DDL) {
      lines.push(`⏰ <strong>截止时间：</strong>${data.DDL}`);
    } else if (data.date && data.time) {
      lines.push(`⏰ <strong>截止时间：</strong>${data.date} ${data.time}`);
    }

    // 添加分隔线和提示
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('✅ 请检查以上信息是否正确');
    lines.push('📝 如有问题请告诉我进行修改');
    lines.push('🎯 确认无误后点击下方【帮我填到表单】按钮');

    return lines.join('<br>');
  },

  // 帮我填按钮点击事件
  fillFormWithData() {
    const { extractedData } = this.data;

    if (!extractedData) {
      wx.showToast({ title: "没有可填充的数据", icon: "none" });
      return;
    }

    // 先关闭聊天弹窗
    this.setData({
      showChatPopup: false,
      extractedData: null,
      showFillButton: false
    });

    // 根据选中的任务分类显示不同的输入框
    if (extractedData.category === '代拿快递') {
      this.setData({
        showTakeCode: true,
        showTakeAwayCode: false,
      });
    } else if (extractedData.category === '代拿外卖') {
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

    // 使用setTimeout确保弹窗关闭后再填充数据
    setTimeout(() => {

      // 准备要填充的数据
      const formData = {
        selectedCategory: extractedData.category || '',
        title: extractedData.title || '',
        detail: extractedData.detail || '',
        takeCode: extractedData.takeCode || '',
        takeName: extractedData.takeName || '',
        takeTel: extractedData.takeTel || '',
        date: extractedData.date || '',
        time: extractedData.time || '',
        position: extractedData.position || '',
        address: extractedData.address || '',
        reward: extractedData.reward || ''
      };

      // 填充表单数据
      this.setData(formData);

      this.updateDatetime();

      // 检查表单是否完整，更新发布按钮状态
      this.checkFormValidity();

      wx.showToast({ title: "已自动填充表单", icon: "success" });
    }, 500); // 增加延迟时间确保弹窗完全关闭
  },

  // 滚动到底部
  scrollToBottom() {
    const that = this;
    setTimeout(() => {
      that.setData({
        scrollIntoView: 'last-message'
      });
    }, 100); // 增加延迟确保DOM更新完成
  },

    // 价格估算icon点击
    async handlePriceSuggest() {
        if (this.data.priceSuggesting) return;
        this.setData({ priceSuggesting: true, showPriceConfirm: false, highlightReward: false, aiQuestion: '' });
        const app = getApp();
        const token = wx.getStorageSync("token");
        // 构造payload，所有字段都传递
        const payload = {
            category: this.data.selectedCategory || '',
            title: this.data.title || '',
            detail: this.data.detail || '',
            takeCode: this.data.takeCode || '',
            takeName: this.data.takeName || '',
            takeTel: this.data.takeTel || '',
            DDL: this.data.DDL || '',
            position: this.data.position || '',
            address: this.data.address || '',
            reward: this.data.reward || '',
            date: this.data.date || '',
            time: this.data.time || ''
        };
        wx.request({
            url: 'https://mutualcampus.top/api/ai/extract',
            method: 'POST',
            data: {
                text: JSON.stringify(payload),
                tag: 'price_estimation'
            },
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                const data = res.data;
                if (data.status === 'ok' && data.reply) {
                    try {
                        const reply = data.reply;
                        const jsonMatch = reply.match(/\{[\s\S]*\}/);
                        let question = '';
                        if (jsonMatch) {
                            const json = JSON.parse(jsonMatch[0]);
                            // 提取问题文本
                            question = reply.replace(jsonMatch[0], '').replace(/^[\s\n]+/, '');
                            this.setData({
                                suggestedPrice: json.suggested_price || '',
                                suggestedPriceReason: json.reason || '',
                                showPriceConfirm: true,
                                highlightReward: true,
                                originalReward: this.data.reward,
                                aiQuestion: question
                            });
                            // 自动填入
                            if (json.suggested_price) {
                                this.setData({ reward: json.suggested_price });
                            }
                        }
                    } catch (e) { wx.showToast({ title: 'AI返回格式有误', icon: 'none' }); }
                }
                this.setData({ priceSuggesting: false });
            },
            fail: () => {
                wx.showToast({ title: '网络错误', icon: 'none' });
                this.setData({ priceSuggesting: false });
            }
        });
    },
    // 价格确认/撤销
    confirmPriceSuggest() {
        this.setData({ showPriceConfirm: false, highlightReward: false, aiQuestion: '' });
    },
    cancelPriceSuggest() {
        this.setData({ reward: this.data.originalReward, showPriceConfirm: false, highlightReward: false, aiQuestion: '' });
    },

    // 简介生成icon点击
    async handleSummarySuggest() {
        if (this.data.summarySuggesting) return;
        this.setData({ summarySuggesting: true, showSummaryConfirm: false, highlightDetail: false, summaryQuestion: '' });
        const app = getApp();
        const token = wx.getStorageSync("token");
        // 构造payload，所有字段都传递
        const payload = {
            category: this.data.selectedCategory || '',
            title: this.data.title || '',
            detail: this.data.detail || '',
            takeCode: this.data.takeCode || '',
            takeName: this.data.takeName || '',
            takeTel: this.data.takeTel || '',
            DDL: this.data.DDL || '',
            position: this.data.position || '',
            address: this.data.address || '',
            reward: this.data.reward || '',
            date: this.data.date || '',
            time: this.data.time || ''
        };
        wx.request({
            url: 'https://mutualcampus.top/api/ai/extract',
            method: 'POST',
            data: {
                text: JSON.stringify(payload),
                tag: 'summary_generation'
            },
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                const data = res.data;
                if (data.status === 'ok' && data.reply) {
                    try {
                        const reply = data.reply;
                        const jsonMatch = reply.match(/\{[\s\S]*\}/);
                        let question = '';
                        if (jsonMatch) {
                            const json = JSON.parse(jsonMatch[0]);
                            // 提取问题文本
                            question = reply.replace(jsonMatch[0], '').replace(/^[\s\n]+/, '');
                            this.setData({
                                suggestedDetail: json.detail || '',
                                showSummaryConfirm: true,
                                highlightDetail: true,
                                originalDetail: this.data.detail,
                                summaryQuestion: question
                            });
                            // 自动填入
                            if (json.detail) {
                                this.setData({ detail: json.detail });
                            }
                        }
                    } catch (e) { wx.showToast({ title: 'AI返回格式有误', icon: 'none' }); }
                }
                this.setData({ summarySuggesting: false });
            },
            fail: () => {
                wx.showToast({ title: '网络错误', icon: 'none' });
                this.setData({ summarySuggesting: false });
            }
        });
    },
    // 简介确认/撤销
    confirmSummarySuggest() {
        this.setData({ showSummaryConfirm: false, highlightDetail: false, summaryQuestion: '' });
    },
    cancelSummarySuggest() {
        this.setData({ detail: this.data.originalDetail, showSummaryConfirm: false, highlightDetail: false, summaryQuestion: '' });
    },
});