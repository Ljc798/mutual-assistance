@ObservedV2
export class AppProfileTarget {
  @Trace userId: number
  constructor() { this.userId = 0 }
  set(id: number): void { this.userId = id }
  reset(): void { this.userId = 0 }
}
