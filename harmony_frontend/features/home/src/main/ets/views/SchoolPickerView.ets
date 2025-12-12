import promptAction from '@ohos.promptAction'
import { AppStorageV2 } from '@kit.ArkUI'
import { HMRouter, HMRouterMgr } from '@hadss/hmrouter'
import {
  AppSafeArea,
  AppSelectedSchool,
  AppEditSelectedSchool,
  AppSchoolPickerContext,
  AppUser,
  PAGE_PATH,
  ProgressLoading,
  SchoolSelectionSnapshot,
  schoolPersistence
} from 'basic'
import {
  fetchCities,
  fetchProvinces,
  fetchSchoolsByCity,
  searchSchools,
  submitSchoolFeedback
} from '../services/SchoolPickerService'
import { SchoolFeedbackPayload, SchoolListItem, SchoolListQuery } from '../viewmodels/SchoolPickerTypes'

@HMRouter({ pageUrl: 'SchoolPickerView' })
@Component
export struct SchoolPickerView {
  safeArea: AppSafeArea = AppStorageV2.connect(AppSafeArea, () => new AppSafeArea())!
  private readonly selection: AppSelectedSchool = AppStorageV2.connect(AppSelectedSchool, () => new AppSelectedSchool())!
  private readonly editSelection: AppEditSelectedSchool = AppStorageV2.connect(AppEditSelectedSchool, () => new AppEditSelectedSchool())!
  private readonly pickerContext: AppSchoolPickerContext = AppStorageV2.connect(AppSchoolPickerContext, () => new AppSchoolPickerContext())!
  private readonly appUser: AppUser = AppStorageV2.connect(AppUser, () => new AppUser())!
  private readonly pageSize: number = 20
  private hasBootstrapped: boolean = false
  @State provinces: string[] = []
  @State cities: string[] = []
  @State schools: SchoolListItem[] = []
  private readonly provincePlaceholder: string = '请选择省份'
  private readonly cityPlaceholder: string = '请选择城市'
  @State selectedProvince: string = '请选择省份'
  @State selectedCity: string = '请选择城市'
  @State searchKeyword: string = ''
  @State page: number = 1
  @State hasMore: boolean = true
  @State isLoadingSchools: boolean = false
  @State isSearchMode: boolean = false
  @State showFeedbackDialog: boolean = false
  @State feedbackSchoolName: string = ''
  @State feedbackProvince: string = ''
  @State feedbackCity: string = ''
  @State isSubmittingFeedback: boolean = false
  @State provinceOptions: SelectOption[] = []
  @State cityOptions: SelectOption[] = []
  @State isPageVisible: boolean = true

  onPageShow(): void {
    this.isPageVisible = true
  }

  onPageHide(): void {
    this.isPageVisible = false
  }

  aboutToAppear(): void {
    if (this.hasBootstrapped) {
      return
    }
    this.hasBootstrapped = true
    this.bootstrap()
  }

  private async bootstrap(): Promise<void> {
    this.initializeSelectOptions()
    await this.loadProvinces()
  }

  private async loadProvinces(): Promise<void> {
    try {
      const list = await fetchProvinces()
      this.provinces = list
      this.updateProvinceOptions(list)
      if (list.length === 0) {
        this.selectedProvince = this.provincePlaceholder
        this.resetCityOptions()
        return
      }
      const preferred = this.getPreferredProvince(list)
      if (preferred) {
        this.selectedProvince = preferred
        await this.loadCities(preferred)
      } else {
        this.selectedProvince = this.provincePlaceholder
        this.resetCityOptions()
      }
    } catch (error) {
      console.error('加载省份失败', error.message)
      this.showToast('获取省份列表失败')
    }
  }

  private getPreferredProvince(list: string[]): string | undefined {
    if (this.selection.name.length > 0 && this.selection.province.length > 0) {
      const matched = list.find((item: string) => item === this.selection.province)
      if (matched) {
        return matched
      }
    }
    return list.length > 0 ? list[0] : undefined
  }

