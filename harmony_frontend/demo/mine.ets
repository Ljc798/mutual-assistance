//notifications
// 消息数据模型
class MessageItem {
  id: string = ''
  content: string = ''
  timestamp: string = ''
  @State isRead: boolean = false  // ⭐ 关键：使用@State标记已读状态

  constructor(id: string, content: string, timestamp: string) {
    this.id = id
    this.content = content
    this.timestamp = timestamp
    this.isRead = false
  }
}

@Entry
@Component
struct MessageListPage {
  // ⭐ 使用@State管理消息列表，确保数据变化触发UI更新
  @State messageList: MessageItem[] = [
    new MessageItem('1', '你好，最近怎么样？', '10:30'),
    new MessageItem('2', '会议安排已更新', '10:25'),
    new MessageItem('3', '项目进度报告', '10:15'),
    new MessageItem('4', '周末团建通知', '09:45')
  ]

  build() {
    Column() {
      // 标题栏
      Text('消息列表')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 20, bottom: 20 })

      // 消息列表
      List({ space: 10 }) {
        ForEach(this.messageList, (item: MessageItem) => {
          ListItem() {
            this.MessageItemComponent(item)
          }
        }, (item: MessageItem) => item.id)
      }
      .width('100%')
      .height('100%')
      .padding(10)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }

  // ⭐ 单个消息项组件
  @Builder
  MessageItemComponent(item: MessageItem) {
    Row({ space: 12 }) {

      // 消息内容区域
      Column({ space: 6 }) {
        Text(item.content)
          .fontSize(16)
          .fontColor(item.isRead ? '#999999' : '#000000') // ⭐ 已读消息文字变灰
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text(item.timestamp)
          .fontSize(12)
          .fontColor('#888888')
      }
      .flexGrow(1)
      .alignItems(HorizontalAlign.Start)

      // ⭐ 已读按钮 - 根据isRead状态动态显示/隐藏
      if (!item.isRead) {
        Button('标记已读')
          .fontSize(14)
          .padding({ left: 12, right: 12, top: 6, bottom: 6 })
          .backgroundColor('#007AFF')
          .fontColor(Color.White)
          .borderRadius(8)
          .onClick(() => {
            this.markAsRead(item.id) // ⭐ 点击触发状态更新
          })
      }
    }
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .width('100%')
    .backgroundColor(item.isRead ? '#F0F0F0' : '#FFFFFF') // ⭐ 背景色根据状态变化
    .borderRadius(12)
    .shadow({ radius: 2, color: '#20000000', offsetX: 0, offsetY: 1 })
  }

  // ⭐ 标记为已读的方法
  markAsRead(messageId: string) {
    // 根据《状态管理最佳实践.pdf》：通过修改@State数据触发UI更新
    const index = this.messageList.findIndex(item => item.id === messageId)
    if (index !== -1) {
      // ⭐ 关键：直接修改@State修饰的数组元素会触发UI刷新
      this.messageList[index].isRead = true

      // 如果需要强制刷新整个列表，可以使用数组重新赋值
      // this.messageList = [...this.messageList]
    }
  }
}


// ⭐ 使用@ObservedV2实现深度监听
@ObservedV2
class ObservableMessageItem {
  id: string = ''
  content: string = ''
  timestamp: string = ''
  @Trace isRead: boolean = false  // ⭐ 使用@Trace标记可追踪属性

  constructor(id: string, content: string, timestamp: string) {
    this.id = id
    this.content = content
    this.timestamp = timestamp
    this.isRead = false
  }
}

@Entry
@Component
struct OptimizedMessageList {
  @State messageList: ObservableMessageItem[] = [
    new ObservableMessageItem('1', '优化版本消息', '10:30'),
    new ObservableMessageItem('2', '深度监听示例', '10:25')
  ]

  build() {
    Column() {
      List({ space: 10 }) {
        ForEach(this.messageList, (item: ObservableMessageItem) => {
          ListItem() {
            this.OptimizedMessageItem(item)
          }
        }, (item: ObservableMessageItem) => item.id)
      }
    }
  }

  @Builder
  OptimizedMessageItem(item: ObservableMessageItem) {
    Row({ space: 12 }) {
      Column({ space: 6 }) {
        Text(item.content)
          .fontSize(16)
          .fontColor(item.isRead ? '#999999' : '#000000')

        Text(item.timestamp)
          .fontSize(12)
          .fontColor('#888888')
      }
      .flexGrow(1)

      // ⭐ 使用条件渲染控制按钮显示
      if (!item.isRead) {
        Button('标记已读')
          .onClick(() => {
            this.optimizedMarkAsRead(item.id)
          })
      }
    }
    .padding(16)
    .backgroundColor(item.isRead ? '#F0F0F0' : '#FFFFFF')
    .borderRadius(12)
  }

  optimizedMarkAsRead(messageId: string) {
    // ⭐ @ObservedV2 + @Trace 会自动触发UI更新
    const message = this.messageList.find(item => item.id === messageId)
    if (message) {
      message.isRead = true
    }
  }
  @Builder
  AnimatedMessageItem(item: MessageItem) {
    // ⭐ 添加状态变化动画
    let backgroundColor: Color = item.isRead ? Color.Gray : Color.White

    Row({ space: 12 }) {
      // ... 内容区域同上

      if (!item.isRead) {
        Button('标记已读')
          .onClick(() => {
            // ⭐ 使用动画过渡
            animateTo({
              duration: 300,
              curve: Curve.EaseInOut
            }, () => {
              this.markAsRead(item.id)
            })
          })
      }
    }
    .padding(16)
    .backgroundColor(backgroundColor) // ⭐ 动画会自动过渡颜色
    .borderRadius(12)
  }

}


