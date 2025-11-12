import promptAction from '@ohos.promptAction'
import {
  AppBreakPoint, AppSafeArea, BreakPointType, HDMProgressLoading, TaskItem, TaskStatus
} from 'basic'
import { TaskFilterValue, HomeCategoryItem, TaskFilter, PriceInfo } from '../viewmodels/HomeTypes'
import { fetchTasks as fetchHomeTasks, TaskQuery } from '../services/TaskService'
import { AppStorageV2 } from '@kit.ArkUI'

type TaskMode = 'fixed' | 'bidding'

@Component
export struct HomeView {
  private scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  breakPoint: AppBreakPoint = AppStorageV2.connect(AppBreakPoint, () => new AppBreakPoint())!
  @State isRefreshing: boolean = false
  @State keyword: string = ''
  @State selectedCategory: string = '全部'
  @State activeFilter: TaskFilterValue = 'all'
  @State selectedSchool: string = '请选择学校'
  @State allTasks: TaskItem[] = []
  @State visibleTasks: TaskItem[] = []
  @State searchResults: TaskItem[] = []
  private readonly pageSize: number = 10
  @State currentPage: number = 1
  @State hasMore: boolean = true
  @State isLoadingMore: boolean = false
  @State refreshText: string = '下拉刷新'
  @State page: number = 1
  @State isFinished: boolean = false
  private searchTimer?: number
  private readonly filters: TaskFilter[] = [
    { label: '全部', value: 'all' },
    { label: '待接单', value: 0 },
    { label: '进行中', value: 1 },
    { label: '已完成', value: 2 }
  ]
  private readonly categories: HomeCategoryItem[] = [
    {
      label: '代拿快递',
      value: '代拿快递',
      icon: $r('app.media.icon_category_courier'),
      action: 'category'
    },
    {
      label: '代拿外卖',
      value: '代拿外卖',
      icon: $r('app.media.icon_category_takeaway'),
      action: 'category'
    },
    {
      label: '兼职发布',
      value: '兼职发布',
      icon: $r('app.media.icon_category_parttime'),
      action: 'category'
    },
    {
      label: '代办服务',
      value: '代办服务',
      icon: $r('app.media.icon_category_agency'),
      action: 'category'
    },
    { label: '我的课表', icon: $r('app.media.icon_category_schedule'), action: 'timetable' },
    {
      label: '二手交易',
      value: '二手交易',
      icon: $r('app.media.icon_category_secondhand'),
      action: 'category'
    },
    {
      label: '寻物启事',
      value: '寻物启事',
      icon: $r('app.media.icon_category_lostfound'),
      action: 'category'
    },
    {
      label: '作业协助',
      value: '作业协助',
      icon: $r('app.media.icon_category_homework'),
      action: 'category'
    },
    {
      label: '万能服务',
      value: '万能服务',
      icon: $r('app.media.icon_category_service'),
      action: 'category'
    },
    { label: '我的任务', icon: $r('app.media.icon_category_orders'), action: 'orders' }
  ]

  aboutToAppear() {
    this.loadTasks()
  }

