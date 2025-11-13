import { authentication } from "@kit.AccountKit"
import { util } from "@kit.ArkTS";

export class HuaweiAuthManager {
  // 拉起华为登录
  async launchAuth() {
    try {
      // 1.创建授权请求
      const request = new authentication.HuaweiIDProvider().createAuthorizationWithHuaweiIDRequest()
      // 2.传递参数
      request.scopes = ['phone'];
      // 获取code需传如下permission
      request.permissions = ['serviceauthcode'];
      //
      request.forceAuthorization = true;

      request.state = util.generateRandomUUID(); // 随机UUID - 返回的state要和这个uuid对得上 没对上就说明有人篡改请求

      // controller的目的是发起请求
      const controller = new authentication.AuthenticationController(getContext())

      const result = await controller.executeRequest(request) as authentication.AuthorizationWithHuaweiIDResponse
      if (request.state === result.state) {
        // 说明请求是正常的
        AlertDialog.show({ message: result.data?.authorizationCode })
        return result.data?.authorizationCode
      } else {
        AlertDialog.show({ message: '华为登录请求被篡改！！！' })
        return Promise.reject(new Error("华为登录请求被篡改"))
      }

    } catch (error) {
      AlertDialog.show({ message: error.message })
      return Promise.reject(error)
    }

  }

  // 退出华为登录
  exitAuth() {

  }
}

export const huaweiAuthManager = new HuaweiAuthManager()