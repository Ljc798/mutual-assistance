export interface SchoolOption {
  id: number
  name: string
  province: string
  city: string
}

export interface SchoolSelectionSnapshot {
  id: number
  name: string
  province: string
  city: string
}

@ObservedV2
export class AppSelectedSchool {
  @Trace
  id: number = 0
  @Trace
  name: string = ''
  @Trace
  province: string = ''
  @Trace
  city: string = ''

  update(snapshot: SchoolSelectionSnapshot): void {
    this.id = snapshot.id
    this.name = snapshot.name
    this.province = snapshot.province
    this.city = snapshot.city
  }

  reset(): void {
    this.id = 0
    this.name = ''
    this.province = ''
    this.city = ''
  }
}

@ObservedV2
export class AppEditSelectedSchool {
  @Trace
  id: number = 0
  @Trace
  name: string = ''
  @Trace
  province: string = ''
  @Trace
  city: string = ''

  update(snapshot: SchoolSelectionSnapshot): void {
    this.id = snapshot.id > 0 ? snapshot.id : 0
    this.name = snapshot.name ?? ''
    this.province = snapshot.province ?? ''
    this.city = snapshot.city ?? ''
  }

  reset(): void {
    this.id = 0
    this.name = ''
    this.province = ''
    this.city = ''
  }
}

@ObservedV2
export class AppSchoolPickerContext {
  @Trace
  target: string = 'browse'
}
