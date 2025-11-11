import promptAction from '@ohos.promptAction';
import router from '@ohos.router';
import { getJson } from '../../../../../../commons/basic1/src/main/ets';
import type { Task } from '../../../../../../commons/basic1/src/main/ets';

interface BidItem {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string;
  price: number | string;
  advantage: string;
}

interface BidResponse {
  success: boolean;
  bids: BidItem[];
}

const COLOR_TEXT_DARK: number = 0xFF333333;
const COLOR_TEXT_LIGHT: number = 0xFF666666;
const COLOR_TEXT_GRAY: number = 0xFF8C8C8C;
const COLOR_PRICE: number = 0xFF39B54A;

@Component
export struct TaskDetailPage {
  @Prop taskId: string = '28';
  @State task: Task | null = null;
  @State formattedDeadline: string = '';
  @State statusText: string = '';
  @State bids: BidItem[] = [];
  @State isLoading: boolean = true;
  @State commentNotice: string = '';

  aboutToAppear() {
    this.loadTaskDetail(this.taskId);
    this.loadBids(this.taskId);
  }

  private async loadTaskDetail(id: string) {
    this.isLoading = true;
    try {
      const response = await getJson<Task>(`/task/${id}`);
      if (!response) {
        this.safeToast('任务不存在');
        return;
      }
      const deadline = this.formatDeadline(response.DDL);
      const statusLabel = this.getStatusText(response.status);
      const displayPrice = response.status >= 1
        ? Number(response.pay_amount ?? response.offer ?? 0).toFixed(2)
        : Number(response.offer ?? 0).toFixed(2);

      const decoratedTask: Task = response;
      decoratedTask.formattedDDL = deadline;
      decoratedTask.formattedStatus = statusLabel;
      decoratedTask.displayPrice = displayPrice;

      this.task = decoratedTask;
      this.formattedDeadline = deadline;
      this.statusText = statusLabel;
      this.commentNotice = response.status === 0 ? '' : `当前任务已${statusLabel}，留言区暂不可用`;
    } catch (error) {
      this.safeToast('加载任务失败');
      console.error('loadTaskDetail error', JSON.stringify(error));
    } finally {
      this.isLoading = false;
    }
  }

  private async loadBids(id: string) {
    try {
      const response = await getJson<BidResponse>(`/task/${id}/bids`);
      if (response && response.success && Array.isArray(response.bids)) {
        this.bids = response.bids;
      } else {
        this.bids = [];
      }
    } catch (error) {
      console.error('loadBids error', JSON.stringify(error));
      this.bids = [];
    }
  }

