import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppSafeArea, AppUser, PAGE_PATH, ProgressLoading, SQUARE_DETAIL_ID_KEY } from 'basic'
import { ImagePreview } from 'module_imagepreview'
import { MyPostItem, MyPostImage, MY_POST_EDIT_DATA_KEY } from '../viewmodels/MySpaceTypes'
import { deletePost, fetchMyPosts } from '../services/MySpaceService'

@HMRouter({ pageUrl: PAGE_PATH.MY_SPACE_PAGE })
@Component
export struct MySpaceView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State posts: MyPostItem[] = []
  @State isRefreshing: boolean = false
  @State refreshText: string = '下拉刷新'
  @StorageProp('reload_square_now') @Watch('onReloadSignalChange') reloadSignal: number = 0
  @StorageLink('my_post_patch_tick') @Watch('onPatchTickChange') patchTick: number = 0
  @StorageLink('last_updated_square_post_tick') @Watch('onSquarePostPatchTickChange') squarePostPatchTick: number = 0

  onReloadSignalChange() {
    this.loadPosts(true)
  }

  onPatchTickChange() {
    this.patchPostFromStorage()
  }

  onSquarePostPatchTickChange() {
    this.patchSquarePostFromStorage()
  }

  private patchPostFromStorage() {
    const raw: string = AppStorage.get<string>('last_updated_my_post') ?? ''
    if (!raw) return
    try {
      const patched = JSON.parse(raw) as MyPostItem
      if (!patched || !patched.id) return

      const index = this.posts.findIndex(p => p.id === patched.id)
      if (index !== -1) {
        // Create a new array to trigger UI update
        const nextPosts = [...this.posts]
        nextPosts[index] = patched
        this.posts = nextPosts
      }
    } catch (e) {
      console.error('[MySpaceView] Patch failed', e)
    }
  }

  private patchSquarePostFromStorage() {
    const raw: string = AppStorage.get<string>('last_updated_square_post') ?? ''
    if (!raw) return
    try {
      // Define a compatible interface for the patch data
      interface SquarePostPatch {
        id: number
        likesCount: number
        commentsCount: number
        isLiked: boolean
        content: string
        images: MyPostImage[]
      }
      const patched = JSON.parse(raw) as SquarePostPatch
      if (!patched || !patched.id) return

      const index = this.posts.findIndex(p => p.id === patched.id)
      if (index !== -1) {
        const oldPost = this.posts[index]
        const newPost: MyPostItem = {
          id: oldPost.id,
          content: patched.content,
          category: oldPost.category,
          likes_count: patched.likesCount,
          comments_count: patched.commentsCount,
          created_time: oldPost.created_time,
          username: oldPost.username,
          avatar_url: oldPost.avatar_url,
          vip_expire_time: oldPost.vip_expire_time,
          isLiked: patched.isLiked,
          images: patched.images ? patched.images.map((img: MyPostImage): MyPostImage => ({ url: img.url, status: img.status } as MyPostImage)) : oldPost.images
        }
        
        const nextPosts = [...this.posts]
        nextPosts[index] = newPost
        this.posts = nextPosts
      }
    } catch (e) {
      console.error('[MySpaceView] patchSquarePostFromStorage failed', e)
    }
  }

  aboutToAppear() { this.loadPosts(true) }
  onPageShow() { this.loadPosts(false) }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Refresh({
          refreshing: this.isRefreshing,
          builder: this.renderRefreshHeader
        }) {
          Scroll(this.scroller) {
            Column({ space: 10 }) {
              this.renderPostList()
            }
            .padding({ left: 16, right: 16, bottom: 120 + this.safeArea.bottomHeight })
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
      .width('100%')
    }
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader() {
    Row() {
      Image($r('[basic].media.ic_public_left')).width(28).aspectRatio(1).fillColor($r('[basic].color.white')).onClick(() => { HMRouterMgr.pop() })
      Text('我的空间').fontSize(20).fontWeight(FontWeight.Medium).fontColor($r('[basic].color.white'))
      Blank()
    }
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
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
  private renderPostList() {
    if (this.posts.length === 0) {
      Column() {
        Text('暂无动态').fontSize(14).fontColor($r('[basic].color.text_secondary')).textAlign(TextAlign.Center)
      }
      .padding({ top: 40 })
      .backgroundColor(Color.Transparent)
      .width('100%')
      .alignItems(HorizontalAlign.Center)
    } else {
      Column({ space: 10 }) {
        ForEach(this.posts, (post: MyPostItem) => {
          Column({ space: 8 }) {
            Row({ space: 8 }) {
              Image(this.getAvatar(post.avatar_url)).width(36).height(36).borderRadius(18)
              Column({ space: 4 }) {
                Text(post.username).fontSize(15).fontColor($r('[basic].color.text_primary')).fontWeight(FontWeight.Medium)
                Text(this.formatTime(post.created_time)).fontSize(12).fontColor($r('[basic].color.text_secondary'))
              }
              Blank()
              Row({ space: 8 }) {
                Button('编辑')
                  .height(32)
                  .borderRadius(16)
                  .backgroundColor($r('[basic].color.home_primary'))
                  .onClick(() => this.handleEdit(post))
                Button('删除')
                  .height(32)
                  .borderRadius(16)
                  .backgroundColor(Color.Red)
                  .onClick(async () => { await this.handleDelete(post.id) })
              }
            }
            Text(post.content).fontSize(16).fontColor($r('[basic].color.text_primary')).lineHeight(24)
            if (post.images && post.images.length > 0) {
              this.renderPostImages(post)
            }
          }
          .width('100%')
          .padding(16)
          .backgroundColor($r('[basic].color.white'))
          .borderRadius(12)
          .shadow({ radius: 8, color: '#0A000000', offsetY: 2 })
          .onClick(() => this.openPostDetail(post.id))
        }, (post: MyPostItem) => `${post.id}-${post.content}-${JSON.stringify(post.images)}`)
      }
      .backgroundColor(Color.Transparent)
      .width('100%')
    }
  }

  @Builder
  private renderPostImages(post: MyPostItem) {
    Scroll() {
      Row({ space: 10 }) {
        ForEach(post.images ?? [], (img: MyPostImage, index: number) => {
          if (img.status === 'pass') {
            Image(this.getOrientedUrl(img.url) as ResourceStr)
              .width(160)
              .height(120)
              .borderRadius(16)
              .objectFit(ImageFit.Cover)
              .onClick(() => this.openPreviewPage(
                (post.images ?? []).filter((it: MyPostImage): boolean => it.status === 'pass').map((it: MyPostImage): string => it.url),
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
        }, (_: MyPostImage, index: number) => `${post.id}-${index}`)
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
    const oriented: string[] = urls.map((u: string): string => this.getOrientedUrl(u))
    ImagePreview.show(oriented, {
      startIndex: index,
      showIndex: true,
      loop: false
    })
  }

  private async handleRefresh() {
    if (this.isRefreshing) {
      return
    }
    this.isRefreshing = true
    try {
      await this.loadPosts(true)
    } finally {
      this.isRefreshing = false
    }
  }

  private async loadPosts(fromRefresh: boolean) {
    const userId = Number(this.appUser.user.id ?? 0)
    if (!userId) { this.posts = []; return }
    const res = await fetchMyPosts({ userId, viewerId: userId, page: 1, pageSize: 10 })
    this.posts = res.success ? res.posts : []
  }

  private handleEdit(post: MyPostItem) {
    AppStorage.setOrCreate(MY_POST_EDIT_DATA_KEY, post)
    HMRouterMgr.push({ pageUrl: PAGE_PATH.MY_POST_EDIT_PAGE })
  }

  private handleDelete(postId: number) {
    const token = this.appUser.user.token
    if (!token) { this.showToast('请先登录'); return }

    promptAction.showDialog({
      title: '确认删除',
      message: '确定要删除这条动态吗？删除后不可恢复',
      buttons: [
        { text: '取消', color: '#666666' },
        { text: '删除', color: '#FF0000' }
      ]
    }).then(async (resp) => {
      if (resp.index === 1) {
        const r = await deletePost(postId, token)
        if (!r.success) { this.showToast(r.message ?? '删除失败'); return }
        this.showToast('已删除')
        
        // 更新本地列表
        this.posts = this.posts.filter(p => p.id !== postId)
        
        // 触发全局删除信号，让 SquareView / UserProfileView 移除该帖子
        AppStorage.setOrCreate('last_deleted_post_id', postId)
      }
    })
  }

  private openPostDetail(postId: number): void {
    if (!postId || postId <= 0) {
      return
    }
    AppStorage.setOrCreate(SQUARE_DETAIL_ID_KEY, postId)
    HMRouterMgr.push({ pageUrl: PAGE_PATH.SQUARE_DETAIL_PAGE })
  }

  private getAvatar(url: string): ResourceStr { return (url?.length ? url : 'https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/avatar/default.png') as ResourceStr }

  private formatTime(value: string): string {
    const d = new Date(value)
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const dd = d.getDate().toString().padStart(2, '0')
    const hh = d.getHours().toString().padStart(2, '0')
    const mi = d.getMinutes().toString().padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  }

  private showToast(message: string) { promptAction.showToast({ message, duration: 1500, bottom: 100 }) }
}
