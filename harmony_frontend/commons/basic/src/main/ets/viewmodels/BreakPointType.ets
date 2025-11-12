import { BreakPointEnum } from "../utils/ScreenManager"

interface BreakPointTypeOption<T> {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
}

export class BreakPointType<T> {
  options: BreakPointTypeOption<T>

  constructor(option: BreakPointTypeOption<T>) {
    this.options = option
  }

  getValue(currentBreakPoint: BreakPointEnum): T {
    return (this.options as Record<BreakPointEnum, T>)[currentBreakPoint]
    // if (breakPoint === BreakPointEnum.XS) {
    //   return this.options.xs!
    // } else if (breakPoint === BreakPointEnum.SM) {
    //   return this.options.sm!
    // } else if (breakPoint === BreakPointEnum.MD) {
    //   return this.options.md!
    // } else {
    //   return this.options.lg!
    // }
  }
}