  aboutToDisappear() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = undefined
    }
  }

  build() {
    Column() {
      Refresh({
        refreshing: this.isRefreshing,
        builder: this.renderRefreshHeader
      }) {
        Scroll(this.scroller) {
          Column({ space: 12 }) {
            // 页面各部分
            this.renderHeader()
            this.renderCategories()
            this.renderFilterBar()
            this.renderTasks()
          }
          .padding({
            left: 0,
            right: 0,
            top: 0,
            bottom: 80 + this.safeArea.bottomHeight
          })
          .width('100%')
        }
        .onScrollEdge((side: Edge) => {
          if (side === Edge.Bottom) {
            this.loadMoreTasks()
          }
        })
      }
      // 刷新状态更新逻辑（文字动态变化）
      .onStateChange((state: RefreshStatus) => {
        switch (state) {
          case RefreshStatus.Inactive:
            this.refreshText = '下拉刷新'
            break
          case RefreshStatus.Drag:
            this.refreshText = '继续下拉'
            break
          case RefreshStatus.OverDrag:
            this.refreshText = '松手刷新'
            break
          case RefreshStatus.Refresh:
            this.refreshText = '正在刷新任务...'
            break
          case RefreshStatus.Done:
            this.refreshText = '刷新完成'
            break
        }
      })
      .onRefreshing(() => this.handleRefresh())
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  async handleRefresh() {
    if (this.isRefreshing || this.isLoadingMore) {
      return
    }
    this.isRefreshing = true
    this.refreshText = '正在刷新任务...'

    try {
      // 重置状态
      this.page = 1
      this.isFinished = false

      // 并发加载首页数据与推荐任务
      await Promise.all([
        this.resetPagingState(),
        this.loadTasks()
      ])

      this.refreshText = '刷新成功'
    } catch (error) {
      console.error('[刷新失败]', error)
      this.refreshText = '刷新失败，请重试'
    } finally {
      // 稍微延迟关闭，防止闪烁
      setTimeout(() => {
        this.isRefreshing = false
      }, 600)
    }
  }

  @Builder
  private renderRefreshHeader() {
    Row({ space: 10 }) {
      Text(this.refreshText)
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
      // 加载动画组件
      HDMProgressLoading({ pWidth: 18, strokeWidth: 2 })
    }
    .width('100%')
    .height(60)
    .justifyContent(FlexAlign.Center)
    .backgroundColor(Color.Transparent)
  }

  @Builder
  private renderHeader() {
    Column() {
      Row() {
        Text('首页')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('[basic].color.white'));
        Blank();
        Row() {
          Image($r('app.media.icon_location_pin'))
            .width(18)
            .height(18)
            .margin({ right: 4 });
          // todo school
          Text('请选择学校')
            .fontSize(16)
            .fontColor($r('[basic].color.white'))
            .fontWeight(FontWeight.Regular)
            .onClick(() => this.handleSchoolTap());
        }
        .alignItems(VerticalAlign.Center);
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)
      .justifyContent(FlexAlign.Start)
      .margin({ bottom: 8 });

      this.renderSearchBox();
    }
    .width('100%')
    .margin({ left: -this.getHorizontalPadding(), right: -this.getHorizontalPadding() })
    .padding({
      top: this.safeArea.topHeight + 6,
      bottom: 6,
      left: 20,
      right: 20
    })
    .backgroundColor($r('[basic].color.home_header_bg'));
  }

  @Builder
  private renderSearchBox() {
    Column() {
      Row() {
        TextInput({ placeholder: '今天想找点什么呢' })
          .width('100%')
          .placeholderColor(0xFF999999)
          .fontSize(14)
          .caretColor($r('[basic].color.text_primary'))
          .padding({ left: 6, right: 16 })
          .height(32)
          .borderRadius(24)
          .backgroundColor($r('[basic].color.white'))
          // .onChange((value: string) => this.handleSearchChange(value))
          .layoutWeight(1);

        Row() {
          Text('搜索')
            .fontSize(14)
            .fontColor($r('[basic].color.white'))
            .fontWeight(FontWeight.Medium);
        }
        .backgroundColor($r('[basic].color.home_header_bg'))
        .borderRadius(24)
        .height(26)
        .padding({ left: 10, right: 10 })
        .margin({ right: 3 })
        .alignItems(VerticalAlign.Center)
        .justifyContent(FlexAlign.Center)

        // .onClick(() => this.executeSearch(this.keyword));
      }
      .alignItems(VerticalAlign.Center)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(24)
      .margin({ top: 2 });

    }
  }

  @Builder
  private renderCategories() {
    Flex({
      wrap: FlexWrap.Wrap,
      justifyContent: FlexAlign.SpaceBetween,
    }) {
      ForEach(this.categories, (item: HomeCategoryItem) => {
        Column({ space: 8 }) {
          Image(item.icon)
            .width(48)
            .height(48)
          Text(item.label)
            .fontSize(13)
            .fontColor(
              this.selectedCategory === item.value
                ? $r('[basic].color.home_header_bg')
                : $r('[basic].color.category_text')
            )
        }
        .width('20%')
        .padding({ top: 8, bottom: 8 })
        .borderRadius(16)
        .backgroundColor(
          this.selectedCategory === item.value && item.action === 'category'
            ? $r('[basic].color.category_active_overlay')
            : Color.Transparent
        )
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .onClick(() => this.handleCategoryTap(item))
        .accessibilityDescription(`${item.label}分类`)
      }, (item: HomeCategoryItem) => item.label)
    }
  }

  @Builder
  private renderFilterBar() {
    Column() {
      Row({ space: 12 }) {
        ForEach(this.filters, (item: TaskFilter) => {
          Text(item.label)
            .fontSize(14)
            .fontColor(this.activeFilter === item.value ? $r('[basic].color.white') : $r('[basic].color.text_primary'))
            .padding({ left: 18, right: 18, top: 10, bottom: 10 })
            .backgroundColor(this.activeFilter === item.value ? $r('[basic].color.filter_active_bg') : $r('[basic].color.white'))
            .borderRadius(999)
            .onClick(() => this.handleFilterTap(item.value))
        }, (item: TaskFilter) => item.label)
      }
      .justifyContent(FlexAlign.SpaceEvenly)
      .width('100%')
      .alignItems(VerticalAlign.Center);
    }
    .margin({left: 16, right: 16})
    .padding({ top: 12, bottom: 6, left: 12, right: 12 })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(28)
    .shadow({
      radius: 10,
      color: $r('[basic].color.white'),
      offsetX: 0,
      offsetY: 4
    });
  }

  @Builder
  private renderTasks() {
    Column({ space: 12 }) {
      if (this.visibleTasks.length === 0) {
        Column({ space: 6 }) {
          Text('暂无任务')
            .fontSize(16)
            .fontColor($r('[basic].color.text_secondary'))
          Text('换个分类或稍后再试试吧~')
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
        }
        .width('100%')
        .padding(24)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(16)
      } else {
        ForEach(this.visibleTasks, (task: TaskItem) => {
          ListItem() {
            this.TaskCard(task);
          }
          .padding({ left: 16, right: 16, top: 6 });
        }, (task: TaskItem) => task.id);
        this.renderLoadMoreSection()
      }
    }
  }

  @Builder
  private renderLoadMoreSection() {
    if (this.isLoadingMore) {
      Row() {
        Text('加载中...')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
      }
      .width('100%')
      .justifyContent(FlexAlign.Center)
      .padding({ top: 12, bottom: 24 })

    }
    if (this.hasMore) {
      Row() {
        Text('上拉加载更多')
          .fontSize(14)
          .fontColor($r('[basic].color.filter_active_bg'))
      }
      .width('100%')
      .justifyContent(FlexAlign.Center)
      .padding({ top: 12, bottom: 24 })
    }
    Row() {
      Text('已经到底啦~')
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
    }
    .width('100%')
    .justifyContent(FlexAlign.Center)
    .padding({ top: 12, bottom: 24 })
  }

  @Builder
  private TaskCard(task: TaskItem) {
    Row() {
      Column() {
        Text(task.title)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.text_primary'))
          .margin({ bottom: 8 });
        Text(`期望完成时间：${task.formattedDeadline ? task.formattedDeadline : '--'}前`)
          .fontSize(13)
          .fontColor($r('[basic].color.text_primary'))
          .margin({ bottom: 4 });
        Text(`交易地点：${task.position ? task.position : '-'}`)
          .fontSize(13)
          .fontColor($r('[basic].color.text_primary'))
          .margin({ bottom: 4 });
        Text(`送达地点：${task.address ? task.address : '-'}`)
          .fontSize(13)
          .fontColor($r('[basic].color.text_primary'));
      }
      .alignItems(HorizontalAlign.Start)

      Column() {
        Text(task.status !== undefined ? this.getStatusLabel(task.status) : '')
          .fontSize(14)
          .fontColor(this.getStatusColor(task.status))
          .margin({ bottom: 12 });
        Text(this.getPriceInfo(task).label)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.getPriceInfo(task).color);
      }
      .height(80)
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(HorizontalAlign.End)
      .padding({ right: 5 });
      // todo much words are wrong on the template
    }
    .width('100%')
    .justifyContent(FlexAlign.SpaceBetween)
    .alignItems(VerticalAlign.Top)
    .padding({
      left: 15,
      right: 15,
      top: 15,
      bottom: 15
    })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(18)
    .shadow({
      radius: 12,
      color: '#0A000000',
      offsetX: 0,
      offsetY: 6
    })
    .onClick(() => this.handleTaskSelect(task))

  }

  private getHorizontalPadding(): number {
    return new BreakPointType<number>({
      xs: 16,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 40
    }).getValue(this.breakPoint.breakPoint) ?? 16
  }

  private async loadTasks(isLoadMore: boolean = false) {
    if (isLoadMore && (!this.hasMore || this.isLoadingMore)) {
      return
    }
    if (!isLoadMore && (this.isRefreshing || this.isLoadingMore)) {
      return
    }
    const nextPage = isLoadMore ? this.currentPage + 1 : 1
    if (isLoadMore) {
      this.isLoadingMore = true
    } else {
      this.isRefreshing = true
    }
    try {
      const query: TaskQuery = {
        page: nextPage,
        pageSize: this.pageSize,
        category: this.selectedCategory,
        status: this.activeFilter
      }
      const tasks = await this.fetchTasks(query)
      if (isLoadMore) {
        this.allTasks = [...this.allTasks, ...tasks]
        this.visibleTasks = [...this.visibleTasks, ...tasks]
      } else {
        this.allTasks = tasks
        this.visibleTasks = tasks
      }
      this.currentPage = nextPage
      this.hasMore = tasks.length === this.pageSize
      this.updateSearchResults(this.keyword)
    } catch (error) {
      this.showToast('任务加载失败')
    } finally {
      if (isLoadMore) {
        this.isLoadingMore = false
      } else {
        this.isRefreshing = false
      }
    }
  }

  private async fetchTasks(query?: TaskQuery): Promise<TaskItem[]> {
    return await fetchHomeTasks(query)
  }

  private handleCategoryTap(item: HomeCategoryItem) {
    if (item.action === 'timetable') {
      this.showToast('课表功能即将上线，敬请期待')
      return
    }
    if (item.action === 'orders') {
      this.showToast('我的任务页开发中')
      return
    }
    if (item.value) {
      const nextCategory = this.selectedCategory === item.value ? '全部' : item.value
      this.selectedCategory = nextCategory
      this.resetPagingState()
      this.loadTasks()
    }
  }

  private handleFilterTap(value: TaskFilterValue) {
    if (this.activeFilter === value) {
      return
    }
    this.activeFilter = value
    this.resetPagingState()
    this.loadTasks()
  }

  private onSearchInput(value: string) {
    this.keyword = value
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    this.searchTimer = setTimeout(() => {
      this.updateSearchResults(value)
    }, 500)
  }

  private updateSearchResults(value: string) {
    const keyword = value.trim().toLowerCase()
    if (!keyword) {
      this.searchResults = []
      return
    }
    this.searchResults = this.allTasks.filter(task => task.title.toLowerCase()
      .includes(keyword)).slice(0, 5)
  }

  private resetPagingState() {
    this.currentPage = 1
    this.hasMore = true
  }

  private getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case 0:
        return '待接单'
      case 1:
        return '进行中'
      case 2:
        return '已完成'
      default:
        return '未知状态'
    }
  }

  private getStatusColor(status: TaskStatus): ResourceColor {
    switch (status) {
      case 0:
        return $r('[basic].color.status_pending')
      case 1:
        return $r('[basic].color.status_ongoing')
      case 2:
      default:
        return $r('[basic].color.status_finished')
    }
  }

  private getPriceInfo(task: TaskItem): PriceInfo {
    const offerValue = Number(task.offer ?? 0)
    const fixedLabel = `一口价 ¥${offerValue.toFixed(2)}`
    if (task.mode === 'fixed') {
      if (task.status === 0) {
        return { label: fixedLabel, color: $r('[basic].color.price_fixed') }
      }
      if (task.status === 1) {
        return { label: fixedLabel, color: $r('[basic].color.price_processing') }
      }
      return { label: fixedLabel, color: $r('[basic].color.price_done') }
    }
    if (!task.hasPaid) {
      return { label: `参考价 ¥${offerValue.toFixed(2)}`, color: $r('[basic].color.price_bidding') }
    }
    if (task.status === 2) {
      const finalAmount = Number(task.payAmount ?? task.offer ?? 0).toFixed(2)
      return { label: `成交价 ¥${finalAmount}`, color: $r('[basic].color.price_done') }
    }
    const bidAmount = Number(task.payAmount ?? task.offer ?? 0).toFixed(2)
    return { label: `中标价 ¥${bidAmount}`, color: $r('[basic].color.price_deal') }
  }


  private handleTaskSelect(task: TaskItem) {
    this.showToast(`查看任务: ${task.title}`)
  }

  private handleSchoolTap() {
    this.showToast('学校选择功能开发中')
  }

  private loadMoreTasks() {
    if (!this.hasMore || this.isLoadingMore) {
      return
    }
    this.loadTasks(true)
  }

  private showToast(message: string) {
    promptAction.showToast({
      message,
      duration: 1500,
      bottom: 100
    })
  }
}