  private formatDeadline(value?: string): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${month}-${day} ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
  }

  private getStatusText(status: number): string {
    switch (status) {
      case 0:
        return '待接单';
      case 1:
        return '进行中';
      case 2:
        return '已完成';
      default:
        return '未知状态';
    }
  }

  private handleBack() {
    router.back();
  }

  build() {
    Column() {
      if (this.isLoading) {
        Column() {
          Text('加载中...')
            .fontSize(16)
            .fontColor(Color.Gray);
        }
        .height('100%')
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center);
      } else if (!this.task) {
        Column() {
          Text('未找到任务详情')
            .fontSize(16)
            .fontColor(Color.Gray);
        }
        .height('100%')
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center);
      } else {
        Scroll() {
          Column() {
            this.DetailHeader();
            this.DetailInfoCard();
            this.DetailDescription();
            this.DetailBidsSection();
            Blank().height(40);
          }
          .padding({ left: 20, right: 20, top: 12, bottom: 12 });
        }
      }
    }
    .backgroundColor(0xFFF7F8FA)
    .height('100%')
    .width('100%');
  }

  @Builder
  private DetailHeader() {
    Row() {
      Text(this.task?.title ?? '任务详情')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor(COLOR_TEXT_DARK)
        .margin({ left: 10 });
    }
    .alignItems(VerticalAlign.Center)
    .margin({ bottom: 16 });
  }

  @Builder
  private DetailInfoCard() {
    Column() {
      Row() {
        Column() {
          Text(this.task?.title ?? '--')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(COLOR_TEXT_DARK)
            .margin({ bottom: 6 });
          Text(`期望完成时间：${this.formattedDeadline || '--'}`)
            .fontSize(13)
            .fontColor(COLOR_TEXT_LIGHT);
          Text(`交易地点：${this.task?.position ?? '--'}`)
            .fontSize(13)
            .fontColor(COLOR_TEXT_LIGHT);
          Text(`交付地点：${this.task?.address ?? '--'}`)
            .fontSize(13)
            .fontColor(COLOR_TEXT_LIGHT);
        }
        .flexGrow(1);
        Column() {
          Text(this.statusText || '--')
            .fontSize(14)
            .fontColor(COLOR_TEXT_LIGHT)
            .margin({ bottom: 10 });
          Text(this.task?.displayPrice ? `¥${this.task?.displayPrice}` : '--')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor(COLOR_PRICE);
        }
        .alignItems(HorizontalAlign.End);
      }
    }
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .backgroundColor(Color.White)
    .borderRadius(18)
    .margin({ bottom: 16 })
    .shadow({
      radius: 12,
      color: '#0D000000',
      offsetX: 0,
      offsetY: 6
    });
  }

  @Builder
  private DetailDescription() {
    Column() {
      Text('任务描述')
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor(COLOR_TEXT_DARK)
        .margin({ bottom: 8 });
      Text(this.task?.detail ?? '暂无描述')
        .fontSize(14)
        .fontColor(COLOR_TEXT_LIGHT)
        .lineHeight(20);

      if (this.commentNotice.length) {
        Text(this.commentNotice)
          .fontSize(13)
          .fontColor(Color.Gray)
          .margin({ top: 12 });
      }
    }
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .backgroundColor(Color.White)
    .borderRadius(18)
    .margin({ bottom: 16 });
  }

  @Builder
  private DetailBidsSection() {
    Column() {
      Row() {
        Text('留言/出价')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor(COLOR_TEXT_DARK);
        Blank();
        Text(`${this.bids.length}条`)
          .fontSize(12)
          .fontColor(COLOR_TEXT_GRAY);
      }
      .margin({ bottom: 12 });

      if (this.bids.length === 0) {
        Text('暂无留言，快来抢单吧！')
          .fontSize(14)
          .fontColor(COLOR_TEXT_LIGHT)
          .margin({ bottom: 8 });
      } else {
        Column() {
          ForEach(this.bids, (bid: BidItem) => {
            Column() {
              Row() {
                Image(bid.avatar_url || $r('app.media.icon_nav_user'))
                  .width(36)
                  .height(36)
                  .borderRadius(18);
                Column() {
                  Text(bid.username || '匿名用户')
                    .fontSize(14)
                    .fontWeight(FontWeight.Medium)
                    .fontColor(COLOR_TEXT_DARK);
                  Text(`¥${bid.price}`)
                    .fontSize(13)
                    .fontColor(COLOR_PRICE);
                }
                .margin({ left: 10 });
              }
              .alignItems(VerticalAlign.Center)
              .margin({ bottom: 6 });

              Text(bid.advantage || '暂未填写留言')
                .fontSize(13)
                .fontColor(COLOR_TEXT_LIGHT)
                .lineHeight(20);
            }
            .padding({ left: 12, right: 12, top: 10, bottom: 10 })
            .backgroundColor(0xFFF9FBFF)
            .borderRadius(14)
            .margin({ bottom: 12 });
          }, (bid: BidItem) => `${bid.id}`);
        }
      }
    }
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .backgroundColor(Color.White)
    .borderRadius(18);
  }

  private safeToast(message: string) {
    try {
      promptAction.showToast({ message: message });
    } catch (error) {
      console.error('toast error', JSON.stringify(error));
    }
  }
}
