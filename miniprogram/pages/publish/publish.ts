import { checkTextContent } from "../../utils/security";

// 定义聊天消息类型
interface ChatMessage {
    type: 'user' | 'ai';
    content: string;
    timestamp: string;
}

// 定义提取的数据类型
interface ExtractedData {
    selectedCategory?: string;
    title?: string;
    detail?: string;
    takeCode?: string;
    takeName?: string;
    takeTel?: string;
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
        commissionAmount: 0,
        // 聊天相关状态
        showChatPopup: false, // 控制聊天弹窗显示
        chatMessages: [] as ChatMessage[], // 聊天消息列表
        chatInput: '', // 聊天输入框内容
        conversationId: '', // 对话ID
        extractedData: null as ExtractedData | null, // 提取的数据
        showFillButton: false, // 是否显示帮我填按钮
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

    choosePublishMethod(e) {
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
        this.setData({ 
            showChatPopup: true,
            chatMessages: [],
            conversationId: '',
            extractedData: null,
            showFillButton: false
        });
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
            chatInput: ''
        });

        try {
            // 调用后端API
            const response = await new Promise((resolve, reject) => {
                wx.request({
                    url: 'https://mutualcampus.top/api/ai/extract',
                    method: 'POST',
                    data: {
                        text: chatInput,
                        conversation_id: conversationId
                    },
                    header: { Authorization: `Bearer ${token}` },
                    success: resolve,
                    fail: reject
                });
            });

            const { data } = response as any;
            
            if (data.status === 'ok') {
                // 添加AI回复到聊天记录
                const aiMessage: ChatMessage = {
                    type: 'ai',
                    content: data.reply,
                    timestamp: new Date().toLocaleTimeString()
                };

                this.setData({
                    chatMessages: [...this.data.chatMessages, aiMessage],
                    conversationId: data.conversation_id || conversationId
                });

                // 检查是否返回了JSON数据
                this.checkForJsonData(data.reply);
            } else {
                wx.showToast({ title: "AI回复失败", icon: "none" });
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            wx.showToast({ title: "网络错误", icon: "none" });
        }
    },

    // 检查AI回复中是否包含JSON数据
    checkForJsonData(reply: string) {
        try {
            // 尝试从回复中提取JSON
            const jsonMatch = reply.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[0]) as ExtractedData;
                
                // 验证JSON结构是否符合预期
                const expectedFields = ['selectedCategory', 'title', 'detail', 'takeCode', 'takeName', 'takeTel', 'DDL', 'position', 'address', 'reward'];
                const hasValidStructure = expectedFields.some(field => jsonData.hasOwnProperty(field));
                
                if (hasValidStructure) {
                    this.setData({
                        extractedData: jsonData,
                        showFillButton: true
                    });
                }
            }
        } catch (error) {
            console.log('未检测到有效的JSON数据');
        }
    },

    // 帮我填按钮点击事件
    fillFormWithData() {
        const { extractedData } = this.data;
        if (!extractedData) return;

        // 处理日期和时间
        let date = '';
        let time = '';
        if (extractedData.DDL) {
            const ddlParts = extractedData.DDL.split(' ');
            if (ddlParts.length >= 2) {
                date = ddlParts[0];
                time = ddlParts[1];
            }
        }

        // 填充表单数据
        this.setData({
            selectedCategory: extractedData.selectedCategory || '',
            title: extractedData.title || '',
            detail: extractedData.detail || '',
            takeCode: extractedData.takeCode || '',
            takeName: extractedData.takeName || '',
            takeTel: extractedData.takeTel || '',
            DDL: extractedData.DDL || '',
            date: date,
            time: time,
            position: extractedData.position || '',
            address: extractedData.address || '',
            reward: extractedData.reward || '',
            extractedData: null,
            showFillButton: false
        });

        // 根据选中的任务分类显示不同的输入框
        if (extractedData.selectedCategory === '代拿快递') {
            this.setData({
                showTakeCode: true,
                showTakeAwayCode: false,
            });
        } else if (extractedData.selectedCategory === '代拿外卖') {
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

        wx.showToast({ title: "已自动填充表单", icon: "success" });
    },
});