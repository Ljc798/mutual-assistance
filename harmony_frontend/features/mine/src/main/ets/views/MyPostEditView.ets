import { PAGE_PATH, AppUser, AppSafeArea, NavBar, uploadBatch, UploadFileItem, UploadExtraFields, UploadResultItem } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { promptAction } from '@kit.ArkUI'
import { MyPostItem, MyPostImage, MY_POST_EDIT_DATA_KEY, MyPostEditPayload, MyPostImageUpdatePayload } from '../viewmodels/MySpaceTypes'
import { picker } from '@kit.CoreFileKit'
import fs from '@ohos.file.fs'
import { editPost, updatePostImages } from '../services/MySpaceService'
import { AppStorageV2 } from '@kit.ArkUI'

// Define interface for Square update patch
interface SquarePatch {
  id: number
  content: string
  category: string
  likesCount: number
  commentsCount: number
  isLiked: boolean | undefined
  images: MyPostImage[]
  approvedImages: MyPostImage[]
}

@HMRouter({ pageUrl: PAGE_PATH.MY_POST_EDIT_PAGE })
@Component
export struct MyPostEditView {
  @StorageLink(MY_POST_EDIT_DATA_KEY) originalPost: MyPostItem | undefined = undefined
  
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!

  @State content: string = ''
  @State category: string = ''
  @State images: MyPostImage[] = [] // Display images
  @State isSubmitting: boolean = false

  aboutToAppear() {
    if (this.originalPost) {
      this.content = this.originalPost.content
      this.category = this.originalPost.category
      // Clone images to avoid modifying original immediately
      this.images = this.originalPost.images ? JSON.parse(JSON.stringify(this.originalPost.images)) : []
    }
  }

