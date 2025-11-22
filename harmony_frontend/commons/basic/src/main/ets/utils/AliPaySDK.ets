import { Pay as AlipayPayClass } from '@cashier_alipay/cashiersdk'

export interface AliPayPayOptions { orderInfo: string; showLoading?: boolean }
export interface AliPayPayResult { resultStatus: string; result: string; memo?: string }

export class AliPaySDK {
  static async pay(opts: AliPayPayOptions): Promise<AliPayPayResult> {
    try {
      const loading: boolean = Boolean(opts.showLoading)
      const task = new AlipayPayClass()
      const raw: Map<string, string> = await task.pay(opts.orderInfo, loading) as Map<string, string>
      const resultStatus: string = raw.get('resultStatus') ?? ''
      const result: string = raw.get('result') ?? ''
      const memo: string = raw.get('memo') ?? ''
      return { resultStatus, result, memo }
    } catch (_e) {
      return { resultStatus: 'FAILED', result: '', memo: 'sdk_error' }
    }
  }
}