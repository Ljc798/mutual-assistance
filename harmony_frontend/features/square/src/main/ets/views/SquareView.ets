import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea,
  AppSelectedSchool,
  AppUser,
  PAGE_PATH,
  ProgressLoading,
  SCHOOL_SELECTION_VERSION_KEY,
  schoolPersistence,
  AppSchoolPickerContext,
  AppImagePreview,
  PROFILE_TARGET_ID_KEY,
  SQUARE_DETAIL_ID_KEY
} from 'basic'
import { HMRouterMgr } from '@hadss/hmrouter'
import {
  DEFAULT_SQUARE_CATEGORIES,
  POST_CATEGORIES,
  REPORT_REASONS,
  SquareCategory,
  SquareCreatePayload,
  SquareImageDTO,
  SquareImageUpdatePayload,
  SquareLikePayload,
  SquarePost,
  SquareQuery,
  SquareReportPayload
} from '../viewmodels/SquareTypes'
import { AppCurrentSquareDetail } from '../viewmodels/SquareDetailVM'
import {
  createSquarePost,
  fetchCheckinStatus,
  fetchSquarePosts,
  likeSquarePost,
  reportSquarePost,
  submitCheckin,
  unlikeSquarePost
} from '../services/SquareService'
import { updateSquareImages } from '../services/SquareService'
import { photoAccessHelper } from '@kit.MediaLibraryKit'
import { fileIo as fs } from '@kit.CoreFileKit'
import { common } from '@kit.AbilityKit'
import { BusinessError } from '@ohos.base'
import { readFileAsBytes, uploadSingle, UploadFileItem } from 'basic'
import http from '@ohos.net.http'

const MAX_IMAGES: number = 9

