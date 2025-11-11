import promptAction from '@ohos.promptAction';
import router from '@ohos.router';
import { fetchTasks, searchTasks, TaskQuery } from '../services/taskService';
import type { Task } from '../types/task';

type PriceState = 'fixed' | 'processing' | 'bidding' | 'deal' | 'finished';

interface FilterOption {
  label: string;
  value: string;
}

interface CategoryItem {
  label: string;
  icon: Resource;
  value?: string;
  action?: string;
}

interface PriceInfo {
  displayPrice: string;
  priceState: PriceState;
}

interface ToastOptions {
  message: string;
  duration?: number;
  bottom?: number;
}

const FILTER_OPTIONS: FilterOption[] = [
  { label: '全部', value: 'all' },
  { label: '待接单', value: '0' },
  { label: '进行中', value: '1' },
  { label: '已完成', value: '2' }
];

const CATEGORY_ITEMS: CategoryItem[] = [
  { label: '代拿快递', value: '代拿快递', icon: $r('app.media.icon_express') },
  { label: '代拿外卖', value: '代拿外卖', icon: $r('app.media.icon_takeout') },
  { label: '兼职发布', value: '兼职发布', icon: $r('app.media.icon_parttime') },
  { label: '代办服务', value: '代办服务', icon: $r('app.media.icon_errand') },
  { label: '我的课表', action: 'timetable', icon: $r('app.media.icon_schedule') },
  { label: '二手交易', value: '二手交易', icon: $r('app.media.icon_resale') },
  { label: '寻物启事', value: '寻物启事', icon: $r('app.media.icon_lostfound') },
  { label: '作业协助', value: '作业协助', icon: $r('app.media.icon_homework') },
  { label: '万能服务', value: '万能服务', icon: $r('app.media.icon_service') },
  { label: '我的任务', action: 'order', icon: $r('app.media.icon_my_tasks') }
];

const COLOR_BACKGROUND: number = 0xFFF7F8FA;
const COLOR_PRIMARY: number = 0xFFFF6B8B;
const COLOR_ACCENT: number = 0xFFFF416C;
const COLOR_TEXT_DARK: number = 0xFF333333;
const COLOR_TEXT_LIGHT: number = 0xFF666666;
const COLOR_BORDER: number = 0xFFF2F2F2;
const COLOR_CARD_SHADOW: string = '#14000000';
const COLOR_TEXT_GRAY: number = 0xFF8C8C8C;
const COLOR_PRICE: number = 0xFF39B54A;

@Entry
@Component
struct Index {
  private scroller: Scroller = new Scroller();
  private readonly pageSize: number = 10;
  @State tasks: Task[] = [];
  @State searchResults: Task[] = [];
  @State keyword: string = '';
  @State selectedCategory: string = '全部';
  @State selectedSchoolName: string = '请选择学校';
  @State selectedSchoolId: string = '';
  @State activeFilter: string = 'all';
  @State currentPage: number = 1;
  @State hasMore: boolean = true;
  @State isLoading: boolean = false;
  @State initialLoading: boolean = true;
  @State searchLoading: boolean = false;

  aboutToAppear() {
    if (!this.tasks.length) {
      this.loadTasks(false);
    }
  }

