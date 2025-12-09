import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { MyPostItem } from '../viewmodels/MySpaceTypes'
import { deletePost, fetchMyPosts } from '../services/MySpaceService'

@HMRouter({ pageUrl: PAGE_PATH.MY_SPACE_PAGE })
@Component
export struct MySpaceView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State posts: MyPostItem[] = []
  @State isRefreshing: boolean = false

  aboutToAppear() { this.loadPosts() }
  onPageShow() { this.loadPosts() }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        this.renderPostList()
      }
      .height('100%')
      .width('100%')
      .backgroundColor($r('[basic].color.page_background'))
    }
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
  private renderPostList() {
    if (this.posts.length === 0) {
      Column() { Text('暂无动态').fontSize(14).fontColor($r('[basic].color.text_secondary')).textAlign(TextAlign.Center) }
        .padding({ top: 40 })
    } else {
      List({ space: 10 }) {
        ForEach(this.posts, (post: MyPostItem) => {
          ListItem() {
            Column({ space: 8 }) {
              Row({ space: 8 }) {
                Image(this.getAvatar(post.avatar_url)).width(36).height(36).borderRadius(18)
                Column({ space: 4 }) {
                  Text(post.username).fontSize(15).fontColor($r('[basic].color.text_primary')).fontWeight(FontWeight.Medium)
                  Text(this.formatTime(post.created_time)).fontSize(12).fontColor($r('[basic].color.text_secondary'))
                }
                Blank()
                Button('删除').height(32).borderRadius(16).backgroundColor(Color.Red).onClick(async () => { await this.handleDelete(post.id) })
              }
              Text(post.content).fontSize(16).fontColor($r('[basic].color.text_primary')).lineHeight(24)
            }
            .width('100%')
            .padding(16)
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(12)
            .shadow({ radius: 8, color: '#0A000000', offsetY: 2 })
          }
          .padding({ left: 16, right: 16, top: 6, bottom: 6 })
        }, (post: MyPostItem) => `${post.id}`)
      }
      .padding({ left: 16, right: 16, bottom: 20 })
    }
  }

  private async loadPosts() {
    const userId = Number(this.appUser.user.id ?? 0)
    if (!userId) { this.posts = []; return }
    const res = await fetchMyPosts({ userId, viewerId: userId, page: 1, pageSize: 10 })
    this.posts = res.success ? res.posts : []
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
        await this.loadPosts()
      }
    })
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