  private async loadCities(province: string): Promise<void> {
    if (this.isProvincePlaceholder(province)) {
      this.cities = []
      this.resetCityOptions()
      return
    }
    try {
      const list = await fetchCities(province)
      this.cities = list
      this.updateCityOptions(list)
      this.updateCityOptions(list)
      if (list.length === 0) {
        this.selectedCity = this.cityPlaceholder
        this.resetSchoolList()
        return
      }
      const preferredCity = this.getPreferredCity(list, province)
      if (preferredCity) {
        this.selectedCity = preferredCity
        this.resetSchoolList()
        await this.loadSchoolsByCity(true)
      } else {
        this.selectedCity = this.cityPlaceholder
        this.resetSchoolList()
      }
    } catch (error) {
      console.error('加载城市失败', error.message)
      this.showToast('获取城市列表失败')
    }
  }

  private getPreferredCity(list: string[], province: string): string | undefined {
    if (list.length === 0) {
      return undefined
    }
    if (this.selection.province === province && this.selection.city.length > 0) {
      const matched = list.find((item: string) => item === this.selection.city)
      if (matched) {
        return matched
      }
    }
    return list.length > 0 ? list[0] : undefined
  }

  private initializeSelectOptions(): void {
    this.provinceOptions = [this.createSelectOption(this.provincePlaceholder)]
    this.resetCityOptions()
  }

  private updateProvinceOptions(list: string[]): void {
    const options: SelectOption[] = []
    options.push(this.createSelectOption(this.provincePlaceholder))
    for (const item of list) {
      options.push(this.createSelectOption(item))
    }
    this.provinceOptions = options
  }

  private updateCityOptions(list: string[]): void {
    const options: SelectOption[] = []
    options.push(this.createSelectOption(this.cityPlaceholder))
    for (const item of list) {
      options.push(this.createSelectOption(item))
    }
    this.cityOptions = options
  }

  private resetCityOptions(): void {
    this.cityOptions = [this.createSelectOption(this.cityPlaceholder)]
    this.selectedCity = this.cityPlaceholder
  }

  private createSelectOption(value: string): SelectOption {
    const option = {} as SelectOption
    option.value = value
    return option
  }

  private getOptionValue(option: SelectOption): string {
    const raw = option.value
    if (typeof raw === 'string') {
      return raw
    }
    if (typeof raw === 'number') {
      return `${raw}`
    }
    return ''
  }

  private getProvinceSelectedIndex(): number {
    const index =
      this.provinceOptions.findIndex((option: SelectOption) => this.getOptionValue(option) === this.selectedProvince)
    return index >= 0 ? index : 0
  }

  private getCitySelectedIndex(): number {
    const index =
      this.cityOptions.findIndex((option: SelectOption) => this.getOptionValue(option) === this.selectedCity)
    return index >= 0 ? index : 0
  }

  private isProvincePlaceholder(value: string): boolean {
    return !value || value === this.provincePlaceholder
  }

  private isCityPlaceholder(value: string): boolean {
    return !value || value === this.cityPlaceholder
  }

  private resetSchoolList(): void {
    this.page = 1
    this.hasMore = true
    this.schools = []
    this.isSearchMode = false
  }

  private async loadSchoolsByCity(reset: boolean): Promise<void> {
    if (this.isCityPlaceholder(this.selectedCity) || this.isLoadingSchools) {
      return
    }
    const nextPage = reset ? 1 : this.page + 1
    this.isLoadingSchools = true
    try {
      const query: SchoolListQuery = {
        city: this.selectedCity,
        page: nextPage,
        pageSize: this.pageSize
      }
      const list = await fetchSchoolsByCity(query)
      this.schools = reset ? list : [...this.schools, ...list]
      this.page = nextPage
      this.hasMore = list.length === this.pageSize
      this.isSearchMode = false
    } catch (error) {
      console.error('加载学校失败', error.message)
      this.showToast('获取学校列表失败')
    } finally {
      this.isLoadingSchools = false
    }
  }