  build() {
    Column() {
      NavBar({
        title: '编辑帖子',
        showRightIcon: false,
        onRightClick: () => {}
      })

      Scroll() {
        Column({ space: 16 }) {
          // Content
          TextArea({ text: this.content, placeholder: '请输入内容...' })
            .height(150)
            .width('100%')
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(8)
            .onChange((value) => { this.content = value })

          // Images
          Grid() {
            ForEach(this.images, (img: MyPostImage, index: number) => {
              GridItem() {
                Stack({ alignContent: Alignment.TopEnd }) {
                  Image(img.url)
                    .width('100%')
                    .height('100%')
                    .objectFit(ImageFit.Cover)
                    .borderRadius(8)
                  
                  Text('X')
                    .fontColor(Color.White)
                    .backgroundColor('rgba(0,0,0,0.5)')
                    .borderRadius(10)
                    .width(20)
                    .height(20)
                    .textAlign(TextAlign.Center)
                    .margin(4)
                    .onClick(() => {
                      this.images.splice(index, 1)
                    })
                }
                .width('100%')
                .aspectRatio(1)
              }
            })

            // Add button
            if (this.images.length < 9) {
              GridItem() {
                Column() {
                  Text('+')
                    .fontSize(30)
                    .fontColor('#999')
                }
                .width('100%')
                .aspectRatio(1)
                .backgroundColor('#f0f0f0')
                .borderRadius(8)
                .justifyContent(FlexAlign.Center)
                .alignItems(HorizontalAlign.Center)
                .onClick(() => this.pickImages())
              }
            }
          }
          .columnsTemplate('1fr 1fr 1fr')
          .columnsGap(8)
          .rowsGap(8)
          .width('100%')
          .height(300) // Fixed height or auto? Grid in Scroll might need height or nested scroll

          Button('保存')
            .width('100%')
            .height(44)
            .onClick(() => this.handleSubmit())
            .enabled(!this.isSubmitting)

        }
        .padding(16)
      }
    }
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  async pickImages() {
    const photoPicker = new picker.PhotoViewPicker()
    const result = await photoPicker.select({
      MIMEType: picker.PhotoViewMIMETypes.IMAGE_TYPE,
      maxSelectNumber: 9 - this.images.length
    })
    if (result.photoUris.length > 0) {
      // Add to images as temp urls for display
      // We need to mark them as new to upload them later? 
      // Or just upload them immediately?
      // Better to upload on submit.
      // But `images` state holds `MyPostImage` which has `url`.
      // I'll add them with a special flag or just handle them.
      // Actually, for display, I can use the uri.
      // But I need to distinguish them during submit.
      // I'll assume if it starts with 'file://' or 'datashare://' it is new.
      
      result.photoUris.forEach(uri => {
        this.images.push({ url: uri, status: 'pending' }) // 'pending' or whatever
      })
    }
  }

  async handleSubmit() {
    if (!this.originalPost) {
      promptAction.showToast({ message: '数据异常' })
      return
    }
    if (!this.content.trim()) {
      promptAction.showToast({ message: '内容不能为空' })
      return
    }
    this.isSubmitting = true
    const token: string = this.appUser.user.token

    try {
      // 1. Upload new images
      const finalImages: string[] = []
      const newFiles: UploadFileItem[] = []
      
      for (const img of this.images) {
        if (img.url.startsWith('file://') || img.url.startsWith('datashare://')) {
          // Prepare for upload
           const file = fs.openSync(img.url, fs.OpenMode.READ_ONLY)
           const stat = fs.statSync(file.fd)
           const buf = new ArrayBuffer(stat.size)
           fs.readSync(file.fd, buf)
           fs.closeSync(file.fd)
           
           newFiles.push({
             filename: `img_${Date.now()}.jpg`,
             mime: 'image/jpeg',
             data: new Uint8Array(buf),
             extra: { type: 'square' } as UploadExtraFields
           } as UploadFileItem)
        } else {
          finalImages.push(img.url)
        }
      }

      if (newFiles.length > 0) {
        // Fix: Explicitly pass undefined for progress callback to avoid type mismatch if any
        const uploadRes: UploadResultItem[] = await uploadBatch(newFiles, 3, 3, undefined, token)
        // Check results
        uploadRes.forEach((res: UploadResultItem) => {
          if (res.success && res.url) {
            finalImages.push(res.url)
          }
        })
      }

      // 2. Update post content
      const editPayload: MyPostEditPayload = {
        post_id: this.originalPost!.id,
        content: this.content,
        category: this.category
      }
      const editRes = await editPost(editPayload, token)
      if (!editRes.success) {
        throw new Error(editRes.message || '更新内容失败')
      }

      // 3. Update images if needed
      // Always update images to sync deletions/additions
      const imagePayload: MyPostImageUpdatePayload = {
        square_id: this.originalPost!.id,
        images: finalImages
      }
      const imgRes = await updatePostImages(imagePayload, token)
      if (!imgRes.success) {
        // Log warning but don't fail if content succeeded? Or fail?
        console.warn('Image update failed', imgRes.message)
      }

      // 4. Update local storage for immediate patch
      const finalPostImages: MyPostImage[] = finalImages.map((url: string) => ({ url, status: 'pass' } as MyPostImage))
      
      const updatedPost: MyPostItem = {
        id: this.originalPost!.id,
        content: this.content,
        category: this.category,
        likes_count: this.originalPost!.likes_count,
        comments_count: this.originalPost!.comments_count,
        created_time: this.originalPost!.created_time,
        username: this.originalPost!.username,
        avatar_url: this.originalPost!.avatar_url,
        vip_expire_time: this.originalPost!.vip_expire_time,
        isLiked: this.originalPost!.isLiked,
        images: finalPostImages
      }
      
      // Update for MySpace
      AppStorage.setOrCreate('last_updated_my_post', JSON.stringify(updatedPost))
      AppStorage.setOrCreate('my_post_patch_tick', Date.now())

      // Update for SquareView (requires camelCase and 'pass' status)
      const squarePatch: SquarePatch = {
        id: this.originalPost!.id,
        content: this.content,
        category: this.category,
        likesCount: this.originalPost!.likes_count,
        commentsCount: this.originalPost!.comments_count,
        isLiked: this.originalPost!.isLiked,
        images: finalPostImages,
        approvedImages: finalPostImages // Optimistically assume passed since we just uploaded/kept them
      }
      AppStorage.setOrCreate('last_updated_square_post', JSON.stringify(squarePatch))
      AppStorage.setOrCreate('last_updated_square_post_tick', Date.now())

      promptAction.showToast({ message: '修改成功' })
      HMRouterMgr.pop()
    } catch (error) {
      promptAction.showToast({ message: (error as Error).message })
    } finally {
      this.isSubmitting = false
    }
  }
}
