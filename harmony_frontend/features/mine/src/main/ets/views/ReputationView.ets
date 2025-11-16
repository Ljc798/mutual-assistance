import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { AppSafeArea, AppUser, PAGE_PATH } from 'basic'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import { ReputationItem, ReputationLogItem, ReputationRuleItem } from '../viewmodels/ReputationTypes'
import { fetchReputation, fetchReputationLogs, fetchReputationRules } from '../services/ReputationService'

@HMRouter({ pageUrl: PAGE_PATH.REPUTATION_PAGE })
@Component
export struct ReputationView {
  private readonly scroller: Scroller = new Scroller()
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  @State summary: ReputationItem = {
    totalScore: 0,
    completed: 0,
    canceled: 0,
    reports: 0,
    averageRating: 0,
    reliabilityIndex: 0,
    updatedAt: ''
  }
  @State logs: ReputationLogItem[] = []
  @State rules: ReputationRuleItem[] = []

  aboutToAppear() {
    this.loadAll()
  }

  private async loadAll() {
    const userId = Number(this.appUser.user.id ?? 0)
    const token = this.appUser.user.token
    if (!userId || !token) { promptAction.showToast({ message: '请先登录' }); return }
    try {
      const s = await fetchReputation(userId)
      const l = await fetchReputationLogs(token)
      const r = await fetchReputationRules()
      this.summary = s
      this.logs = l
      this.rules = r
    } catch (_e) {
      promptAction.showToast({ message: '加载失败' })
    }
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        Scroll(this.scroller) {
          Column({ space: 12 }) {
            this.renderSummary()
            this.renderStats()
            this.renderLogs()
            this.renderRules()
          }
          .padding({ left: 16, right: 16, bottom: 80 })
          .height('100%')
        }
        .height('100%')
        .scrollBar(BarState.Off)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader() {
    Row() {
      Image($r('[basic].media.ic_public_left'))
        .width(28)
        .aspectRatio(1)
        .fillColor($r('[basic].color.white'))
        .onClick(() => { HMRouterMgr.pop() })
      Text('信誉分')
        .fontSize(20)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('[basic].color.white'))
      Blank()
    }
    .padding({ top: this.safeArea.topHeight + 10, bottom: 12, left: 16, right: 16 })
    .width('100%')
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderSummary() {
    Column({ space: 6 }) {
      Text(`${this.summary?.totalScore ?? 0} 分`)
        .fontSize(26)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('[basic].color.text_primary'))
      Text(this.summary?.updatedAt ? `最近更新：${this.summary?.updatedAt}` : '')
        .fontSize(12)
        .fontColor($r('[basic].color.text_secondary'))
    }
    .width('98%')
    .padding(20)
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(18)
  }

  @Builder
  private renderStats() {
    Row() {
      Column({ space: 4 }) {
        Text('完成任务')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
        Text(`${this.summary?.completed ?? 0}`)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Center)
      Column({ space: 4 }) {
        Text('取消任务')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
        Text(`${this.summary?.canceled ?? 0}`)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Center)
      Column({ space: 4 }) {
        Text('收到举报')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
        Text(`${this.summary?.reports ?? 0}`)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Center)
    }
    .width('98%')
    .padding(16)
    .backgroundColor($r('[basic].color.white'))
    .borderRadius(18)
  }

  @Builder
  private renderLogs() {
    Column({ space: 8 }) {
      Text('信誉变动')
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
      if (this.logs.length === 0) {
        Text('暂无记录')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
      } else {
        Column({ space: 8 }) {
          ForEach(this.logs, (it: ReputationLogItem) => {
            Row({ space: 8 }) {
              Text(it.type)
                .fontSize(13)
                .fontColor($r('[basic].color.text_secondary'))
              Text(`${it.delta > 0 ? '+' : ''}${it.delta}`)
                .fontSize(14)
                .fontColor(it.delta >= 0 ? $r('[basic].color.filter_active_bg') : '#FF4D4F')
              Blank()
              Text(it.createdTime)
                .fontSize(12)
                .fontColor($r('[basic].color.text_secondary'))
            }
            .padding({ left: 12, right: 12, top: 10, bottom: 10 })
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(12)
          }, (it: ReputationLogItem) => `${it.id}`)
        }
      }
    }
    .width('98%')
  }

  @Builder
  private renderRules() {
    Column({ space: 8 }) {
      Text('信誉规则')
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
      if (this.rules.length === 0) {
        Text('暂无规则')
          .fontSize(13)
          .fontColor($r('[basic].color.text_secondary'))
      } else {
        Column({ space: 8 }) {
          ForEach(this.rules, (rule: ReputationRuleItem) => {
            Column({ space: 4 }) {
              Row({ space: 8 }) {
                Text(rule.title)
                  .fontSize(14)
                  .fontWeight(FontWeight.Medium)
                Text(`${rule.delta > 0 ? '+' : ''}${rule.delta}`)
                  .fontSize(13)
                  .fontColor(rule.delta >= 0 ? $r('[basic].color.filter_active_bg') : '#FF4D4F')
              }
              Text(rule.description)
                .fontSize(12)
                .fontColor($r('[basic].color.text_secondary'))
            }
            .padding({ left: 12, right: 12, top: 10, bottom: 10 })
            .backgroundColor($r('[basic].color.white'))
            .borderRadius(12)
          }, (rule: ReputationRuleItem) => `${rule.id}`)
        }
      }
    }
    .width('98%')
    .padding({ bottom: 12 })
  }
}