import { BreakPointEnum } from "../utils/ScreenManager";

// V2的共享类的状态
@ObservedV2
export class AppBreakPoint {
  @Trace
  breakPoint: BreakPointEnum = BreakPointEnum.XS
}