import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, PAGE_PATH, AppUser, SquareCommentItem } from 'basic'
import { SquarePost } from '../viewmodels/SquareTypes'
import { SquareImageDTO, SquareLikePayload } from '../viewmodels/SquareTypes'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppCurrentSquareDetail } from '../viewmodels/SquareDetailVM'
import { fetchSquareDetail, fetchSquareComments, createSquareComment, likeSquareComment, unlikeSquareComment } from '../services/SquareDetailService'
import { likeSquarePost, unlikeSquarePost } from '../services/SquareService'

@Entry
@HMRouter({ pageUrl: PAGE_PATH.SQUARE_DETAIL_PAGE })
@Component
export struct SquareDetailView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly detailVM: AppCurrentSquareDetail = AppStorageV2.connect(AppCurrentSquareDetail, () => new AppCurrentSquareDetail())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State comments: SquareCommentItem[] = []
  @State commentModels: SquareCommentModel[] = []
  @State commentInput: string = ''
  @State isSubmittingComment: boolean = false
  @State replyToCommentId: number = 0
  @State replyRootParentId: number = 0
  @State replyToName: string = ''

  build() {
    Stack() {
      Column() {
        this.renderHeader()

        Scroll() {
          Column() {
            this.renderBody()
          }
        }
        .scrollBar(BarState.Off)
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Start)
      this.renderCommentEditor()
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('[basic].color.page_background'))
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
      Text('帖子详情')
        .fontSize(20)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.white'))
      Blank()
    }
    .justifyContent(FlexAlign.SpaceBetween)
    .alignItems(VerticalAlign.Center)
    .width('100%')
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderBody() {
    if (!this.detailVM.post || this.detailVM.id <= 0) {
      Column() {
        Text('未找到帖子数据')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
        Button('返回')
          .height(40)
          .borderRadius(16)
          .backgroundColor($r('[basic].color.search_box_bg'))
          .onClick(() => HMRouterMgr.pop())
      }
      .width('100%')
      .alignItems(HorizontalAlign.Center)
      .padding({ top: 60 })
    } else {
    Column({ space: 12 }) {
      Row({ space: 12 }) {
        Image(this.getAvatarSource(this.detailVM.post!.avatarUrl))
          .width(40)
          .height(40)
          .borderRadius(20)
          .objectFit(ImageFit.Cover)
          .backgroundColor($r('[basic].color.search_box_bg'))
        Column({ space: 4 }) {
          Text(this.detailVM.post!.username)
            .fontSize(15)
            .fontColor($r('[basic].color.text_primary'))
            .fontWeight(FontWeight.Medium)
          Text(this.detailVM.post!.formattedTime)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)
        Row({ space: 12 }) {
          Row({ space: 6 }) {
            Image(this.detailVM.post!.isLiked ? $r('app.media.icon_heart_fill') : $r('app.media.icon_heart_line'))
              .width(20)
              .height(20)
            Text(`${this.detailVM.post!.likesCount}`)
              .fontSize(12)
              .fontColor($r('[basic].color.text_secondary'))
          }
          .onClick(() => this.toggleLikePost())
          Text(`#${this.detailVM.post!.category}`)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
        }
      }
      .width('100%')
      .padding(16)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(16)

      Column({ space: 10 }) {
        Text(this.detailVM.post!.content)
          .fontSize(15)
          .fontColor($r('[basic].color.text_primary'))
          .lineHeight(22)
          .textAlign(TextAlign.Start)
        if (this.detailVM.post!.approvedImages.length > 0) {
          Scroll() {
            Row({ space: 10 }) {
              ForEach(this.detailVM.post!.approvedImages, (img: SquareImageDTO, index: number) => {
                Image(img.url as ResourceStr)
                  .width(160)
                  .height(120)
                  .borderRadius(16)
                  .objectFit(ImageFit.Cover)
              }, (_: SquareImageDTO, index: number) => `img-${index}`)
            }
          }
          .scrollable(ScrollDirection.Horizontal)
        }
      }
      .width('100%')
      .padding(16)
      .backgroundColor($r('[basic].color.white'))
      .borderRadius(16)
      Column({ space: 10 }) {
        Text('评论区')
          .fontSize(15)
          .fontColor($r('[basic].color.text_primary'))
        Column({ space: 8 }) {
          ForEach(this.commentModels, (item: SquareCommentModel) => {
            this.CommentCardModel(item)
          }, (item: SquareCommentModel) => `c-${item.id}`)
        }
      }
      .width('100%')
      .padding(16)
      .backgroundColor(Color.Transparent)
    }
    .padding({ left: 16, right: 16, top: 16, bottom: 16 })
    }
  }

  @Builder
  private CommentCardModel(item: SquareCommentModel) {
    Column({ space: 8 }) {
      Row({ space: 10 }) {
        Image(this.getAvatarSource(item.avatarUrl ?? ''))
          .width(28)
          .height(28)
          .borderRadius(14)
          .objectFit(ImageFit.Cover)
        Column({ space: 4 }) {
          Row({ space: 6 }) {
            Text(item.username)
              .fontSize(14)
              .fontColor($r('[basic].color.text_primary'))
            if (item.replyToUsername) {
              Text('回复')
                .fontSize(12)
                .fontColor($r('[basic].color.text_secondary'))
              Text(item.replyToUsername)
                .fontSize(12)
                .fontColor($r('[basic].color.filter_active_bg'))
            }
          }
          Text(item.content)
            .fontSize(14)
            .fontColor($r('[basic].color.text_primary'))
            .textAlign(TextAlign.Start)
          Text(item.createdTime)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
        }
        .layoutWeight(1)
        Column({ space: 6 }) {
          Row({ space: 6 }) {
            Image(item.isLiked ? $r('app.media.icon_heart_fill') : $r('app.media.icon_heart_line'))
              .width(18)
              .height(18)
            Text(`${item.likesCount}`)
              .fontSize(12)
              .fontColor($r('[basic].color.text_secondary'))
          }
          .onClick(() => this.toggleCommentLikeModel(item))
        }
      }
      .onClick(() => this.prepareReply(item))
      if (item.children.length > 0) {
        Column({ space: 6 }) {
          ForEach(item.children, (child: SquareCommentItem) => {
            this.CommentCardModel(new SquareCommentModel(child))
          }, (child: SquareCommentItem) => `c-${child.id}`)
        }
        .padding({ left: 32 })
      }
    }
    .padding({ left: 12, right: 12, top: 10, bottom: 10 })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(12)
  }

  @Builder
  private renderCommentEditor() {
    Column({ space: 8 }) {
      if (this.replyToCommentId > 0) {
        Row({ space: 8 }) {
          Text(`回复 ${this.replyToName}`)
            .fontSize(12)
            .fontColor($r('[basic].color.text_secondary'))
          Button('取消')
            .height(26)
            .borderRadius(12)
            .backgroundColor($r('[basic].color.search_box_bg'))
            .onClick(() => this.clearReply())
        }
      }
      Row({ space: 10 }) {
        TextInput({ placeholder: '发布你的评论...', text: this.commentInput })
          .layoutWeight(1)
          .height(40)
          .backgroundColor($r('[basic].color.white'))
          .borderRadius(18)
          .padding({ left: 12, right: 12 })
          .onChange((v: string) => this.commentInput = v)
        Button(this.isSubmittingComment ? '发表中...' : '发表')
          .height(40)
          .borderRadius(18)
          .backgroundColor($r('[basic].color.filter_active_bg'))
          .fontColor($r('[basic].color.white'))
          .enabled(!this.isSubmittingComment)
          .onClick(() => this.handleSubmitComment())
      }
      .padding({ left: 16, right: 16, bottom: 12 })
      .backgroundColor(Color.Transparent)
    }
    .position({
      left: 0,
      right: 0,
      bottom: this.safeArea.bottomHeight
    })
  }

  private getAvatarSource(url: string): ResourceStr {
    if (!url) {
      return $r('app.media.icon_square_avatar')
    }
    return url as ResourceStr
  }

  aboutToAppear() {
    const viewerId = this.appUser.user.id
    if (this.detailVM.id > 0) {
      this.loadDetail(this.detailVM.id, viewerId)
    }
  }

  private async loadDetail(postId: number, viewerId?: number) {
    try {
      const detail: SquarePost | undefined = await fetchSquareDetail(postId, viewerId)
      if (detail) { this.detailVM.setPost(detail) }
      const list: SquareCommentItem[] = await fetchSquareComments(postId, viewerId)
      this.comments = list
      const ms: SquareCommentModel[] = []
      for (let i = 0; i < list.length; i++) { ms.push(new SquareCommentModel(list[i])) }
      this.commentModels = ms
    } catch (error) {
      promptAction.showToast({ message: '加载失败' })
    }
  }

  private async toggleLikePost() {
    const userId = this.appUser.user.id
    const token = this.appUser.user.token
    if (!userId || !token || !this.detailVM.post) { promptAction.showToast({ message: '请先登录' }); return }
    try {
      const payload: SquareLikePayload = { user_id: userId, square_id: this.detailVM.post.id }
      if (this.detailVM.post.isLiked) {
        await unlikeSquarePost(payload, token)
        this.detailVM.post.isLiked = false
        this.detailVM.post.likesCount = Math.max(0, this.detailVM.post.likesCount - 1)
      } else {
        await likeSquarePost(payload, token)
        this.detailVM.post.isLiked = true
        this.detailVM.post.likesCount += 1
      }
      this.detailVM.post = this.rebuildPost(this.detailVM.post!)
    } catch (error) {
      promptAction.showToast({ message: '操作失败' })
    }
  }

  private async toggleCommentLikeModel(item: SquareCommentModel) {
    const userId = this.appUser.user.id
    if (!userId) { promptAction.showToast({ message: '请先登录' }); return }
    try {
      if (item.isLiked) {
        await unlikeSquareComment(item.id, userId)
        item.isLiked = false
        item.likesCount = Math.max(0, item.likesCount - 1)
      } else {
        await likeSquareComment(item.id, userId)
        item.isLiked = true
        item.likesCount += 1
      }
      const next = this.commentModels.slice()
      this.commentModels = next
    } catch (error) {
      promptAction.showToast({ message: '操作失败' })
    }
  }

  private async handleSubmitComment() {
    const token = this.appUser.user.token
    const userId = this.appUser.user.id
    const content = this.commentInput.trim()
    if (!token || !userId) { promptAction.showToast({ message: '请先登录' }); return }
    if (!this.detailVM.post || content.length === 0) { promptAction.showToast({ message: '请输入评论内容' }); return }
    this.isSubmittingComment = true
    try {
      const parentId = this.replyToCommentId > 0 ? this.replyToCommentId : undefined
      const rootParentId = this.replyToCommentId > 0 ? this.replyRootParentId : undefined
      const res = await createSquareComment({ user_id: userId, square_id: this.detailVM.post.id, content, parent_id: parentId, root_parent_id: rootParentId }, token)
      const newId = (res.comment_id ?? 0)
      const newItem: SquareCommentItem = {
        id: newId,
        userId,
        squareId: this.detailVM.post.id,
        content,
        parentId: parentId,
        rootParentId: rootParentId ?? newId,
        likesCount: 0,
        createdTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
        username: this.appUser.user.username ?? '我',
        avatarUrl: this.appUser.user.avatar_url ?? '',
        isVip: Boolean(this.appUser.user.vip_expire_time && new Date(this.appUser.user.vip_expire_time).getTime() > Date.now()),
        replyToUsername: this.replyToName || undefined,
        isLiked: false,
        children: []
      }
      if (parentId && rootParentId) {
        const next = this.commentModels.map((c: SquareCommentModel) => {
          if (c.id === rootParentId) {
            const children: SquareCommentItem[] = c.children.slice()
            children.push(newItem)
            c.children = children
            return c
          }
          return c
        })
        this.commentModels = next
      } else {
        const next2: SquareCommentModel[] = [new SquareCommentModel(newItem)].concat(this.commentModels)
        this.commentModels = next2
      }
      this.commentInput = ''
      this.clearReply()
      promptAction.showToast({ message: '评论成功' })
    } catch (error) {
      promptAction.showToast({ message: '评论失败' })
    } finally {
      this.isSubmittingComment = false
    }
  }

  private prepareReply(item: SquareCommentItem) {
    if (this.replyToCommentId === item.id) {
      this.clearReply()
      return
    }
    this.replyToCommentId = item.id
    const rootId = item.rootParentId && item.rootParentId > 0 ? item.rootParentId : item.id
    this.replyRootParentId = rootId
    this.replyToName = item.username
  }

  private clearReply() {
    this.replyToCommentId = 0
    this.replyRootParentId = 0
    this.replyToName = ''
  }

  private rebuildPost(p: SquarePost): SquarePost {
    return {
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl,
      content: p.content,
      category: p.category,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      createdTime: p.createdTime,
      formattedTime: p.formattedTime,
      isLiked: p.isLiked,
      isVip: p.isVip,
      pinned: p.pinned,
      schoolId: p.schoolId,
      images: p.images,
      approvedImages: p.approvedImages
    }
  }
}

@ObservedV2
export class SquareCommentModel implements SquareCommentItem {
  @Trace id: number
  @Trace userId: number
  @Trace squareId: number
  @Trace content: string
  @Trace parentId?: number
  @Trace rootParentId?: number
  @Trace likesCount: number
  @Trace createdTime: string
  @Trace username: string
  @Trace avatarUrl: string
  @Trace isVip: boolean
  @Trace replyToUsername?: string
  @Trace isLiked: boolean
  @Trace children: SquareCommentItem[]
  constructor(dto: SquareCommentItem) {
    this.id = dto.id
    this.userId = dto.userId
    this.squareId = dto.squareId
    this.content = dto.content
    this.parentId = dto.parentId
    this.rootParentId = dto.rootParentId
    this.likesCount = dto.likesCount
    this.createdTime = dto.createdTime
    this.username = dto.username
    this.avatarUrl = dto.avatarUrl ?? ''
    this.isVip = dto.isVip
    this.replyToUsername = dto.replyToUsername
    this.isLiked = dto.isLiked
    this.children = dto.children
  }
}