import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { AppSafeArea, AppUser, NavBar, uploadBatch, UploadFileItem, UploadResultItem, PAGE_PATH } from 'basic'
import { AppStorageV2 } from '@kit.ArkUI'
import promptAction from '@ohos.promptAction'
import picker from '@ohos.file.picker'
import fs from '@ohos.file.fs'
import { MyPostItem, MyPostImage, MY_POST_EDIT_DATA_KEY, MyPostEditPayload, MyPostImageUpdatePayload } from '../viewmodels/MySpaceTypes'
import { editPost, updatePostImages } from '../services/MySpaceService'

@HMRouter({ pageUrl: PAGE_PATH.MY_POST_EDIT_PAGE })
@Component
export struct MyPostEditView {
  @StorageLink(MY_POST_EDIT_DATA_KEY) originalPost: MyPostItem | undefined = undefined
  
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!

  @State content: string = ''
  @State category: string = ''
  @State images: MyPostImage[] = [] // Display images
  @State newImageFiles: string[] = [] // Local paths for new images
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
    const token = this.appUser.user.token

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
             filename: `img_${Date.now()}.jpg`, // Simplified
             mime: 'image/jpeg', // Simplified
             data: new Uint8Array(buf),
             extra: { type: 'square' }
           })
        } else {
          finalImages.push(img.url)
        }
      }

      if (newFiles.length > 0) {
        const uploadRes = await uploadBatch(newFiles, 3, 3, undefined, token)
        // Check results
        uploadRes.forEach(res => {
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

      // 3. Update images
      // Even if no images changed, we might need to send the list if the user deleted some.
      // The API `updateSquareImages` takes the *full list* of images.
      const imagePayload: MyPostImageUpdatePayload = {
        square_id: this.originalPost!.id,
        images: finalImages
      }
      const imgRes = await updatePostImages(imagePayload, token)
      if (!imgRes.success) {
        throw new Error(imgRes.message || '更新图片失败')
      }

      promptAction.showToast({ message: '修改成功' })
      // Refresh MySpaceView
      AppStorage.setOrCreate('reload_square_now', Date.now())
      HMRouterMgr.pop()

    } catch (err) {
      promptAction.showToast({ message: (err as Error).message })
    } finally {
      this.isSubmitting = false
    }
  }
}
