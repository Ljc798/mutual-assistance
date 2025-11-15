// pages/SchoolListPage.ets
@Entry
@Component
struct SchoolListPage {
  @StorageLink('schoolData') schoolDataStr: string = '{}';
  @State schoolData: SchoolData = new SchoolData();
  @State schoolList: School[] = []; // 学校列表数据
  @State searchText: string = '';
  @State selectedProvince: string = '';
  @State selectedCity: string = '';

  aboutToAppear() {
    this.loadSchoolData();
    this.loadSchoolList();
  }

  loadSchoolData() {
    try {
      const data = JSON.parse(this.schoolDataStr);
      this.schoolData.selectedSchool = data.selectedSchool;
      this.schoolData.searchHistory = data.searchHistory || [];
    } catch (e) {
      console.error('解析学校数据失败:', e);
    }
  }

  loadSchoolList() {
    // 模拟数据加载，实际应从接口获取
    this.schoolList = [
      { id: '1', name: '清华大学', province: '北京', city: '北京市', type: '大学' },
      { id: '2', name: '北京大学', province: '北京', city: '北京市', type: '大学' },
      { id: '3', name: '复旦大学', province: '上海', city: '上海市', type: '大学' },
      // ... 更多学校数据
    ];
  }

  // 搜索学校
  searchSchools() {
    if (this.searchText) {
      // 添加到搜索历史
      if (!this.schoolData.searchHistory.includes(this.searchText)) {
        this.schoolData.searchHistory.unshift(this.searchText);
        this.saveSchoolData();
      }
    }
    // 实际应调用搜索接口
  }

  // 根据省市筛选
  filterByRegion() {
    // 根据选择的省市筛选学校
  }

  // 选择学校
  selectSchool(school: School) {
    this.schoolData.selectedSchool = school;
    this.saveSchoolData();

    // 返回首页
    router.back();
  }

  // 保存到持久化存储
  saveSchoolData() {
    this.schoolDataStr = JSON.stringify(this.schoolData);
  }

  build() {
    Column() {
      // 搜索栏
      TextInput({ placeholder: '搜索学校名称' })
        .onChange((value: string) => {
          this.searchText = value;
        })
        .onSubmit(() => this.searchSchools())
        .margin(10)

      // 省市选择器
      Row() {
        Text('省份:')
        // 这里可以使用Picker组件选择省份
        Text(this.selectedProvince || '请选择')
          .onClick(() => {
            // 打开省份选择
          })

        Text('城市:')
        Text(this.selectedCity || '请选择')
          .onClick(() => {
            // 打开城市选择
          })
      }
      .margin(10)

      // 学校列表
      List({ space: 10 }) {
        ForEach(this.schoolList, (school: School) => {
          ListItem() {
            Column() {
              Text(school.name)
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
              Text(`${school.province} · ${school.city}`)
                .fontSize(14)
                .fontColor(Color.Gray)
            }
            .padding(15)
            .onClick(() => this.selectSchool(school))
          }
        })
      }
      .layoutWeight(1)

    }
    .width('100%')
    .height('100%')
  }
}
