export interface HuaweiLoginParams {
  clientId: string;

  /**
   * 客户端秘钥
   */
  clientSecret: string;

  /**
   * 华为授权码
   */
  code: string;
}
