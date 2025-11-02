import { BASE_URL } from '../../config/env';

Page({
    data: {
        reputation: {},
        logs: [],
        rules: [],
        weightedScore: 0, // ⭐ 平均权重分（小数）
        creditLevel: '',  // 等级文字
    },

    onLoad() {
        this.loadReputation();
        this.loadReputationLogs();
        this.loadReputationRules();
    },

    /** 获取信誉总览 */
    async loadReputation() {
        const token = wx.getStorageSync('token');
        wx.request({
            url: `${BASE_URL}/user/reputation`,
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (!res.data.success) return;

                const data = res.data.data;
                const avg = parseFloat(data.average_rating || 0); // 平均评价星级 (0-5)
                const score = parseFloat(data.total_score || 0);   // 信誉分 (0-100)

                // ⭐ 加权平均
                const weighted = avg * 0.7 + (score / 20) * 0.3;

                // ⭐ 计算等级文字
                let level = '';
                if (weighted >= 4.5) level = '极好';
                else if (weighted >= 4.0) level = '良好';
                else if (weighted >= 3.0) level = '中等';
                else if (weighted >= 2.0) level = '一般';
                else if (weighted >= 1.0) level = '较差';
                else level = '极差';
                console.log(weighted);
                

                this.setData({
                    reputation: data,
                    weightedScore: weighted, // ⭐保留小数值
                    creditLevel: level,
                });
            },
        });
    },

    /** 获取信誉变动日志 */
    async loadReputationLogs() {
        const token = wx.getStorageSync('token');
        wx.request({
            url: `${BASE_URL}/user/reputation/logs`,
            header: { Authorization: `Bearer ${token}` },
            success: (res: any) => {
                if (res.data.success) {
                    this.setData({ logs: res.data.data });
                }
            },
        });
    },

    /** 获取信誉规则 */
    loadReputationRules() {
        wx.request({
            url: `${BASE_URL}/user/reputation/rules`,
            success: (res: any) => {
                if (res.data.success) {
                    this.setData({ rules: res.data.data });
                }
            },
        });
    },

    handleBack() {
        wx.navigateBack({ delta: 1 });
    },
});
