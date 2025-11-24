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
      NavBar({ title: '隐私说明', onLeftClick: () => HMRouterMgr.pop() })
      Scroll() {
        Column({ space: 12 }) {
          this.renderParagraph('互助Campus（以下简称“本应用”）由（你的备案主体名称）提供服务。我们严格按照《个人信息保护法》《网络安全法》等法律法规处理您的个人信息。本应用当前提供的功能较为基础，仅为实现校园互助需求所必要。现将我们收集、使用个人信息的情况说明如下：')
          this.renderTitle('一、我们收集的信息（仅限实现基本功能所需）')
          this.renderSubTitle('为实现账号登录、任务发布与接收、即时通讯和服务安全，本应用可能收集并使用以下信息：')
          this.renderBullet('账号注册信息')
          this.renderBullet('用户昵称、头像（由用户主动提供）')
          this.renderBullet('手机号码（用于登录验证）')
          this.renderBullet('设备信息（仅用于安全风控）')
          this.renderBullet('设备型号、系统版本、网络类型（HarmonyOS 自动上报的基础设备标识，用于保障账号安全与服务稳定性）')
          this.renderBullet('任务相关信息：用户主动发布的任务内容（文本、时间、地点请由用户自行决定是否提供）')
          this.renderBullet('即时通信信息：用户之间发送的聊天消息，仅用于实现聊天功能，不会另作他用，不会共享给第三方。')
          this.renderWarn('本应用目前不收集：位置权限、通讯录、相册、麦克风、剪贴板等敏感权限。')
          this.renderWarn('本应用不接入第三方 SDK（不含基础系统组件）。')

          this.renderTitle('二、我们不会收集的内容')
          this.renderSubTitle('为了保护您的隐私，本应用当前没有以下功能，因此不会涉及相关信息采集：')
          this.renderBullet('VIP / SVIP / 会员体系')
          this.renderBullet('商城、购买、积分余额')
          this.renderBullet('课程表数据')
          this.renderBullet('用户储值、支付记录')
          this.renderBullet('位置信息采集（无地图、无定位权限）')

          this.renderTitle('三、信息的使用目的')
          this.renderBullet('账号登录与身份验证')
          this.renderBullet('任务发布、接单、沟通及互助服务实现')
          this.renderBullet('服务安全保障（防止恶意注册、恶意操作）')
          this.renderBullet('改善产品体验的基础统计')
          this.renderParagraph('我们承诺不会将您的信息用于未明确说明的其他用途。')

          this.renderTitle('四、信息的存储与安全')
          this.renderBullet('用户数据存储于中国境内的服务器（京东云）。')
          this.renderBullet('采用 HTTPS、加密存储、权限隔离等方式保护数据。')
          this.renderBullet('本应用不会向境外提供用户信息。')
          this.renderBullet('用户可随时申请注销账号，相关数据会按照法律法规及时删除。')

          this.renderTitle('五、共享、转让与公开披露')
          this.renderParagraph('我们不会共享、出售、公开披露用户个人信息，除非满足以下条件之一：')
          this.renderBullet('获得您的明确授权；')
          this.renderBullet('为履行法律法规规定的义务；')
          this.renderBullet('为履行国家机关依法提出的要求。')

          this.renderTitle('六、未成年人保护')
          this.renderParagraph('本应用主要面向高校学生。如您为未成年人，请在监护人同意后使用本应用。')

          this.renderTitle('七、您的权利')
          this.renderBullet('查询、修改个人信息；')
          this.renderBullet('删除任务内容；')
          this.renderBullet('撤回授权；')
          this.renderBullet('注销账户；我们会在合理时间内处理。')

          this.renderTitle('八、联系方式')
          this.renderBullet('联系邮箱：loujiachen6@gmail.com')
          this.renderBullet('客服页面：应用内“联系方式/反馈”栏')
        }
        .padding({ left: 16, right: 16, top: 12, bottom: 24 })
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