@Component
export struct SquareView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly schoolSelection: AppSelectedSchool = AppStorageV2.connect(AppSelectedSchool, () => new AppSelectedSchool())!
  @StorageLink(SCHOOL_SELECTION_VERSION_KEY) schoolVersion: number = 0
  @StorageLink('reload_square_now') reloadSquareNow: number = 0
  private lastSchoolId: number = 0
  private lastSchoolName: string = '请选择学校'
  private lastSyncedVersion: number = 0
  private lastReloadSquareNow: number = 0
  private hasMounted: boolean = false
  @State posts: SquarePost[] = []
  @State selectedCategory: SquareCategory = '全部'
  @State currentSchoolId: number = 0
  @State currentSchoolName: string = '请选择学校'
  @State isRefreshing: boolean = false
  @State isLoadingMore: boolean = false
  @State hasMore: boolean = true
  @State currentPage: number = 1
  private readonly pageSize: number = 10
  @State refreshText: string = '下拉刷新'
  @State checkinCompleted: boolean = false
  @State showPublishModal: boolean = false
  @State showReportModal: boolean = false
  @State publishCategory: string = ''
  @State publishContent: string = ''
  @State tempImages: string[] = []
  @State uploadedImages: string[] = []
  private selectedCachePaths: string[] = []
  @State reportReasonIndex: number = -1
  @State reportDescription: string = ''
  @State reportPostId: number = -1
  @State isSubmittingPost: boolean = false
  @State isSubmittingReport: boolean = false
  @State isSubmittingCheckin: boolean = false
  @State checkinSubTitle: string = '签到领积分'
  @State postModels: SquarePostModel[] = []
  @Prop @Watch('onVisibleChange') isVisible: boolean = false
  private readonly previewVM: AppImagePreview = AppStorageV2.connect(AppImagePreview, () => new AppImagePreview())!

  onVisibleChange() {
    if (this.isVisible) {
      this.onPageShow()
    }
  }

  aboutToAppear() {
    this.hasMounted = true
    this.syncSchoolSelection()
    this.lastSyncedVersion = this.schoolVersion
    this.bootstrap()
    this.resetPagingState()
    this.loadPosts(false)
  }

  aboutToRender() {
    if (this.schoolVersion !== this.lastSyncedVersion) {
      this.lastSyncedVersion = this.schoolVersion
      const vChanged = this.syncSchoolSelection()
      this.resetPagingState()
      this.loadPosts(false)
      return
    }
    if (this.reloadSquareNow !== this.lastReloadSquareNow) {
      this.lastReloadSquareNow = this.reloadSquareNow
      const changed = this.syncSchoolSelection()
      this.resetPagingState()
      this.loadPosts(false)
      return
    }
    const changed = this.syncSchoolSelection()
    if (changed && this.hasMounted) {
      this.resetPagingState()
      this.loadPosts(false)
    }
  }

  onPageShow() {
    const changed = this.syncSchoolSelection()
    if (changed) {
      this.resetPagingState()
      this.loadPosts(false)
    }
  }

  private bootstrap() {
    this.loadCheckinStatus()
    this.loadPosts()
  }

  private syncSchoolSelection(): boolean {
    const snapshot = schoolPersistence.getSelection()
    const idValue: number = snapshot.id
    const nameValue: string = snapshot.name
    const nextId: number = typeof idValue === 'number' && idValue > 0 && nameValue.length > 0 ? idValue : 0
    const nextName: string = nextId > 0 ? nameValue : '请选择学校'
    const hasChanged: boolean = nextId !== this.lastSchoolId || nextName !== this.lastSchoolName
    this.lastSchoolId = nextId
    this.lastSchoolName = nextName
    this.currentSchoolId = nextId
    this.currentSchoolName = nextName
    return hasChanged
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Refresh({
          refreshing: this.isRefreshing,
          builder: this.renderRefreshHeader
        }) {
          Scroll(this.scroller) {
            Column({ space: 12 }) {
              this.renderCategoryBar()
              this.renderPostList()
            }
            .padding({
              left: 0,
              right: 0,
              top: 0,
              bottom: 80 + this.safeArea.bottomHeight
            })
            .width('100%')
          }
          .scrollBar(BarState.Off)
          .onScrollEdge((side: Edge) => {
            if (side === Edge.Bottom) {
              this.loadMorePosts()
            }
          })
        }
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
              this.refreshText = '刷新中...'
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
      .justifyContent(FlexAlign.Start)
      this.renderFloatingButton()
      this.renderPublishModal()
      this.renderReportModal()
      // 使用系统预览，不渲染自定义预览层
    }
    .backgroundColor($r('[basic].color.page_background'))
    .width('100%')
    .height('100%')
  }

  @Builder
  private renderHeader() {
    Column() {
      Row() {
        Text('广场')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('[basic].color.white'));
        Blank();
        Row() {
          Image($r('app.media.icon_ditu'))
            .width(18)
            .height(18)
            .margin({ right: 4 });
          Text(this.schoolSelection.name?.length > 0 ? this.schoolSelection.name : '请选择学校')
            .fontSize(16)
            .fontColor($r('[basic].color.white'))
            .fontWeight(FontWeight.Regular)
            .onClick(() => {
              const ctx = AppStorageV2.connect(AppSchoolPickerContext, () => new AppSchoolPickerContext())!
              ctx.target = 'browse'
              this.handleSchoolTap()
            });
        }
        .alignItems(VerticalAlign.Center);
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)
      .justifyContent(FlexAlign.Start)
      .margin({ bottom: 8 });
    }
    .width('100%')
    .margin({ left: 0, right: 0 })
    .padding({
      top: this.safeArea.topHeight + 6,
      bottom: 6,
      left: 20,
      right: 20
    })
    .backgroundColor($r('[basic].color.home_header_bg'));
  }

  @Builder
  private renderCategoryBar() {
    Row() {
      Scroll() {
        Row({ space: 8 }) {
          ForEach(DEFAULT_SQUARE_CATEGORIES, (category: SquareCategory) => {
            Text(category)
              .padding({
                left: 16,
                right: 16,
                top: 8,
                bottom: 8
              })
              .fontSize(14)
              .fontColor(this.selectedCategory === category ? $r('[basic].color.white') :
                $r('[basic].color.text_secondary'))
              .backgroundColor(this.selectedCategory === category ? $r('[basic].color.filter_active_bg') :
                $r('[basic].color.white'))
              .borderRadius(18)
              .onClick((): void => {
                this.selectCategory(category)
              })
          }, (category: SquareCategory) => category)
        }
      }
      .width('80%')
      .scrollBar(BarState.Off)
      .scrollable(ScrollDirection.Horizontal)

      Column({ space: 4 }) {
        Image(this.checkinCompleted ? $r('app.media.icon_square_checkin_done') : $r('app.media.icon_square_checkin'))
          .width(36)
          .height(36)
      }
      .width('20%')
      .alignItems(HorizontalAlign.Center)
      .onClick((): void => {
        this.handleCheckin()
      })
    }
    .margin({top: 10})
    .width('100%')
  }

  @Builder
  private renderPostList() {
    if (this.postModels.length === 0) {
      Column({ space: 12 }) {
        Text('暂时没有帖子')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
        Text('快来发布第一条动态吧')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
      }
      .alignItems(HorizontalAlign.Center)
      .padding({ top: 60 })
    } else {
      Column({ space: 12 }) {
        ForEach(this.postModels, (post: SquarePostModel) => {
          this.renderPostCardModel(post)
        }, (post: SquarePostModel) => `${post.id}`)
        this.renderListFooter()
      }
    }
  }

  @Builder
  private renderPostCardModel(post: SquarePostModel) {
    Column({ space: 12 }) {
      Row({ space: 12 }) {
        Image(this.getAvatarSource(post.avatarUrl))
          .width(40)
          .height(40)
          .borderRadius(20)
          .objectFit(ImageFit.Cover)
          .backgroundColor($r('[basic].color.search_box_bg'))
          .onClick((): void => {
            this.openProfile(post.userId)
          })
        Column({ space: 4 }) {
          Row({ space: 6 }) {
            Text(post.username)
              .fontSize(15)
              .fontColor($r('[basic].color.text_primary'))
              .fontWeight(FontWeight.Medium)
              .onClick((): void => {
                this.openProfile(post.userId)
              })
            // if (post.isVip) {
            //   Text('VIP')
            //     .fontSize(11)
            //     .fontColor($r('[basic].color.white'))
            //     .padding({
            //       left: 6,
            //       right: 6,
            //       top: 2,
            //       bottom: 2
            //     })
            //     .backgroundColor($r('[basic].color.filter_active_bg'))
            //     .borderRadius(10)
            // }
            if (post.pinned) {
              Text('置顶')
                .fontSize(11)
                .fontColor($r('[basic].color.filter_active_bg'))
                .padding({
                  left: 6,
                  right: 6,
                  top: 2,
                  bottom: 2
                })
                .backgroundColor('#1AFF6B8B')
                .borderRadius(10)
            }
          }

          Text(post.formattedTime)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)

        Image($r('[basic].media.ic_public_more'))
          .width(24)
          .height(24)
          .onClick((): void => {
            this.openReportModal(post.id)
          })
      }

      Text(post.content)
        .fontSize(15)
        .fontColor($r('[basic].color.text_primary'))
        .lineHeight(22)
        .textAlign(TextAlign.Start)
      if (post.images.length > 0) {
        this.renderPostImages(post)
      }
      Row({ space: 16 }) {
        Row({ space: 6 }) {
          Image(post.isLiked ? $r('app.media.icon_heart_fill') : $r('app.media.icon_heart_line'))
            .width(20)
            .height(20)
          Text(`${post.likesCount}`)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
        }
      .onClick((): void => {
          this.toggleLikeModel(post)
      })

        Row({ space: 6 }) {
          Image($r('app.media.icon_square_comment'))
            .width(20)
            .height(20)
          Text(`${post.commentsCount}`)
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
        }
        .onClick((): void => {
          this.openDetail(post.id)
        })
      }
      .width('95%')
      .justifyContent(FlexAlign.End)
      .alignItems(VerticalAlign.Center)
    }
    .padding(16)
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(20)
    .shadow({
      radius: 12,
      color: $r('[basic].color.shadow_card'),
      offsetX: 0,
      offsetY: 6
    })
    .onClick((): void => {
      this.openDetail(post.id)
    })
    .alignItems(HorizontalAlign.Start)
  }

  @Builder
  private renderPostImages(post: SquarePostModel) {
    Scroll() {
      Row({ space: 10 }) {
        ForEach(post.images, (imageItem: SquareImageDTO, index: number) => {
          if (imageItem.status === 'pass') {
            Image(this.getOrientedUrl(imageItem.url) as ResourceStr)
              .width(160)
              .height(120)
              .borderRadius(16)
              .objectFit(ImageFit.Cover)
              .onClick(() => this.openPreviewPage(post.images.filter((it: SquareImageDTO) => it.status === 'pass').map((it: SquareImageDTO) => it.url), index))
          } else {
            Column() {
              Text('图片审核中')
                .fontSize(12)
                .fontColor($r('[basic].color.text_secondary'))
            }
            .width(160)
            .height(120)
            .borderRadius(16)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
          }
        }, (_: SquareImageDTO, index: number) => `${post.id}-${index}`)
      }
    }
    .scrollable(ScrollDirection.Horizontal)
  }

  private getOrientedUrl(url: string): string {
    const hasQuery: boolean = url.indexOf('?') >= 0
    const oriented: string = hasQuery ? `${url}&imageMogr2/auto-orient` : `${url}?imageMogr2/auto-orient`
    return oriented
  }

  private openPreviewPage(urls: string[], index: number): void {
    const oriented: string[] = urls.map((u: string) => this.getOrientedUrl(u))
    this.previewVM.set(oriented, index)
    HMRouterMgr.push({ pageUrl: PAGE_PATH.IMAGE_PREVIEW_PAGE })
  }

  @Builder
  private renderListFooter() {
    if (this.isLoadingMore) {
      Text('加载中...')
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
        .textAlign(TextAlign.Center)
        .width('100%')
        .padding({ top: 8, bottom: 8 })
    } else if (!this.hasMore) {
      Text('没有更多内容了')
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
        .textAlign(TextAlign.Center)
        .width('100%')
        .padding({ top: 8, bottom: 8 })
    } else {
      Blank()
    }
  }

  @Builder
  private renderFloatingButton() {
    if (!this.showPublishModal && !this.showReportModal) {
      Image($r('app.media.icon_square_plus'))
        .width(64)
        .height(64)
        .position({
          left: 20,
          bottom: 20 + this.safeArea.bottomHeight
        })
        .opacity(0.75)
        .onClick((): void => {
          this.openPublishModal()
        })

      Image($r('[basic].media.ic_up_arrow'))
        .width(50)
        .padding(10)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(25)
        .opacity(0.75)
        .position({
          right: 20,
          bottom: 20 + this.safeArea.bottomHeight
        })
        .onClick((): void => {
          this.scroller.scrollEdge(Edge.Top)
        })
    } else {
      Blank()
    }
  }

  @Builder
  private renderPublishModal() {
    if (!this.showPublishModal) {
      Blank()
    } else {
      Column() {
        Column({ space: 14 }) {
          Text('发布新内容')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
          this.renderPostCategorySelector()
          TextArea({ placeholder: '写点什么吧...' })
            .height(120)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .padding(12)
            .borderRadius(16)
            .onChange((value: string) => this.publishContent = value)
          this.renderImagePicker()
          Button(this.isSubmittingPost ? '发布中...' : '发布')
            .width('100%')
            .height(44)
            .backgroundColor($r('[basic].color.filter_active_bg'))
            .fontColor($r('[basic].color.white'))
            .borderRadius(16)
            .enabled(!this.isSubmittingPost)
            .onClick((): void => {
              this.submitPost()
            })
          Text('发布的帖子会关联当前学校')
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
            .textAlign(TextAlign.Center)
          Button('关闭')
            .width('100%')
            .height(40)
            .borderRadius(16)
            .onClick((): void => {
              this.closePublishModal()
            })
        }
        .width('90%')
        .padding(20)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(24)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor('rgba(0,0,0,0.45)')
    }
  }

  @Builder
  private renderPostCategorySelector() {
    Column({ space: 8 }) {
      Text('选择分类')
        .fontSize(14)
        .fontColor($r('[basic].color.text_secondary'))
      Scroll() {
        Row({ space: 10 }) {
          ForEach(POST_CATEGORIES, (category: SquareCategory) => {
            Text(category)
              .padding({
                left: 12,
                right: 12,
                top: 6,
                bottom: 6
              })
              .fontSize(13)
              .fontColor(this.publishCategory === category ? $r('[basic].color.white') :
                $r('[basic].color.text_secondary'))
              .backgroundColor(this.publishCategory === category ? $r('[basic].color.filter_active_bg') :
                $r('[basic].color.search_box_bg'))
              .borderRadius(16)
              .onClick((): void => {
                this.publishCategory = category
              })
          }, (category: SquareCategory) => `publish-${category}`)
        }
      }
      .scrollable(ScrollDirection.Horizontal)
    }
  }

  @Builder
  private renderImagePicker() {
    Column({ space: 8 }) {
      Text('图片（最多9张）')
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
      Row({ space: 10 }) {
        ForEach(this.tempImages, (_value: string, index: number) => {
          Stack() {
            Image(this.tempImages[index] as ResourceStr)
              .width(64)
              .height(64)
              .borderRadius(12)
              .objectFit(ImageFit.Cover)
            Text('×')
              .fontSize(14)
              .fontColor($r('[basic].color.white'))
              .backgroundColor('rgba(0,0,0,0.5)')
              .padding(4)
              .borderRadius(12)
              .position({
                right: -8,
                top: -8
              })
              .onClick((): void => {
                this.removeTempImage(index)
              })
          }
        }, (_: string, index: number) => `temp-${index}`)
        if (this.tempImages.length < MAX_IMAGES) {
          Column() {
            Text('+')
              .fontSize(20)
              .fontColor($r('[basic].color.text_secondary'))
          }
          .width(64)
          .height(64)
          .borderRadius(12)
          .backgroundColor($r('[basic].color.search_box_bg'))
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .onClick((): void => {
            this.handleImagePick()
          })
        }
      }
    }
  }

  @Builder
  private renderReportModal() {
    if (!this.showReportModal) {
      Blank()
    } else {
      Column() {
        Column({ space: 14 }) {
          Text('举报帖子')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
          this.renderReasonSelector()
          TextArea({ placeholder: '补充说明（可选）' })
            .height(100)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .padding(12)
            .borderRadius(16)
            .onChange((value: string) => this.reportDescription = value)
          Row({ space: 12 }) {
            Button('取消')
              .layoutWeight(1)
              .height(44)
              .borderRadius(16)
              .onClick((): void => {
                this.closeReportModal()
              })
            Button(this.isSubmittingReport ? '提交中...' : '提交')
              .layoutWeight(1)
              .height(44)
              .borderRadius(16)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .enabled(!this.isSubmittingReport)
              .onClick((): void => {
                this.submitReport()
              })
          }
        }
        .width('90%')
        .padding(20)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(24)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor('rgba(0,0,0,0.45)')
    }
  }

  @Builder
  private renderReasonSelector() {
    Column({ space: 10 }) {
      Text('选择举报原因')
        .fontSize(14)
        .fontColor($r('[basic].color.text_secondary'))
      Column({ space: 8 }) {
        ForEach(REPORT_REASONS, (reason: string, index: number) => {
          Row() {
            Text(reason)
              .fontSize(14)
              .fontColor(this.reportReasonIndex === index ? $r('[basic].color.filter_active_bg') :
                $r('[basic].color.text_primary'))
          }
          .width('100%')
          .padding({
            left: 12,
            right: 12,
            top: 10,
            bottom: 10
          })
          .backgroundColor(this.reportReasonIndex === index ? '#1AFF6B8B' : $r('[basic].color.search_box_bg'))
          .borderRadius(14)
          .onClick((): void => {
            this.reportReasonIndex = index
          })
        }, (reason: string) => `reason-${reason}`)
      }
    }
  }

  private getSelectedSchoolName(): string {
    const snapshot = schoolPersistence.getSelection()
    const idValue: number = snapshot.id
    const nameValue: string = snapshot.name
    const normalizedId: number = typeof idValue === 'number' && idValue > 0 && nameValue.length > 0 ? idValue : 0
    return normalizedId > 0 ? nameValue : '请选择学校'
  }

  private getSelectedSchoolId(): number {
    const snapshot = schoolPersistence.getSelection()
    const idValue: number = snapshot.id
    const nameValue: string = snapshot.name
    const normalizedId: number = typeof idValue === 'number' && idValue > 0 && nameValue.length > 0 ? idValue : 0
    return normalizedId
  }

  private async loadPosts(isLoadMore: boolean = false) {
    if (isLoadMore) {
      if (!this.hasMore || this.isLoadingMore) {
        return
      }
      this.isLoadingMore = true
    } else if (this.isRefreshing) {
      return
    } else {
      this.isRefreshing = true
      this.currentPage = 1
    }
    const nextPage: number = isLoadMore ? this.currentPage + 1 : 1
    try {
      const query: SquareQuery = {
        category: this.selectedCategory,
        page: nextPage,
        pageSize: this.pageSize,
        userId: this.appUser.user.id,
        schoolId: this.getSelectedSchoolId()
      }
      console.info('[SquareView] loadPosts.query', JSON.stringify(query))
      const list = await fetchSquarePosts(query)
      console.info('[SquareView] loadPosts.result.length', list.length)
      if (isLoadMore) {
        const merged: SquarePost[] = [...this.posts, ...list]
        this.posts = merged
      } else {
        this.posts = list
      }
      this.currentPage = nextPage
      this.hasMore = list.length === this.pageSize
      const ms: SquarePostModel[] = []
      for (let i = 0; i < this.posts.length; i++) { ms.push(new SquarePostModel(this.posts[i])) }
      this.postModels = ms
    } catch (error) {
      console.error('[SquareView] loadPosts.error', error?.message ?? error)
      this.showToast('获取帖子失败，请稍后重试')
    } finally {
      if (isLoadMore) {
        this.isLoadingMore = false
      } else {
        this.isRefreshing = false
      }
    }
  }

  private async loadCheckinStatus() {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      this.checkinCompleted = false
      this.checkinSubTitle = '签到领积分'
      return
    }
    try {
      const status = await fetchCheckinStatus(userId, token)
      this.checkinCompleted = status.checked_in
      this.checkinSubTitle = status.checked_in
        ? `已连续 ${status.consecutive_days} 天`
        : '签到领积分'
    } catch (error) {
      console.warn('获取签到状态失败', JSON.stringify(error))
    }
  }

  private handleSchoolTap() {
    HMRouterMgr.push({
      pageUrl: PAGE_PATH.SCHOOL_PICKER_PAGE
    })
  }

  async handleRefresh() {
    if (this.isRefreshing || this.isLoadingMore) {
      return
    }
    this.refreshText = '正在刷新帖子...'
    this.resetPagingState()

    try {
      await this.loadPosts(false)
      this.refreshText = '刷新成功'
    } catch (error) {
      console.error('[刷新失败]', error)
      this.refreshText = '刷新失败，请重试'
    } finally {
      setTimeout(() => {
        this.refreshText = '下拉刷新'
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
      ProgressLoading({ pWidth: 18, strokeWidth: 2, loading: this.isRefreshing && this.isVisible })
    }
    .width('100%')
    .height(60)
    .justifyContent(FlexAlign.Center)
    .backgroundColor(Color.Transparent)
  }

  private loadMorePosts() {
    if (this.isLoadingMore || this.isRefreshing || !this.hasMore) {
      return
    }
    this.loadPosts(true)
  }

  private selectCategory(category: SquareCategory) {
    if (this.selectedCategory === category) {
      return
    }
    this.selectedCategory = category
    this.resetPagingState()
    this.loadPosts(false)
  }

  private async handleCheckin() {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      this.showToast('请先登录')
      return
    }
    if (this.checkinCompleted || this.isSubmittingCheckin) {
      this.showToast('今日已签到')
      return
    }
    this.isSubmittingCheckin = true
    try {
      const result = await submitCheckin(userId, token)
      this.checkinCompleted = true
      this.checkinSubTitle = `已连续 ${result.consecutive_days} 天`
      this.showToast(result.message)
    } catch (error) {
      console.error('签到失败', JSON.stringify(error))
      this.showToast('签到失败，请稍后再试')
    } finally {
      this.isSubmittingCheckin = false
    }
  }

  private getAvatarSource(url: string): ResourceStr {
    if (!url) {
      return $r('app.media.icon_square_avatar')
    }
    return url as ResourceStr
  }

  private openPublishModal() {
    if (!this.appUser.user.token) {
      this.showToast('请先登录')
      return
    }
    this.showPublishModal = true
  }

  private closePublishModal() {
    this.showPublishModal = false
  }

  private openReportModal(postId: number) {
    if (!this.appUser.user.token) {
      this.showToast('请先登录')
      return
    }
    this.reportPostId = postId
    this.reportReasonIndex = -1
    this.reportDescription = ''
    this.showReportModal = true
  }

  private closeReportModal() {
    this.showReportModal = false
    this.reportPostId = -1
  }

  private removeTempImage(index: number) {
    const mutable = [...this.tempImages]
    mutable.splice(index, 1)
    this.tempImages = mutable
  }

  private async handleImagePick() {
    const remain = Math.max(0, MAX_IMAGES - this.tempImages.length)
    if (remain <= 0) { this.showToast('最多选择9张'); return }
    const picker = new photoAccessHelper.PhotoViewPicker()
    const options = { MIMEType: photoAccessHelper.PhotoViewMIMETypes.IMAGE_TYPE, maxSelectNumber: remain } as photoAccessHelper.PhotoSelectOptions
    const context = (this.getUIContext().getHostContext() as common.UIAbilityContext)
    const cacheDir: string = context.cacheDir
    picker.select(options, async (_err: BusinessError | undefined, result: photoAccessHelper.PhotoSelectResult) => {
      const uris: string[] = result?.photoUris ?? []
      console.info('[SquareView] picker.selected', JSON.stringify({ count: uris.length, uris }))
      if (!uris.length) { return }
      const internalPaths: string[] = []
      const cachePaths: string[] = []
      for (let i = 0; i < uris.length; i++) {
        try {
          const file = fs.openSync(uris[i], fs.OpenMode.READ_ONLY)
          const target: string = `${cacheDir}/square_${Date.now()}_${i}.jpeg`
          fs.copyFileSync(file.fd, target)
          internalPaths.push(`internal://cache/${target.split('/').pop()}`)
          cachePaths.push(target)
          fs.closeSync(file.fd)
          console.info('[SquareView] cache.copy.ok', JSON.stringify({ src: uris[i], dst: target }))
        } catch (err) {
          console.warn('[SquareView] cache.copy.fail', JSON.stringify({ src: uris[i], message: (err as Error)?.message }))
        }
      }
      if (!internalPaths.length) { this.showToast('复制失败'); return }
      const current = this.tempImages.slice()
      const merged = current.concat(uris)
      this.tempImages = merged
      this.selectedCachePaths = [...this.selectedCachePaths, ...cachePaths]
    })
  }

  // 使用多媒体解码，无需路径归一化

  private resetPublishForm() {
    this.publishCategory = ''
    this.publishContent = ''
    this.tempImages = []
    this.uploadedImages = []
  }


  private async submitPost() {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      this.showToast('请先登录')
      return
    }
    if (!this.publishCategory) {
      this.showToast('请选择分类')
      return
    }
    if (!this.publishContent || this.publishContent.trim().length === 0) {
      this.showToast('请输入内容')
      return
    }
    // 支持图片上传后关联
    if (this.getSelectedSchoolId() <= 0) {
      this.showToast('请选择学校后再发布')
      return
    }
    if (this.isSubmittingPost) {
      return
    }
    this.isSubmittingPost = true
    try {
      const payload: SquareCreatePayload = {
        user_id: userId,
        school_id: this.getSelectedSchoolId(),
        category: this.publishCategory,
        content: this.publishContent.trim()
      }
      const created = await createSquarePost(payload, token)
      if (created.success) {
        const uploaded: string[] = []
        for (let i = 0; i < this.selectedCachePaths.length; i++) {
          try {
            const p = this.selectedCachePaths[i]
            const bytes = await readFileAsBytes(p)
            const fname = p.split('/').pop()!
            const item: UploadFileItem = { filename: fname, mime: 'image/jpeg', data: bytes, extra: { type: 'square', postId: `${created.square_id}`, userId: this.appUser.user.id } }
            const res = await uploadSingle(item)
            if (res.success && res.url) { uploaded.push(res.url) }
          } catch (e) { console.error('[SquareView] publish.upload.error', (e as Error)?.message) }
        }
        if (uploaded.length > 0) {
          const linkPayload: SquareImageUpdatePayload = { square_id: created.square_id, images: uploaded }
          await updateSquareImages(linkPayload, token)
        }
      }
      this.showToast('发布成功')
      this.resetPublishForm()
      this.closePublishModal()
      this.loadPosts(false)
    } catch (error) {
      console.error('发布失败', JSON.stringify(error))
      this.showToast('发布失败，请稍后重试')
    } finally {
      this.isSubmittingPost = false
    }
  }

  private async submitReport() {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      this.showToast('请先登录')
      return
    }
    if (this.reportReasonIndex < 0 || this.reportPostId < 0) {
      this.showToast('请选择举报原因')
      return
    }
    if (this.isSubmittingReport) {
      return
    }
    this.isSubmittingReport = true
    try {
      const payload: SquareReportPayload = {
        post_id: this.reportPostId,
        reason: REPORT_REASONS[this.reportReasonIndex],
        description: this.reportDescription
      }
      await reportSquarePost(payload, token)
      this.showToast('举报已提交')
      this.closeReportModal()
    } catch (error) {
      console.error('举报失败', JSON.stringify(error))
      this.showToast('举报失败，请稍后重试')
    } finally {
      this.isSubmittingReport = false
    }
  }

  private async toggleLike(post: SquarePost) {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      this.showToast('请先登录')
      return
    }
    try {
      const payload: SquareLikePayload = {
        user_id: userId,
        square_id: post.id
      }
      if (post.isLiked) {
        await unlikeSquarePost(payload, token)
      } else {
        await likeSquarePost(payload, token)
      }
      const nextPosts: SquarePost[] = this.posts.slice()
      for (let i = 0; i < nextPosts.length; i++) {
        const p = nextPosts[i]
        if (p.id === post.id) {
          const delta = p.isLiked ? -1 : 1
          const updated: SquarePost = {
            id: p.id,
            userId: p.userId,
            username: p.username,
            avatarUrl: p.avatarUrl,
            content: p.content,
            category: p.category,
            likesCount: Math.max(0, p.likesCount + delta),
            commentsCount: p.commentsCount,
            createdTime: p.createdTime,
            formattedTime: p.formattedTime,
            isLiked: !p.isLiked,
            isVip: p.isVip,
            pinned: p.pinned,
            schoolId: p.schoolId,
            images: p.images,
            approvedImages: p.approvedImages
          }
          nextPosts[i] = updated
          break
        }
      }
      this.posts = nextPosts
    } catch (error) {
      console.error('点赞失败', JSON.stringify(error))
      this.showToast('操作失败，请稍后重试')
    }
  }

  private async toggleLikeModel(post: SquarePostModel) {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token) {
      this.showToast('请先登录')
      return
    }
    try {
      const payload: SquareLikePayload = { user_id: userId, square_id: post.id }
      if (post.isLiked) { await unlikeSquarePost(payload, token); post.isLiked = false; post.likesCount = Math.max(0, post.likesCount - 1) }
      else { await likeSquarePost(payload, token); post.isLiked = true; post.likesCount = post.likesCount + 1 }
    } catch (error) {
      console.error('点赞失败', JSON.stringify(error))
      this.showToast('操作失败，请稍后重试')
    }
  }

  private openDetail(postId: number) {
    const target = this.posts.find((p: SquarePost) => p.id === postId)
    if (!target) {
      this.showToast('未找到帖子数据')
      return
    }
    AppStorage.setOrCreate(SQUARE_DETAIL_ID_KEY, postId)
    const vm = AppStorageV2.connect(AppCurrentSquareDetail, () => new AppCurrentSquareDetail())!
    vm.setPost(target)
    HMRouterMgr.push({
      pageUrl: PAGE_PATH.SQUARE_DETAIL_PAGE
    })
  }

  private openProfile(userId: number): void {
    console.info('ProfileNav.SetId', JSON.stringify({ userId }))
    AppStorage.setOrCreate(PROFILE_TARGET_ID_KEY, userId)
    const readBack: number | undefined = AppStorage.get<number>(PROFILE_TARGET_ID_KEY)
    console.info('ProfileNav.ReadBack', JSON.stringify({ readBack }))
    HMRouterMgr.push({ pageUrl: PAGE_PATH.USER_PROFILE_PAGE })
  }

  private showToast(message: string) {
    promptAction.showToast({
      message,
      duration: 1500,
      bottom: 80
    })
  }

  private resetPagingState() {
    this.currentPage = 1
    this.hasMore = true
    this.isLoadingMore = false
    this.posts = []
    this.postModels = []
  }
}
@ObservedV2
export class SquarePostModel implements SquarePost {
  @Trace id: number
  @Trace userId: number
  @Trace username: string
  @Trace avatarUrl: string
  @Trace content: string
  @Trace category: string
  @Trace likesCount: number
  @Trace commentsCount: number
  @Trace createdTime: string
  @Trace formattedTime: string
  @Trace isLiked: boolean
  @Trace isVip: boolean
  @Trace pinned: boolean
  @Trace schoolId?: number
  @Trace images: SquareImageDTO[]
  @Trace approvedImages: SquareImageDTO[]
  constructor(dto: SquarePost) {
    this.id = dto.id
    this.userId = dto.userId
    this.username = dto.username
    this.avatarUrl = dto.avatarUrl
    this.content = dto.content
    this.category = dto.category
    this.likesCount = dto.likesCount
    this.commentsCount = dto.commentsCount
    this.createdTime = dto.createdTime
    this.formattedTime = dto.formattedTime
    this.isLiked = dto.isLiked
    this.isVip = dto.isVip
    this.pinned = dto.pinned
    this.schoolId = dto.schoolId
    this.images = dto.images
    this.approvedImages = dto.approvedImages
  }
}
interface UploadImageResponse { success: boolean; imageUrl?: string }
interface UploadTaskState { data?: string }
