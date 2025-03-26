Page({
    data: {
      items: [],
    },
  
    onLoad() {
      this.fetchItems();
    },
  
    goBack() {
      wx.navigateBack({ delta: 1 });
    },
  
    fetchItems() {
      wx.request({
        url: 'http://localhost:3000/api/shop/items',
        method: 'GET',
        success: (res) => {
          if (res.data.success) {
            console.log(res.data);
            this.setData({ items: res.data.items });
          } else {
            wx.showToast({ title: '获取商品失败', icon: 'none' });
          }
        }
      });
    },
  
    // ✅ 积分兑换
    redeemByPoint(itemId: number) {
      const app = getApp();
      const token = wx.getStorageSync("token");
  
      wx.request({
        url: 'http://localhost:3000/api/shop/redeem-point',
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          user_id: app.globalData.userInfo.id,
          item_id: itemId
        },
        success: (res) => {
          if (res.data.success) {
            wx.showToast({ title: '兑换成功', icon: 'success' });
  
            // ✅ 刷新商品数据
            this.fetchItems();
  
            // ✅ 刷新用户积分
            app.globalData.userInfo.points -= res.data.cost || 0;
            wx.setStorageSync("user", app.globalData.userInfo);
            app.refreshUserInfo();
          } else {
            wx.showToast({ title: res.data.message || '兑换失败', icon: 'none' });
          }
        },
        fail: () => {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
  
    // ✅ 微信支付兑换占位函数
    redeemByMoney(itemId: number) {
        const app = getApp();
        const user = app.globalData.userInfo;
      
        wx.request({
          url: "http://localhost:3000/api/pay/create",
          method: "POST",
          data: {
            openid: user.openid,
            description: "兑换商品",
            order_no: `ORDER_${Date.now()}`, // 一般会生成有时间戳的唯一订单号
            total_fee: 100, // 单位是分（比如 1 元就填 100）
          },
          success: (res: any) => {
            if (res.data.success) {
              const payData = res.data;
              wx.requestPayment({
                timeStamp: payData.timeStamp,
                nonceStr: payData.nonceStr,
                package: payData.package,
                signType: payData.signType,
                paySign: payData.paySign,
                success: () => {
                  wx.showToast({ title: "支付成功", icon: "success" });
                },
                fail: () => {
                  wx.showToast({ title: "支付取消或失败", icon: "none" });
                }
              });
            } else {
              wx.showToast({ title: res.data.message || "支付失败", icon: "none" });
            }
          }
        });
      },
  
    // ✅ 点击统一处理兑换逻辑
    handleRedeem(e: any) {
        const itemId = e.currentTarget.dataset.id;
        const type = e.currentTarget.dataset.type;
      
        if (type === 'point') {
          this.confirmRedeemByPoint(itemId);
        } else if (type === 'money') {
          this.redeemByMoney(itemId);
        } else if (type === 'both') {
          wx.showActionSheet({
            itemList: ['积分兑换', '微信支付购买'],
            success: (res) => {
              if (res.tapIndex === 0) {
                this.confirmRedeemByPoint(itemId); // ✅ 加确认弹窗
              } else if (res.tapIndex === 1) {
                this.redeemByMoney(itemId); // ✅ 直接支付
              }
            },
            fail: () => {
              console.log("❌ 用户取消兑换选择");
            }
          });
        }
      },
      confirmRedeemByPoint(itemId: number) {
        wx.showModal({
          title: "确认兑换",
          content: "你确定要使用积分兑换该商品吗？",
          confirmColor: "#ff416c",
          success: (res) => {
            if (res.confirm) {
              this.redeemByPoint(itemId);
            }
          }
        });
      }
  });