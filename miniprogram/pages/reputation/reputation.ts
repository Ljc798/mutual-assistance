import { BASE_URL } from '../../config/env';
Page({
    data: {
        reputation: {},
        logs: [],
        rules: [],
        starCount: 0,
        creditLevel: ''
    },

    onLoad() {
        this.loadReputation();
        this.loadReputationLogs();
        this.loadReputationRules();
    },

    async loadReputation() {
        const token = wx.getStorageSync("token");
        wx.request({
            url: `${BASE_URL}/user/reputation`,
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    const data = res.data.data;
                    let stars = 4, level = '良好';
                    if (data.total_score >= 90) { stars = 5; level = '优秀'; }
                    else if (data.total_score >= 80) { stars = 4; level = '良好'; }
                    else if (data.total_score >= 70) { stars = 3; level = '中等'; }
                    else if (data.total_score >= 60) { stars = 2; level = '一般'; }
                    else { stars = 1; level = '差'; }

                    this.setData({ reputation: data, starCount: stars, creditLevel: level });
                }
            }
        });
    },

    async loadReputationLogs() {
        const token = wx.getStorageSync("token");
        wx.request({
            url: `${BASE_URL}/user/reputation/logs`,
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    this.setData({ logs: res.data.data });
                }
            }
        });
    },

    loadReputationRules() {
        wx.request({
            url: `${BASE_URL}/user/reputation/rules`,
            success: (res: any) => {
                if (res.data.success) {
                    this.setData({ rules: res.data.data });
                }
            }
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    }
});
