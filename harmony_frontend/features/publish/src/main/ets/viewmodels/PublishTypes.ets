import { TaskMode } from 'basic'

export type PublishCategory =
  | '代拿快递'
  | '代拿外卖'
  | '兼职发布'
  | '作业协助'
  | '二手交易'
  | '寻物启事'
  | '代办服务'
  | '万能服务'

export const PUBLISH_CATEGORIES: PublishCategory[] = [
  '代拿快递',
  '代拿外卖',
  '兼职发布',
  '作业协助',
  '二手交易',
  '寻物启事',
  '代办服务',
  '万能服务'
]

export type PublishMethod = 'free' | 'pay' | 'vip'

export interface PublishForm {
  category: PublishCategory | ''
  title: string
  detail: string
  takeCode: string
  takeName: string
  takeTel: string
  position: string
  address: string
  reward: string
  deadlineDate: string
  deadlineTime: string
  deadline: string
  mode: TaskMode
}

@ObservedV2
export class PublishFormModel implements PublishForm {
  @Trace
  category: PublishCategory | '' = ''
  @Trace
  title: string = ''
  @Trace
  detail: string = ''
  @Trace
  takeCode: string = ''
  @Trace
  takeName: string = ''
  @Trace
  takeTel: string = ''
  @Trace
  position: string = ''
  @Trace
  address: string = ''
  @Trace
  reward: string = ''
  @Trace
  deadlineDate: string = ''
  @Trace
  deadlineTime: string = ''
  @Trace
  deadline: string = ''
  @Trace
  mode: TaskMode = 'fixed'

  constructor(model?: PublishForm) {
    if (!model) {
      return
    }
    this.category = model.category
    this.title = model.title
    this.detail = model.detail
    this.takeCode = model.takeCode
    this.takeName = model.takeName
    this.takeTel = model.takeTel
    this.position = model.position
    this.address = model.address
    this.reward = model.reward
    this.deadlineDate = model.deadlineDate
    this.deadlineTime = model.deadlineTime
    this.deadline = model.deadline
    this.mode = model.mode
  }
}

export interface PublishCreatePayload {
  employer_id: number
  school_id: number
  category: PublishCategory | ''
  position: string
  address: string
  DDL: string
  title: string
  offer: number
  detail: string
  takeaway_code?: string
  takeaway_tel?: string
  takeaway_name?: string
  publish_method: PublishMethod
  mode: TaskMode
  status: number
}

export interface PublishCreateResponse {
  success: boolean
  message?: string
  task_id?: number
}

export interface TaskPaymentParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

export interface TaskPrepayResponse {
  success: boolean
  paymentParams?: TaskPaymentParams
  message?: string
}

export interface PublishAiFormPayload {
  category: string
  title: string
  detail: string
  takeCode: string
  takeName: string
  takeTel: string
  DDL: string
  position: string
  address: string
  reward: string
  date: string
  time: string
  user_input?: string
}
