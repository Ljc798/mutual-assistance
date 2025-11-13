export interface UserProfileSummary {
  name: string
  idLabel: string
  avatar: ResourceStr
  freeCounts: number
  points: number
  balance: string
}

export interface ReputationSummary {
  totalScore: number
  weightedScore: number
  creditLevel: string
}

export interface StatisticCard {
  label: string
  value: string
  action: 'shop' | 'wallet' | 'points'
}

export interface VipState {
  isVip: boolean
  expireText: string
}

export interface ActionShortcut {
  title: string
  action: 'orders' | 'space' | 'shop' | 'profile' | 'feedback'
}

// login
export interface LoginForm {
  account: string
  password: string
}

@ObservedV2
export class LoginFormModel implements LoginForm {
  @Trace
  account: string = ''
  @Trace
  password: string = ''

  constructor(model: LoginForm) {
    this.account = model.account
    this.password = model.password
  }
}