  private async handleProvinceSelect(province: string): Promise<void> {
    if (province === this.selectedProvince) {
      return
    }
    if (this.isProvincePlaceholder(province)) {
      this.selectedProvince = this.provincePlaceholder
      this.resetCityOptions()
      this.resetSchoolList()
      return
    }
    this.selectedProvince = province
    this.resetCityOptions()
    this.resetSchoolList()
    await this.loadCities(province)
  }

  private async handleCitySelect(city: string): Promise<void> {
    if (city === this.selectedCity) {
      return
    }
    if (this.isCityPlaceholder(city)) {
      this.selectedCity = this.cityPlaceholder
      this.resetSchoolList()
      return
    }
    this.selectedCity = city
    this.resetSchoolList()
    await this.loadSchoolsByCity(true)
  }

  private async handleLoadMore(): Promise<void> {
    if (!this.hasMore || this.isSearchMode) {
      return
    }
    await this.loadSchoolsByCity(false)
  }

  private async handleSearchConfirm(): Promise<void> {
    const keyword = this.searchKeyword.trim()
    if (keyword.length === 0) {
      this.showToast('请输入学校关键词')
      return
    }
    this.isLoadingSchools = true
    try {
      const results = await searchSchools(keyword)
      this.schools = results
      this.isSearchMode = true
      this.hasMore = false
    } catch (error) {
      console.error('搜索学校失败', error.message)
      this.showToast('搜索失败，请稍后重试')
    } finally {
      this.isLoadingSchools = false
    }
  }

  private handleSelectSchool(item: SchoolListItem): void {
    if (!item.id || !item.name) {
      this.showToast('请选择有效学校')
      return
    }
    const snapshot: SchoolSelectionSnapshot = {
      id: item.id,
      name: item.name,
      province: item.province ?? this.selectedProvince,
      city: item.city ?? this.selectedCity
    }
    if (this.pickerContext.target === 'edit') {
      this.editSelection.update(snapshot)
    } else {
      schoolPersistence.persistSelection(snapshot)
      const nowTick: number = Date.now()
      AppStorage.setOrCreate('reload_square_now', nowTick)
      AppStorage.setOrCreate('reload_home_now', nowTick)
    }
    this.showToast(`已选：${snapshot.name}`)
    setTimeout(() => {
      HMRouterMgr.pop()
    }, 350)
  }

  private showToast(message: string): void {
    promptAction.showToast({
      message,
      duration: 2000,
      bottom: 72
    })
  }

  private formatSchoolLocation(item: SchoolListItem): string {
    const provinceText: string = item.province ?? this.selectedProvince
    const cityText: string = item.city ?? this.selectedCity
    if (provinceText && cityText) {
      return `${provinceText} · ${cityText}`
    }
    if (provinceText || cityText) {
      return provinceText || cityText
    }
    return '城市信息待补充'
  }

  build() {
    Stack() {
      Column() {
        this.renderHeader()
        this.renderSearchBar()
        this.renderLocationSelectors()
        this.renderSchoolList()
      }
      .height('100%')
      .width('100%')
    }
    .padding({bottom: 200 + this.safeArea.bottomHeight})
    .backgroundColor($r('[basic].color.page_background'))
  }

