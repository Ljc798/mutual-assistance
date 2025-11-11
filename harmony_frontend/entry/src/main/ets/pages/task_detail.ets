import router from '@ohos.router';

@Entry
@Component
struct TaskDetailPage {
  @State taskId: string = '';
  @State taskTitle: string = '';
  @State taskStatus: string = '';
  @State taskDeadline: string = '';
  @State taskPrice: string = '';

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    if (!params) {
      return;
    }
    this.taskId = params.id ? `${params.id}` : '';
    this.taskTitle = params.title ?? '';
    this.taskStatus = params.status ?? '';
    this.taskDeadline = params.deadline ?? '';
    this.taskPrice = params.price ?? '';
  }

  build() {
    Column() {
      Text(this.taskTitle || '任务详情')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.Black)
        .margin({ bottom: 16 });

      if (this.taskId.length) {
        Text(`任务编号：${this.taskId}`)
          .fontSize(14)
          .fontColor(Color.Grey)
          .margin({ bottom: 8 });
      }

      if (this.taskStatus.length) {
        Text(`任务状态：${this.taskStatus}`)
          .fontSize(15)
          .fontColor(Color.Grey)
          .margin({ bottom: 8 });
      }

      if (this.taskDeadline.length) {
        Text(`截止时间：${this.taskDeadline}`)
          .fontSize(15)
          .fontColor(Color.Grey)
          .margin({ bottom: 8 });
      }

      if (this.taskPrice.length) {
        Text(`报价：${this.taskPrice}`)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#39B54A')
          .margin({ top: 12 });
      }
    }
    .padding({ left: 24, right: 24, top: 24, bottom: 24 })
    .backgroundColor(Color.White)
    .height('100%')
    .width('100%')
    .justifyContent(FlexAlign.Start)
    .alignItems(HorizontalAlign.Start);
  }
}
