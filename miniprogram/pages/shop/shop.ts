Page({
    data: {
      items: [],
    },
  
    onLoad() {
      this.fetchItems();
    },

    goBack() {
        wx.navigateBack({delta: 1});
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
  
    // 点击积分兑换
    handleRedeemPoint(e: any) {
      const itemId = e.currentTarget.dataset.id;
      wx.showToast({ title: `使用积分兑换商品 ID: ${itemId}`, icon: 'none' });
  
      // TODO：调用积分兑换接口
    },
  
    // 点击立即购买
    handleRedeem(e: any) {
        const itemId = e.currentTarget.dataset.id;
        const type = e.currentTarget.dataset.type;
      
        if (type === 'point') {
          this.redeemByPoint(itemId);
        } else if (type === 'money') {
          this.redeemByMoney(itemId);
        } else if (type === 'both') {
          wx.showActionSheet({
            itemList: ['积分兑换', '微信支付购买'],
            success: (res) => {
              if (res.tapIndex === 0) {
                this.redeemByPoint(itemId);
              } else if (res.tapIndex === 1) {
                this.redeemByMoney(itemId);
              }
            },
            fail: () => {
              console.log("❌ 用户取消兑换选择");
            }
          });
        }
      }
  });