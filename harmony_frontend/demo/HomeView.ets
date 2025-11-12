// 实现刷新方法
async onRefresh() {
  this.page = 1
  this.isFinished = false // 回归到开始阶段
  await this.getHomeData()
  await this.getRecommend()
  this.isRefreshing=false
}


// 刷新的Builder
@Builder
getRefreshBuilder() {
  Row({ space: 10 }) {
    Text(this.DisplayText)
      .fontSize(12)
    HDMProgressLoading({ pWidth: 20, strokeWidth: 2 })
  }
  .width("100%")
  .height(60)
  .justifyContent(FlexAlign.Center)
}


// 包裹刷新组件
Refresh({ refreshing: this.isRefreshing!!, builder: this.getRefreshBuilder }) {
  Scroll() {
    Column() {
      // 轮播图 + 搜索
      Stack({ alignContent: Alignment.Top }) {
        Swiper() {
          ForEach(this.banners, (item: Banner) => {
            Image(item.imgUrl)
          })
        }
        .displayCount(new BreakPointType({
          sm: 1,
          md: 2,
          lg: 3
        }).getValue(this.breakObj.breakPoint))
        .itemSpace(new BreakPointType({
          sm: 0,
          md: 10,
          lg: 20
        }).getValue(this.breakObj.breakPoint))
        .indicator(
          this.breakObj.breakPoint === BreakPointEnum.SM ?
            DotIndicator.dot()
              .itemWidth(8)
              .itemHeight(4)
              .color('#33191919')
              .selectedItemWidth(24)
              .selectedItemHeight(4)
              .selectedColor('#191919') : false
        )

        Row() {
          Row({ space: 4 }) {
            Image($r('[basic].media.ic_public_search'))
              .width(16)
              .height(16)
              .fillColor($r('[basic].color.white'))
            Text('搜索...')
              .fontSize(14)
              .fontColor($r('[basic].color.white'))
          }
          .backgroundColor('#33191919')
          .width('100%')
          .height(40)
          .borderRadius(20)
          .padding({ left: 12 })
        }
        .padding({ left: 16, right: 16, top: this.appSafe.topHeight })

        Stack(){


          // 末尾添加飞机
          Image($r('[basic].media.ic_public_plane'))
            .width(50)
            .padding(10)
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(25)
            .opacity(this.searchOpacity)
            .position({
              right: 20,
              bottom: 20
            })
            .onClick(() => {
              this.scroller.scrollEdge(Edge.Top)
            })
        }


      }
      .width('100%')


      // 分类
      Column({ space: 10 }) {
        // 分类
        List({
          space: new BreakPointType({
            sm: 14,
            md: 36,
            lg: 72
          }).getValue(this.breakObj.breakPoint)
        }) {
          ForEach(this.categories, (item: CategoryItem) => {
            ListItem() {
              Column() {
                Image(item.picture)
                  .width(56)
                  .aspectRatio(1)
                Text(item.name)
                  .fontSize(10)
                  .fontColor('#CC191919')
              }
              .width(60)
              .height(80)
              .borderRadius(30)

              .clip(true)
              .backgroundImage(item.picture)
              .backgroundImageSize(ImageSize.Contain)
              .backgroundImagePosition(Alignment.Center)
              .backgroundBlurStyle(
                BlurStyle.BACKGROUND_ULTRA_THICK,
                { scale: 0.25 }
              )
            }
          })
        }
        .width('100%')
        .height(92)
        .scrollBar(BarState.Off)
        .listDirection(Axis.Horizontal)
        .alignListItem(ListItemAlign.Center)

        // 特惠推荐
        Column({ space: 10 }) {
          Image($r('app.media.home_cmd_title'))
            .width(150)
            .height(20)
          Row() {
            Image($r('app.media.home_cmd_inner'))
              .width(86)
              .height(116)
            List({ space: 10 }) {
              ForEach(this.saleGoods, (item: HDMGoodsItem) => {
                ListItem() {
                  HDMDiscountGoods({ goods: item })
                }
              })
            }
            .layoutWeight(1)
            .width('100%')
            .height(116)
            .backgroundColor($r('[basic].color.white'))
            .borderRadius({
              topRight: 8,
              bottomRight: 8
            })
            .padding({ right: 10, left: 10 })
            .scrollBar(BarState.Off)
            .listDirection(Axis.Horizontal)
          }
        }
        .width('100%')
        .height(166)
        .backgroundImage($r('app.media.home_cmd_sm'))
        .backgroundImageSize(ImageSize.Cover)
        .borderRadius(8)
        .padding(10)
        .alignItems(HorizontalAlign.Start)

        // 爆款推荐+一站买全
        Row({ space: 10 }) {
          this.DiscountBuilder({
            title: '爆款推荐',
            subTitle: '最受欢迎',
            bg: '#EDF1FB',
            list: this.hotGoods
          })
          this.DiscountBuilder({
            title: '一站买全',
            subTitle: '精心优选',
            bg: '#FCF6EA',
            list: this.oneGoods
          })
        }

        // 新鲜好物
        Column({ space: 10 }) {
          Image($r('app.media.home_new'))
            .width(146)
            .height(19)
          List({
            space: new BreakPointType({
              sm: 14,
              md: 36,
              lg: 72
            }).getValue(this.breakObj.breakPoint)
          }) {
            ForEach(this.newGoods, (item: HDMGoodsItem) => {
              ListItem() {
                HDMDiscountGoods({ type: DiscountType.NEW, goods: item })
              }
            })
          }
          .width('100%')
          .height(116)
          .scrollBar(BarState.Off)
          .listDirection(Axis.Horizontal)
        }
        .width('100%')
        .height(156)
        .padding(10)
        .backgroundColor('#F7EFF5')
        .borderRadius(8)
        .alignItems(HorizontalAlign.Start)

        // 推荐商品
        WaterFlow() {
          // LazyForEach(this.dataSource, (item: HDMGoodsItem) => {
          //   FlowItem() {
          //     HDMGoods({ goods: item })
          //   }
          // })
          Repeat<HDMGoodsItem>(this.recommendGoods).each((obj: RepeatItem<HDMGoodsItem>) => {
            FlowItem() {
              HDMGoods({ goods: obj.item })
            }
          }).virtualScroll()
            .key((item, index) => `${index}_${JSON.stringify(item)}`)

        }
        .cachedCount(1)
        .columnsTemplate(new BreakPointType({
          sm: "1fr 1fr",
          md: "1fr 1fr 1fr",
          lg: "1fr 1fr 1fr 1fr"
        }).getValue(this.breakObj.breakPoint))
        .columnsGap(8)
        .rowsGap(10)

      }
      .padding({
        left: 8,
        right: 8,
        bottom: 10,
        top: 10
      })
    }
  }
  .scrollBar(BarState.Off)
  .onDidScroll((xOffset: number, yOffset: number) => {
    this.yOffset += yOffset // 计算总共往上移动的距离
    if (this.yOffset < this.appSafe.topHeight) {
      this.searchOpacity = 0
      // 40搜索框的高度
    } else if (this.yOffset > this.appSafe.topHeight && this.yOffset < (this.appSafe.topHeight + 40)) {
      this.searchOpacity = (this.yOffset - this.appSafe.topHeight) / 40
    } else {
      this.searchOpacity = 1
    }

  })
  .onReachEnd(async () => {
    // 当前没有请求 并且还有数据的情况下
    if (!this.isReachLoad && !this.isFinished) {
      this.isReachLoad = true // 先关门
      await this.getRecommend() // 获取数据
      this.isReachLoad = false // 开门
    }
  })

  // 放置一个搜索元素

}
.onStateChange((state) => {
  // Logger.info(state)
  switch (state) {
    case RefreshStatus.Inactive:
      this.DisplayText = ''
      break
    case RefreshStatus.Drag:
      this.DisplayText = '继续下拉'
      break
    case RefreshStatus.OverDrag:
      this.DisplayText = '松手加载'
      break
    case RefreshStatus.Refresh:
      this.DisplayText = '刷新中'
      break
    case RefreshStatus.Done:
      this.DisplayText = '刷新完毕'
      break
  }
})
.onRefreshing(() => {
  // setTimeout(() => {
  //   this.isRefreshing = false
  // }, 1000)
  this.onRefresh()
})