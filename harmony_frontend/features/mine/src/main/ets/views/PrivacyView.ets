import { AppSafeArea, NavBar } from 'basic'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { PAGE_PATH } from 'basic'

@HMRouter({ pageUrl: PAGE_PATH.PRIVACY_PAGE })
@Component
export struct PrivacyView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!

  build() {
    Column() {
      NavBar({ title: '隐私说明', showRightIcon: false, onLeftClick: () => HMRouterMgr.pop() })
      Scroll() {
        Column({ space: 12 }) {
          this.renderParagraph('互助Campus 是由 娄嘉辰 （以下简称“我们”）为您提供的，用于校园便民服务的应用。本隐私声明由我们为处理您的个人信息而制定。')
          this.renderParagraph('我们非常重视您的个人信息和隐私保护，将会按照法律要求和业界成熟的安全标准，为您的个人信息提供相应的安全保护措施。')

          this.renderTitle('1. 我们如何收集和使用您的个人信息')
          this.renderParagraph('我们仅在有合法性基础的情形下才会使用您的个人信息。根据适用的法律，我们可能会基于您的同意、为履行/订立您与我们的合同所必需、履行法定义务所必需等合法性基础，使用您的个人信息。')
          
          this.renderSubTitle('1.1 基于履行法定义务或其他法律法规规定的情形，我们可能会处理您的以下个人信息：')
          this.renderParagraph('为了实现应用功能，在获取您的同意后我们需要收集您的电话号码 。')

          this.renderTitle('2. 设备权限调用')
          this.renderParagraph('图片和视频（允许应用保存图片、视频到用户公共目录、读取用户公共目录的图片或视频文件）')
          this.renderParagraph('上传帖子或者上传头像时调用')

          this.renderTitle('3. 管理您的个人信息')
          this.renderParagraph('如您对您的数据主体权利有进一步要求或存在任何疑问、意见或建议，可通过本声明中“如何联系我们”章节中所述方式与我们取得联系，并行使您的相关权利。')

          this.renderTitle('4. 信息存储地点及期限')
          this.renderParagraph('4.1 我们承诺，除法律法规另有规定外，我们对您的信息的保存期限应当为实现处理目的所必要的最短时间。')
          this.renderParagraph('4.2 上述信息将会传输并保存至中国境内的服务器。')

          this.renderTitle('5. 如何联系我们')
          this.renderParagraph('您可通过以下方式联系我们，并行使您的相关权利，我们会尽快回复。')
          this.renderParagraph('邮箱：loujiachen6@gmail.com')
          this.renderParagraph('如果您对我们的回复不满意, 特别是当个人信息处理行为损害了您的合法权益时您还可以通过向有管辖权的人民法院提起诉讼、向行业自律协会或政府相关管理机构投诉等外部途径进行解决。 您也可以向我们了解可能适用的相关投诉途径的信息。')

          Text('生效日期：2025.12.9')
            .fontSize(13)
            .fontColor($r('[basic].color.text_secondary'))
            .margin({ top: 20 })
            .width('100%')
            .textAlign(TextAlign.Start)
        }
        .alignItems(HorizontalAlign.Start)
        .padding({ left: 16, right: 16, top: 12, bottom: 120 })
      }
      .height('100%')
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderSection(title: string, content: string) {
    Column({ space: 6 }) {
      Text(title).fontSize(16).fontWeight(FontWeight.Medium).fontColor($r('[basic].color.text_primary'))
      Text(content).fontSize(13).fontColor($r('[basic].color.text_secondary')).lineHeight(20)
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 10, bottom: 10 })
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(12)
  }

  @Builder
  private renderTitle(text: string) {
    Text(text)
      .fontSize(16)
      .fontWeight(FontWeight.Medium)
      .fontColor($r('[basic].color.text_primary'))
  }

  @Builder
  private renderSubTitle(text: string) {
    Text(text)
      .fontSize(13)
      .fontColor($r('[basic].color.text_secondary'))
  }

  @Builder
  private renderParagraph(text: string) {
    Text(text)
      .fontSize(13)
      .fontColor($r('[basic].color.text_secondary'))
      .lineHeight(20)
  }

  @Builder
  private renderBullet(text: string) {
    Row({ space: 6 }) {
      Text('•').fontSize(13).fontColor($r('[basic].color.text_secondary'))
      Text(text).fontSize(13).fontColor($r('[basic].color.text_secondary')).lineHeight(20)
    }
  }

  @Builder
  private renderWarn(text: string) {
    Text(text)
      .fontSize(13)
      .fontColor('#FF4D4F')
      .lineHeight(20)
  }
}