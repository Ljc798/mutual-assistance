// 1. 定义数据类型
interface SelectedItem {
  id: number;
  name: string;
  value: string;
  color?: string;
}

// 2. 主页面
@Entry
@Component
struct MainPage {
  @State selectedItem: SelectedItem | null = null;
  @State buttonText: string = '请选择项目';

  build() {
    Column() {
      // 动态按钮 - 点击跳转到选择页面
      Button(this.buttonText)
        .width('90%')
        .height(80)
        .fontSize(18)
        .backgroundColor(this.selectedItem ? '#E8F5E8' : '#F0F0F0')
        .fontColor(this.selectedItem ? Color.Green : Color.Black)
        .border({
          width: 2,
          color: this.selectedItem ? Color.Green : Color.Gray
        })
        .borderRadius(12)
        .onClick(() => {
          // ✅ 使用HMRouter跳转，传递当前选择项
          HMRouter.push({
            url: 'pages/SelectPage',
            params: {
              currentSelection: this.selectedItem // 传递当前选择
            }
          });
        })

      // 显示选中项详情
      if (this.selectedItem) {
        Column() {
          Text(`已选择: ${this.selectedItem.name}`)
            .fontSize(16)
            .fontColor(Color.Blue)
          Text(`ID: ${this.selectedItem.id} | 值: ${this.selectedItem.value}`)
            .fontSize(14)
            .fontColor(Color.Gray)
        }
        .padding(10)
        .backgroundColor('#F8F8F8')
        .borderRadius(8)
        .margin({ top: 20 })
      }

      // 清除按钮
      if (this.selectedItem) {
        Button('清除选择')
          .width(120)
          .height(40)
          .fontSize(14)
          .backgroundColor(Color.Red)
          .fontColor(Color.White)
          .margin({ top: 10 })
          .onClick(() => {
            this.selectedItem = null;
            this.buttonText = '请选择项目';
          })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center')
    .padding(20)
  }

  aboutToAppear(): void {
    // ✅ 监听路由返回事件
    HMRouter.addRouteResultListener(this.onRouteResult.bind(this));
  }

  aboutToDisappear(): void {
    // 移除监听器
    HMRouter.removeRouteResultListener(this.onRouteResult.bind(this));
  }

  // ✅ 接收选择结果
  private onRouteResult(result: any): void {
    if (result && result.selectedItem) {
      this.selectedItem = result.selectedItem;
      this.buttonText = `已选择: ${this.selectedItem.name}`;
      console.log('接收到选择结果:', this.selectedItem);

      // 可以添加动画效果
      this.animateButton();
    }
  }

  private animateButton(): void {
    // 简单的动画效果
    // 可以通过状态变化触发UI更新
  }
}
