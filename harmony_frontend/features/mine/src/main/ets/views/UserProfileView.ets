import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, PAGE_PATH, PROFILE_TARGET_ID_KEY, AppUser, USER_LOGIN_TIME_KEY, ProgressLoading } from 'basic'
import { SQUARE_DETAIL_ID_KEY } from 'basic'
import { ImagePreview } from 'module_imagepreview'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import {
  fetchPublicUser,
  fetchReputation,
  fetchUserPosts,
  fetchReviews,
  PublicUser,
  ReputationItem,
  SquarePostDTO,
  ReviewItem,
  SquareImageDTO
} from '../services/ProfileService'
import { likeSquarePost, unlikeSquarePost, reportSquarePost } from '../services/ProfileService'

@HMRouter({ pageUrl: PAGE_PATH.USER_PROFILE_PAGE })
@Component
export struct UserProfileView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  @StorageLink(PROFILE_TARGET_ID_KEY) targetUserId: number = 0
  @StorageLink(USER_LOGIN_TIME_KEY) loginTick: number = 0
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State user?: PublicUser = undefined
  @State rep?: ReputationItem = undefined
  @State posts: UserPostModel[] = []
  @State reviews: ReviewItem[] = []
  @State tab: string = 'posts'
  @State showReportModal: boolean = false
  @State reportPostId: number = 0
  @State reportReason: string = ''
  @State reportDesc: string = ''
  @State isReporting: boolean = false
  private readonly reportReasons: string[] = ['不当内容', '广告', '侵权', '违法违规', '其他']
  @State isRefreshing: boolean = false
  @State refreshText: string = '下拉刷新'

  aboutToAppear(): void {
    const id = Number(this.targetUserId ?? 0)
    console.info('UserProfile.ReadTargetId', JSON.stringify({ targetUserId: id }))
    if (!id || id <= 0) {
      promptAction.showToast({ message: '未指定用户' });
      return
    }
    this.loadAll(id)
  }

  private async loadAll(userId: number): Promise<void> {
    try {
      console.info('UserProfile.LoadStart', JSON.stringify({ userId }))
      this.user = await fetchPublicUser(userId)
      console.info('UserProfile.PublicUser', JSON.stringify({ user: this.user }))
      this.rep = await fetchReputation(userId)
      console.info('UserProfile.Reputation', JSON.stringify({ reputation: this.rep }))
      const viewerId: number | undefined = Number(this.appUser.user.id ?? 0) || undefined
      const rawPosts = await fetchUserPosts(userId, viewerId)
      this.posts = rawPosts.map((p: SquarePostDTO) => new UserPostModel(p))
      console.info('UserProfile.Posts', JSON.stringify({ postsCount: this.posts.length }))
      this.reviews = await fetchReviews(userId)
      console.info('UserProfile.Reviews', JSON.stringify({ reviewsCount: this.reviews.length }))
    } catch (_e) {
      promptAction.showToast({ message: '加载失败' })
    }
  }

  onPageShow(): void {
    const id = Number(this.targetUserId ?? 0)
    if (id && id > 0) { this.loadAll(id) }
  }

  build(): void {
    Stack() {
      Column() {
        this.renderHeader()
        Refresh({
          refreshing: this.isRefreshing,
          builder: this.renderRefreshHeader
        }) {
          Scroll(this.scroller) {
            Column({ space: 12 }) {
              this.renderProfileCard()
              this.renderPosts()
            }
            .padding({ left: 16, right: 16, bottom: 160 })
          }
          .scrollBar(BarState.Off)
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
      .height('100%')
      .justifyContent(FlexAlign.Start)
      this.renderReportModal()
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderRefreshHeader() {
    Row({ space: 10 }) {
      if (this.isRefreshing) {
        ProgressLoading({ pWidth: 18, strokeWidth: 2, loading: this.isRefreshing })
      }
      Text(this.refreshText)
        .fontSize(13)
        .fontColor($r('[basic].color.text_secondary'))
    }
    .width('100%')
    .height(60)
    .justifyContent(FlexAlign.Center)
    .backgroundColor(Color.Transparent)
  }

  @Builder
  private renderHeader() {
    Row() {
      Image($r('[basic].media.ic_public_left'))
        .width(28)
        .aspectRatio(1)
        .fillColor($r('[basic].color.white'))
        .onClick(() => {
          HMRouterMgr.pop()
        })
      Text('个人空间')
        .fontSize(20)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.white'))
      Blank()
    }
    .padding({
      top: this.safeArea.topHeight + 10,
      bottom: 12,
      left: 16,
      right: 16
    })
    .backgroundColor($r('[basic].color.home_header_bg'))
    .width('100%')
  }

  @Builder
  private renderProfileCard() {
    Column({ space: 12 }) {
      Row({ space: 12 }) {
        Image(this.getAvatarSource(this.user?.avatar_url ?? ''))
          .width(56)
          .height(56)
          .borderRadius(28)
          .objectFit(ImageFit.Cover)
          .backgroundColor($r('[basic].color.search_box_bg'))
        Column({ space: 6 }) {
          Text(this.user?.username ?? '匿名用户')
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('[basic].color.text_primary'))
          Text(`ID: ${this.user?.wxid ?? 0} | ${this.user?.school_name ?? ''}`)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
          Text(this.creditText())
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
          Row({ space: 8 }) {
            this.renderStars()
            Text(`${this.weightedScore().toFixed(2)}`)
              .fontSize(12)
              .fontColor($r('[basic].color.text_secondary'))
          }
        }
        .justifyContent(FlexAlign.Start)
        .layoutWeight(1)
      }
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
  }

  @Builder
  private renderStats() {
    Row({ space: 12 }) {
      Column() {
        Text('完成任务').fontSize(12).fontColor($r('[basic].color.text_secondary'))
        Text(this.statCompletedText())
          .fontSize(16)
          .fontColor($r('[basic].color.text_primary'))
          .fontWeight(FontWeight.Medium)
      }
      .padding(12)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(16)
      .layoutWeight(1)

      Column() {
        Text('取消任务').fontSize(12).fontColor($r('[basic].color.text_secondary'))
        Text(this.statCanceledText())
          .fontSize(16)
          .fontColor($r('[basic].color.text_primary'))
          .fontWeight(FontWeight.Medium)
      }
      .padding(12)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(16)
      .layoutWeight(1)

      Column() {
        Text('被举报').fontSize(12).fontColor($r('[basic].color.text_secondary'))
        Text(this.statReportsText())
          .fontSize(16)
          .fontColor($r('[basic].color.text_primary'))
          .fontWeight(FontWeight.Medium)
      }
      .padding(12)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(16)
      .layoutWeight(1)
    }
    .width('100%')
  }

  @Builder
  private renderStatItem(label: string, value: string) {
    Column() {
      Text(label).fontSize(12).fontColor($r('[basic].color.text_secondary'))
      Text(value).fontSize(16).fontColor($r('[basic].color.text_primary')).fontWeight(FontWeight.Medium)
    }
    .padding(12)
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(16)
    .layoutWeight(1)
  }

  @Builder
  private renderTabs() {
    Row({ space: 12 }) {
      Column() {
        Text('帖子')
          .fontSize(14)
          .fontColor(this.tab === 'posts' ? $r('[basic].color.white') : $r('[basic].color.text_secondary'))
      }
      .width('48%')
      .height(40)
      .backgroundColor(this.tab === 'posts' ? $r('[basic].color.filter_active_bg') : $r('[basic].color.white'))
      .borderRadius(16)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .onClick(() => {
        this.tab = 'posts'
      })

      Column() {
        Text('评价')
          .fontSize(14)
          .fontColor(this.tab === 'reviews' ? $r('[basic].color.white') : $r('[basic].color.text_secondary'))
      }
      .width('48%')
      .height(40)
      .backgroundColor(this.tab === 'reviews' ? $r('[basic].color.filter_active_bg') : $r('[basic].color.white'))
      .borderRadius(16)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .onClick(() => {
        this.tab = 'reviews'
      })
    }
    .padding({
      left: 4,
      right: 4,
      top: 8,
      bottom: 8
    })
  }

  @Builder
  private renderPosts() {
    if (!this.posts || this.posts.length === 0) {
      Text('暂无帖子')
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
        .textAlign(TextAlign.Center)
        .width('100%')
        .padding({ top: 8, bottom: 8 })
    } else {
      Column({ space: 12 }) {
        ForEach(this.posts, (p: UserPostModel) => {
          this.renderPostCard(p)
        }, (p: UserPostModel) => `${p.id}`)
      }
    }
  }

  @Builder
  private renderPostCard(p: UserPostModel) {
    Column({ space: 10 }) {
      Text(p.content)
        .fontSize(14)
        .fontColor($r('[basic].color.text_primary'))
        .lineHeight(22)
        .textAlign(TextAlign.Start)
        .width('100%')
      if (p.images && p.images.length > 0) {
        this.renderPostImages(p)
      }

      Row({ space: 12 }) {
        Text(this.formatTime(p.created_time)).fontSize(12).fontColor($r('[basic].color.text_secondary'))
        Row({ space: 6 }) {
          Image(p.isLiked ? $r('app.media.icon_heart_fill') : $r('app.media.icon_heart_line')).width(18).height(18).onClick(() => this.toggleLikePost(p))
          Text(`${p.likes_count}`).fontSize(12).fontColor($r('[basic].color.text_secondary')).onClick(() => this.toggleLikePost(p))
          Image($r('app.media.icon_square_comment')).width(18).height(18)
          Text(`${p.comments_count ?? 0}`).fontSize(12).fontColor($r('[basic].color.text_secondary'))
          Image($r('[basic].media.ic_public_more')).width(18).height(18).onClick(() => this.openReport(p.id))
        }
      }
      .justifyContent(FlexAlign.SpaceBetween)
      .padding(16)
      .width('100%')
    }
    .padding(16)
    .borderRadius(18)
    .backgroundColor($r('[basic].color.white'))
    .onClick(() => this.openPostDetail(p.id))
  }

  @Builder
  private renderPostImages(p: UserPostModel) {
    Scroll() {
      Row({ space: 10 }) {
        ForEach(p.images, (img: SquareImageDTO, index: number) => {
          if (img.status === 'pass') {
            Image(this.getOrientedUrl(img.url) as ResourceStr)
              .width(160)
              .height(120)
              .borderRadius(16)
              .objectFit(ImageFit.Cover)
              .onClick(() => this.openPreviewPage(
                p.images.filter((it: SquareImageDTO) => it.status === 'pass').map((it: SquareImageDTO) => it.url),
                index
              ))
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
        }, (_: SquareImageDTO, index: number) => `${p.id}-${index}`)
      }
    }
    .scrollable(ScrollDirection.Horizontal)
  }

  @Builder
  private renderReviews() {
    if (!this.reviews || this.reviews.length === 0) {
      Text('暂无评价')
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
        .textAlign(TextAlign.Center)
        .width('100%')
        .padding({ top: 8, bottom: 8 })
    } else {
      Column({ space: 12 }) {
        ForEach(this.reviews, (r: ReviewItem, idx: number) => {
          this.renderReviewCard(r)
        }, (_: ReviewItem, idx: number) => `rv-${idx}`)
      }
    }
  }

  @Builder
  private renderReviewCard(r: ReviewItem) {
    Row({ space: 8 }) {
      Row({ space: 8 }) {
        Image(this.getAvatarSource(r.reviewer_avatar ?? ''))
          .width(36)
          .height(36)
          .borderRadius(18)
          .objectFit(ImageFit.Cover)
          .backgroundColor($r('[basic].color.search_box_bg'))
        Column({ space: 4 }) {
          Text(r.reviewer_masked_name).fontSize(13).fontColor($r('[basic].color.text_primary'))
          Text(r.comment).fontSize(13).fontColor($r('[basic].color.text_primary')).textAlign(TextAlign.Start)
          Text(this.formatTime(r.created_time)).fontSize(12).fontColor($r('[basic].color.text_secondary'))
        }
        .alignItems(HorizontalAlign.Start)
      }

      this.renderStars()
    }
    .justifyContent(FlexAlign.SpaceBetween)
    .width('100%')
    .padding(12)
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(16)
  }

  @Builder
  private renderStars() {
    Row({ space: 4 }) {
      ForEach(this.starIndices(), (i: number) => {
        Text('★').fontSize(14).fontColor(this.starColor(i, this.weightedScore()))
      }, (i: number) => `star-${i}`)
    }
  }

  private statCompletedText(): string {
    return `${this.rep?.completed ?? 0}`
  }

  private statCanceledText(): string {
    return `${this.rep?.canceled ?? 0}`
  }

  private statReportsText(): string {
    return `${this.rep?.reports ?? 0}`
  }

  private starIndices(): number[] {
    return [0, 1, 2, 3, 4]
  }

  private starColor(i: number, score: number): ResourceColor | string {
    const full: number = Math.floor(score)
    const half: boolean = (score - full) >= 0.5
    if (i < full) {
      return '#FFB400'
    }
    if (half && i === full) {
      return '#FFD27A'
    }
    return '#DDDDDD'
  }

  private getAvatarSource(url: string): ResourceStr {
    return (url && url.length > 0 ? url : $r('[basic].media.ic_public_user')) as ResourceStr
  }

  private getOrientedUrl(url: string): string {
    const u = url?.replace(/`/g, '').trim()
    if (!u || u.length === 0) {
      return url
    }
    const hasQuery: boolean = u.indexOf('?') >= 0
    return hasQuery ? `${u}&imageMogr2/auto-orient` : `${u}?imageMogr2/auto-orient`
  }

  private openPreviewPage(urls: string[], index: number): void {
    const oriented: string[] = urls.map((u: string) => this.getOrientedUrl(u))
    ImagePreview.show(oriented, {
      startIndex: index,
      showIndex: true,
      loop: false
    })
  }

  private calcWeighted(rep: ReputationItem): number {
    const avg: number = rep.averageRating ?? 0
    const score: number = rep.totalScore ?? 0
    const weighted: number = avg * 0.7 + (score / 20) * 0.3
    return weighted
  }

  private getCreditLevelFromWeighted(w: number): string {
    if (w >= 4.5) {
      return '极好'
    }
    if (w >= 4.0) {
      return '良好'
    }
    if (w >= 3.0) {
      return '中等'
    }
    if (w >= 2.0) {
      return '一般'
    }
    if (w >= 1.0) {
      return '较差'
    }
    return '极差'
  }

  private weightedScore(): number {
    return this.rep ? this.calcWeighted(this.rep) : 0
  }

  private creditText(): string {
    if (!this.rep) {
      return '信用信息加载中'
    }
    const w = this.calcWeighted(this.rep)
    const level = this.getCreditLevelFromWeighted(w)
    return `${this.rep.totalScore.toFixed(1)}分 信用${level}`
  }

  private openReport(postId: number): void {
    this.reportPostId = postId
    this.reportReason = this.reportReasons.length > 0 ? this.reportReasons[0] : ''
    this.reportDesc = ''
    this.showReportModal = true
  }

  private async toggleLikePost(post: UserPostModel): Promise<void> {
    const uid: number = Number(this.appUser.user.id ?? 0)
    const token: string | undefined = this.appUser.user.token
    if (!uid || !token) { return }
    
    // Optimistic Update
    const originalLiked = post.isLiked
    const originalCount = post.likes_count

    post.isLiked = !post.isLiked
    post.likes_count = post.isLiked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1)

    try {
      if (originalLiked) {
        await unlikeSquarePost({ user_id: uid, square_id: post.id }, token)
      } else {
        await likeSquarePost({ user_id: uid, square_id: post.id }, token)
      }
    } catch (_e) {
      // Revert on failure
      post.isLiked = originalLiked
      post.likes_count = originalCount
      promptAction.showToast({ message: '操作失败' })
    }
  }

  @Builder
  private renderReportModal() {
    if (!this.showReportModal) { Blank() } else {
      Column() {
        Column({ space: 12 }) {
          Text('举报').fontSize(16).fontColor($r('[basic].color.text_primary'))
          Row({ space: 8 }) {
            ForEach(this.reportReasons, (r: string) => {
              Text(r)
                .fontSize(13)
                .fontColor(this.reportReason === r ? $r('[basic].color.white') : $r('[basic].color.text_secondary'))
                .backgroundColor(this.reportReason === r ? $r('[basic].color.filter_active_bg') : $r('[basic].color.search_box_bg'))
                .padding(8)
                .borderRadius(14)
                .onClick(() => { this.reportReason = r })
            }, (r: string, i: number) => `reason-${i}`)
          }
          TextInput({ placeholder: '补充说明' })
            .width('100%')
            .height(40)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .borderRadius(12)
            .onChange((v: string) => { this.reportDesc = v })
          Row({ space: 12 }) {
            Button('取消')
              .height(36)
              .borderRadius(16)
              .onClick(() => { this.showReportModal = false })
            Button('提交')
              .height(36)
              .borderRadius(16)
              .backgroundColor($r('[basic].color.filter_active_bg'))
              .fontColor($r('[basic].color.white'))
              .onClick(async () => { await this.submitReport() })
          }
        }
        .width('92%')
        .padding(16)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(20)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor('rgba(0,0,0,0.45)')
    }
  }

  private async submitReport(): Promise<void> {
    try {
      const token: string | undefined = this.appUser.user.token
      const uid: number = Number(this.appUser.user.id ?? 0)
      if (!token || !uid || !this.reportPostId) { this.showReportModal = false; return }
      await reportSquarePost({ post_id: this.reportPostId, reason: this.reportReason, description: this.reportDesc }, token)
      promptAction.showToast({ message: '举报成功' })
    } catch (_e) { promptAction.showToast({ message: '举报失败' }) }
    this.showReportModal = false
  }

  private formatTime(value: string): string {
    try {
      if (value.length >= 16 && value.includes('-') && value.includes(':') && value.indexOf('T') === -1) {
        const mm = value.substring(5, 7)
        const dd = value.substring(8, 10)
        const hh = value.substring(11, 13)
        const mi = value.substring(14, 16)
        return `${mm}月${dd}日 ${hh}:${mi}`
      }
      const d = new Date(value)
      const mm = (d.getMonth() + 1).toString().padStart(2, '0')
      const dd = d.getDate().toString().padStart(2, '0')
      const hh = d.getHours().toString().padStart(2, '0')
      const mi = d.getMinutes().toString().padStart(2, '0')
      return `${mm}月${dd}日 ${hh}:${mi}`
    } catch (_e) {
      return value
    }
  }

  private openPostDetail(postId: number): void {
    if (!postId || postId <= 0) {
      return
    }
    AppStorage.setOrCreate(SQUARE_DETAIL_ID_KEY, postId)
    HMRouterMgr.push({ pageUrl: PAGE_PATH.SQUARE_DETAIL_PAGE })
  }

  private async handleRefresh() {
    if (this.isRefreshing) {
      return
    }
    const id = Number(this.targetUserId ?? 0)
    if (!id || id <= 0) {
      this.isRefreshing = false
      return
    }
    this.isRefreshing = true
    try {
      await this.loadAll(id)
    } finally {
      this.isRefreshing = false
    }
  }

}

@ObservedV2
class UserPostModel implements SquarePostDTO {
  @Trace id: number = 0
  @Trace content: string = ''
  @Trace created_time: string = ''
  @Trace likes_count: number = 0
  @Trace images: SquareImageDTO[] = []
  @Trace isLiked: boolean = false
  @Trace comments_count: number = 0

  constructor(dto: SquarePostDTO) {
    this.id = dto.id
    this.content = dto.content
    this.created_time = dto.created_time
    this.likes_count = dto.likes_count
    this.images = dto.images
    this.isLiked = dto.isLiked ?? false
    this.comments_count = dto.comments_count ?? 0
  }
}