  build() {
    Column() {
      this.HeaderSection();
      List() {

        ListItem() {
          this.CategorySection();
        }

        ListItem() {
          this.FilterBar();
        }

        this.TaskList();
        this.LoadingFooter();

      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
      .onReachEnd(() => this.loadMore());

      this.BottomNavigation();
    }
    .justifyContent(FlexAlign.SpaceBetween)
    .backgroundColor(COLOR_BACKGROUND)
    .height('100%')
    .width('100%')
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM]);
  }

  private async loadTasks(isLoadMore: boolean) {
    if (this.isLoading) {
      return;
    }
    const nextPage = isLoadMore ? this.currentPage + 1 : 1;
    this.isLoading = true;
    const query: TaskQuery = {
      category: this.selectedCategory,
      page: nextPage,
      pageSize: this.pageSize,
      schoolId: this.selectedSchoolId,
      status: this.activeFilter === 'all' ? '' : Number(this.activeFilter)
    };

    try {
      const data = await fetchTasks(query);
      const decorated = this.decorateTasks(data);
      if (isLoadMore) {
        this.tasks = this.appendTasks(this.tasks, decorated);
      } else {
        this.tasks = decorated;
      }
      this.hasMore = decorated.length === this.pageSize;
      this.currentPage = nextPage;
    } catch (error) {
      this.safeToast('任务加载失败，请稍后再试');
    } finally {
      this.isLoading = false;
      this.initialLoading = false;
    }
  }

  private decorateTasks(source: Task[]): Task[] {
    if (!source || !source.length) {
      return [];
    }
    const result: Task[] = [];
    for (let i = 0; i < source.length; i++) {
      const task = source[i];
      task.formattedDDL = this.formatDeadline(task.DDL);
      task.formattedStatus = this.formatStatus(task.status);
      const priceInfo = this.buildPriceDisplay(task);
      task.displayPrice = priceInfo.displayPrice;
      task.priceState = priceInfo.priceState;
      result.push(task);
    }
    return result;
  }

  private appendTasks(existing: Task[], incoming: Task[]): Task[] {
    if (!existing.length) {
      return incoming;
    }
    return existing.concat(incoming);
  }

  private loadMore() {
    if (!this.hasMore || this.isLoading) {
      return;
    }
    this.loadTasks(true);
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
    const minuteText = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${month}-${day} ${hours}:${minuteText}`;
  }

  private formatStatus(status: number): string {
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

  private buildPriceDisplay(task: Task): PriceInfo {
    if (task.mode === 'fixed') {
      const price = Number(task.offer ? task.offer : 0).toFixed(2);
      if (task.status === 0) {
        return { displayPrice: `一口价 ¥${price}`, priceState: 'fixed' };
      }
      if (task.status === 1) {
        return { displayPrice: `一口价 ¥${price}`, priceState: 'processing' };
      }
      return { displayPrice: `一口价 ¥${price}`, priceState: 'finished' };
    }

    if (task.mode === 'bidding') {
      if (task.has_paid === 1 && task.status === 2) {
        const amount = Number(task.pay_amount ? task.pay_amount : 0).toFixed(2);
        return { displayPrice: `成交价 ¥${amount}`, priceState: 'finished' };
      }
      if (task.has_paid === 1) {
        const amount = Number(task.pay_amount ? task.pay_amount : 0).toFixed(2);
        return { displayPrice: `中标价 ¥${amount}`, priceState: 'deal' };
      }
      const offer = Number(task.offer ? task.offer : 0).toFixed(2);
      return { displayPrice: `参考价 ¥${offer}`, priceState: 'bidding' };
    }

    const fallback = Number(task.offer ? task.offer : 0).toFixed(2);
    return { displayPrice: `¥${fallback}`, priceState: 'fixed' };
  }

  private handleCategoryTap(item: CategoryItem) {
    if (item.action === 'timetable' || item.action === 'order') {
      this.safeToast('敬请期待');
      return;
    }
    if (!item.value) {
      return;
    }
    this.selectedCategory = item.value;
    this.currentPage = 1;
    this.hasMore = true;
    this.loadTasks(false);
  }

  private handleSchoolTap() {
    this.safeToast('学校选择功能开发中');
  }

  private onFilterChange(value: string) {
    if (this.activeFilter === value) {
      return;
    }
    this.activeFilter = value;
    this.currentPage = 1;
    this.hasMore = true;
    this.loadTasks(false);
  }

  private handleSearchChange(value: string) {
    this.keyword = value;
    if (!value || value.trim().length === 0) {
      this.searchResults = [];
      return;
    }
    this.executeSearch(value.trim());
  }

  private async executeSearch(keyword: string) {
    this.searchLoading = true;
    try {
      const results = await searchTasks(keyword, this.selectedSchoolId);
      this.searchResults = this.decorateTasks(results);
    } catch (error) {
      this.safeToast('搜索失败，请稍后再试');
    } finally {
      this.searchLoading = false;
    }
  }

  private handleTaskTap(task: Task) {
    if (!task?.id) {
      this.safeToast('任务 ID 缺失');
      return;
    }
    router.pushUrl({
      url: 'pages/task_detail',
      params: {
        id: task.id,
        title: task.title,
        status: task.formattedStatus ?? '',
        deadline: task.formattedDDL ?? '',
        price: task.displayPrice ?? ''
      }
    });
  }

  private getStatusColor(status: number): number {
    if (status === 0) {
      return 0xFFFFCC00;
    }
    if (status === 1) {
      return 0xFF4CAF50;
    }
    if (status === 2) {
      return 0xFF999999;
    }
    return COLOR_TEXT_DARK;
  }

  private getPriceColor(state?: PriceState): number {
    switch (state) {
      case 'fixed':
        return COLOR_PRICE;
      case 'processing':
        return COLOR_PRICE;
      case 'bidding':
        return COLOR_PRICE;
      case 'deal':
        return COLOR_PRICE;
      case 'finished':
        return COLOR_PRICE;
      default:
        return COLOR_PRICE;
    }
  }

  @Builder
  private HeaderSection() {
    Column() {
      Row() {
        Text('首页')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White);
        Blank();
        Row() {
          Image($r('app.media.icon_location'))
            .width(18)
            .height(18)
            .margin({ right: 4 });
          Text(this.selectedSchoolName.length ? this.selectedSchoolName : '请选择学校')
            .fontSize(16)
            .fontColor(Color.White)
            .fontWeight(FontWeight.Regular)
            .onClick(() => this.handleSchoolTap());
        }
        .alignItems(VerticalAlign.Center);
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)
      .justifyContent(FlexAlign.Start)
      .margin({ bottom: 8 });

      this.SearchSection();

    }
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP])
    .padding({
      top: 6,
      bottom: 6,
      left: 20,
      right: 20
    })
    .backgroundColor(COLOR_ACCENT);
  }

  @Builder
  private SearchSection() {
    Column() {
      Row() {
        TextInput({ placeholder: '今天想找点什么呢' })
          .width('100%')
          .placeholderColor(0xFF999999)
          .fontSize(14)
          .caretColor(Color.Black)
          .padding({ left: 6, right: 16 })
          .height(32)
          .borderRadius(24)
          .backgroundColor(Color.White)
          .onChange((value: string) => this.handleSearchChange(value))
          .layoutWeight(1);

        Row() {
          Text('搜索')
            .fontSize(14)
            .fontColor(Color.White)
            .fontWeight(FontWeight.Medium);
        }
        .backgroundColor(COLOR_ACCENT)
        .borderRadius(24)
        .height(32)
        .padding({ left: 18, right: 18 })
        .margin({ right: -5 })
        .alignItems(VerticalAlign.Center)
        .justifyContent(FlexAlign.Center)
        .onClick(() => this.executeSearch(this.keyword));
      }
      .alignItems(VerticalAlign.Center)
      .backgroundColor(Color.White)
      .borderRadius(24)
      .margin({ top: 2 });

      if (this.searchLoading) {
        Text('搜索中...')
          .fontSize(14)
          .fontColor(COLOR_TEXT_GRAY)
          .margin({ bottom: 8 });
      }

      if (this.searchResults.length) {
        Column() {
          ForEach(this.searchResults, (task: Task) => {
            Column() {
              Row() {
                Text(task.title)
                  .fontWeight(FontWeight.Medium)
                  .fontSize(16)
                  .fontColor(Color.Black);
                Blank();
                Text(task.displayPrice ? task.displayPrice : '')
                  .fontSize(14)
                  .fontColor(this.getPriceColor(task.priceState as PriceState));
              }
              .margin({ bottom: 4 });

              Text(task.formattedDDL ? task.formattedDDL : '')
                .fontSize(12)
                .fontColor(0xFF999999);
            }
            .padding({
              top: 12,
              bottom: 12,
              left: 8,
              right: 8
            })
            .borderRadius(12)
            .backgroundColor(Color.White)
            .margin({ bottom: 8 })
            .shadow({
              radius: 8,
              color: '#08000000',
              offsetX: 0,
              offsetY: 2
            })
            .onClick(() => this.handleTaskTap(task));
          }, (task: Task) => task.id);
        }
      }
    }
    .height(36)
    .padding({
      left: 8,
      right: 8,
    })
    .backgroundColor(Color.White)
    .borderRadius(18)
    .shadow({
      radius: 12,
      color: COLOR_CARD_SHADOW,
      offsetX: 0,
      offsetY: 4
    });
  }

  @Builder
  private CategorySection() {
    Column() {
      Flex({ direction: FlexDirection.Row, wrap: FlexWrap.Wrap }) {
        ForEach(CATEGORY_ITEMS, (item: CategoryItem) => {
          Column() {
            Image(item.icon)
              .width(40)
              .height(40);
            Text(item.label)
              .fontSize(13)
              .fontColor(COLOR_TEXT_DARK)
              .margin({ top: 8 });
          }
          .width('20%')
          .padding({ top: 10, bottom: 10 })
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .onClick(() => this.handleCategoryTap(item));
        }, (item: CategoryItem) => item.label);
      }
    }
    .padding({
      left: 12,
      right: 12,
      top: 10,
      bottom: 2
    })
    .margin({ top: 16, left: 16, right: 16 })
    .backgroundColor(Color.White)
    .borderRadius(20)
    .shadow({
      radius: 12,
      color: '#0F000000',
      offsetX: 0,
      offsetY: 4
    });
  }

  @Builder
  private FilterBar() {
    Column() {
      Row({ space: 12 }) {
        ForEach(FILTER_OPTIONS, (filter: FilterOption) => {
          Text(filter.label)
            .fontSize(14)
            .fontColor(this.activeFilter === filter.value ? Color.White : COLOR_TEXT_DARK)
            .padding({ left: 18, right: 18, top: 10, bottom: 10 })
            .backgroundColor(this.activeFilter === filter.value ? COLOR_PRIMARY : 0xFFF9E4EA)
            .borderRadius(999)
            .onClick(() => this.onFilterChange(filter.value));
        }, (filter: FilterOption) => filter.value);
      }
      .justifyContent(FlexAlign.SpaceEvenly)
      .width('100%')
      .alignItems(VerticalAlign.Center);
    }
    .margin({ top: 16, left: 16, right: 16 })
    .padding({ top: 12, bottom: 12, left: 12, right: 12 })
    .backgroundColor(Color.White)
    .borderRadius(28)
    .shadow({
      radius: 10,
      color: '#0F000000',
      offsetX: 0,
      offsetY: 4
    });
  }

  @Builder
  private TaskList() {
    if (this.initialLoading) {
      ListItem() {
        Row() {
          Text('正在加载任务...')
            .fontSize(16)
            .fontColor(COLOR_TEXT_GRAY);
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding({ top: 40, bottom: 40 });
      }
    } else if (!this.tasks.length) {
      ListItem() {
        Row() {
          Text('暂时没有任务，稍后再来看看~')
            .fontSize(16)
            .fontColor(COLOR_TEXT_GRAY);
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding({ top: 40, bottom: 40 });
      }
    } else {
      ForEach(this.tasks, (task: Task) => {
        ListItem() {
          this.TaskCard(task);
        }
        .padding({ left: 16, right: 16, top: 12 });
      }, (task: Task) => task.id);
    }
  }

  @Builder
  private TaskCard(task: Task) {
    Row() {
      Column() {
        Text(task.title)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor(COLOR_TEXT_DARK)
          .margin({ bottom: 8 });
        Text(`期望完成时间：${task.formattedDDL ? task.formattedDDL : '--'}前`)
          .fontSize(13)
          .fontColor(COLOR_TEXT_LIGHT)
          .margin({ bottom: 4 });
        Text(`交易地点：${task.position ? task.position : '-'}`)
          .fontSize(13)
          .fontColor(COLOR_TEXT_LIGHT)
          .margin({ bottom: 4 });
        Text(`送达地点：${task.address ? task.address : '-'}`)
          .fontSize(13)
          .fontColor(COLOR_TEXT_LIGHT);
      }
      .alignItems(HorizontalAlign.Start)
      .width('70%');

      Column() {
        Text(task.formattedStatus ? task.formattedStatus : '')
          .fontSize(14)
          .fontColor(this.getStatusColor(task.status))
          .margin({ bottom: 12 });
        Text(task.displayPrice ? task.displayPrice : '')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.getPriceColor(task.priceState as PriceState));
      }
      .height(80)
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(HorizontalAlign.End);
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
    .backgroundColor(Color.White)
    .borderRadius(18)
    .margin({ bottom: 16 })
    .shadow({
      radius: 12,
      color: '#0A000000',
      offsetX: 0,
      offsetY: 6
    })
    .onClick(() => this.handleTaskTap(task));

  }

  @Builder
  private LoadingFooter() {
    if (this.isLoading && this.currentPage > 1) {
      ListItem() {
        Row() {
          Text('加载中...')
            .fontColor(COLOR_TEXT_GRAY)
            .fontSize(14);
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding({ top: 12, bottom: 24 });
      }
    } else if (!this.hasMore && this.tasks.length) {
      ListItem() {
        Row() {
          Text('没有更多任务啦')
            .fontColor(COLOR_TEXT_GRAY)
            .fontSize(14);
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding({ top: 12, bottom: 24 });
      }
    } else {
      // no footer
    }
  }

  @Builder
  private BottomNavigation() {
    Column() {
      Row() {
        this.BottomNavItem('首页', $r('app.media.icon_nav_home'), true);
        this.BottomNavItem('广场', $r('app.media.icon_nav_square'));
        this.BottomNavItem('发布', $r('app.media.icon_nav_publish'));
        this.BottomNavItem('消息', $r('app.media.icon_nav_message'));
        this.BottomNavItem('我的', $r('app.media.icon_nav_user'));
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround);
    }
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
    .padding({
      left: 20,
      right: 20,
      top: 14,
      bottom: 18
    })
    .backgroundColor(Color.White)
    .width('100%')
    .borderRadius({ topLeft: 24, topRight: 24 })
    .shadow({
      radius: 24,
      color: '#1A000000',
      offsetX: 0,
      offsetY: -6
    });
  }

  @Builder
  private BottomNavItem(label: string, icon: Resource, active: boolean = false) {
    Column() {
      Row() {
        Image(icon)
          .width(43)
          .height(43);
      }
      .padding({
        top: 8,
        bottom: 8,
        left: 12,
        right: 12
      })
      .backgroundColor(active ? 0x33FF6B8B : 0x00FFFFFF)
      .borderRadius(18);

      Text(label)
        .fontSize(16)
        .fontColor(active ? COLOR_ACCENT : 0xFF666666)
        .margin({ top: 6 });
    }
    .alignItems(HorizontalAlign.Center)
    .onClick(() => this.safeToast(`${label} 敬请期待`));
  }

  private safeToast(message: string) {
    try {
      const options: ToastOptions = {
        message: message,
        duration: 2000
      };
      promptAction.showToast(options);
    } catch (error) {
      console.error('Toast 显示失败:', JSON.stringify(error));
    }
  }
}