  @Builder
  private renderHeader() {
    Column({ space: 4 }) {
      Row() {
        Image($r('[basic].media.ic_public_left'))
          .width(28)
          .aspectRatio(1)
          .fillColor($r('[basic].color.white'))
          .onClick(() => {
            HMRouterMgr.pop()
          })
        Text('选择学校')
          .fontSize(20)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('[basic].color.white'))
        Blank()
      }
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(VerticalAlign.Center)
      .width('100%')

    }
    .padding({
      top: this.safeArea.topHeight + 10,
      bottom: 16,
      left: 16,
      right: 16
    })
    .backgroundColor($r('[basic].color.home_header_bg'))
  }

  @Builder
  private renderSearchBar() {
    Row({ space: 10 }) {
      TextInput({ placeholder: '请输入学校名称搜索', text: this.searchKeyword })
        .layoutWeight(1)
        .height(40)
        .backgroundColor($r('[basic].color.white'))
        .borderRadius(20)
        .padding({ left: 16, right: 16 })
        .onChange((value: string) => {
          this.searchKeyword = value
        })
        .onSubmit(() => {
          this.handleSearchConfirm()
        })
      Button('搜索')
        .height(40)
        .padding({ left: 16, right: 16 })
        .borderRadius(20)
        .backgroundColor($r('[basic].color.home_header_bg'))
        .fontColor($r('[basic].color.white'))
        .onClick((): void => {
          this.handleSearchConfirm()
        })
    }
    .padding({
      left: 16,
      right: 16,
      top: 12,
      bottom: 8
    })
  }

  @Builder
  private renderLocationSelectors() {
    Row({ space: 16 }) {
      Select(this.provinceOptions)
        .value(this.selectedProvince)
        .selected(this.getProvinceSelectedIndex())
        .width('48%')
        .border({ color: $r('[basic].color.search_box_bg'), width: 1 })
        .borderRadius(16)
        .padding({ left: 12, right: 12 })
        .height(44)
        .backgroundColor($r('[basic].color.white'))
        .onSelect((index: number) => {
          const option = this.provinceOptions[index]
          if (option !== undefined) {
            this.handleProvinceSelect(this.getOptionValue(option))
          }
        })

      Select(this.cityOptions)
        .value(this.selectedCity)
        .selected(this.getCitySelectedIndex())
        .width('48%')
        .border({ color: $r('[basic].color.search_box_bg'), width: 1 })
        .borderRadius(16)
        .padding({ left: 12, right: 12 })
        .height(44)
        .backgroundColor($r('[basic].color.white'))
        .enabled(!this.isProvincePlaceholder(this.selectedProvince) && this.cityOptions.length > 1)
        .onSelect((index: number) => {
          const option = this.cityOptions[index]
          if (option !== undefined) {
            this.handleCitySelect(this.getOptionValue(option))
          }
        })
    }
    .padding({
      left: 16,
      right: 16,
      top: 8,
      bottom: 8
    })
  }

  @Builder
  private renderSchoolList() {
    Column() {
      if (this.schools.length === 0) {
        Text(this.isLoadingSchools ? '正在加载学校...' : '请先选择城市或搜索学校')
          .fontSize(14)
          .fontColor($r('[basic].color.text_secondary'))
          .padding({ top: 20 })
      } else {
        List({ space: 12 }) {
          ForEach(this.schools, (item: SchoolListItem) => {
            ListItem() {
              Column({ space: 6 }) {
                Text(item.name)
                  .fontSize(16)
                  .fontWeight(FontWeight.Medium)
                  .fontColor($r('[basic].color.text_on_light'))
                Text(this.formatSchoolLocation(item))
                  .fontSize(13)
                  .fontColor($r('[basic].color.text_on_light'))
              }
              .width('100%')
              .padding({
                left: 16,
                right: 16,
                top: 14,
                bottom: 14
              })
              .backgroundColor($r('[basic].color.white'))
              .borderRadius(16)
              .onClick(() => {
                this.handleSelectSchool(item)
              })
            }
          }, (item: SchoolListItem) => `school-${item.id}`)

          if (this.isLoadingSchools) {
            ListItem() {
              Row({ space: 8 }) {
                ProgressLoading({ pWidth: 20, strokeWidth: 2, loading: this.isLoadingSchools && this.isPageVisible })
                Text('加载中...')
                  .fontSize(13)
                  .fontColor($r('[basic].color.text_secondary'))
              }
              .justifyContent(FlexAlign.Center)
              .padding({ top: 6, bottom: 6 })
              .width('100%')
            }
          } else if (!this.hasMore && this.schools.length > 0) {
            ListItem() {
              Row() {
                Text('没有更多学校了')
                  .fontSize(13)
                  .fontColor($r('[basic].color.text_secondary'))
                  .padding({ top: 6, bottom: 6 })
              }
              .width('100%')
              .justifyContent(FlexAlign.Center)
            }
          }
        }
        .scrollBar(BarState.Off)
        .onReachEnd(() => {
          this.handleLoadMore()
        })
      }
    }
    .padding({ left: 16, right: 16})
  }
}
