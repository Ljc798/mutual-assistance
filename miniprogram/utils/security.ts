export function checkTextContent(content: string): Promise<boolean> {
    const token = wx.getStorageSync("token");

    return new Promise((resolve) => {
        if (!token) {
            wx.showToast({ title: "未登录", icon: "none" });
            resolve(false);
            return;
        }

        wx.request({
            url: "https://mutualcampus.top/api/user/check-text",
            method: "POST",
            data: { content },
            header: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            success: (res: any) => {
                if (res.data.success && res.data.safe) {
                    resolve(true);
                } else {
                    wx.showToast({ title: "内容含敏感词", icon: "none" });
                    resolve(false);
                }
            },
            fail: () => {
                wx.showToast({ title: "内容审核失败", icon: "none" });
                resolve(false);
            }
        });
    });
}