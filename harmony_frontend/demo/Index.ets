// pages/Index.ets
import { School, SchoolData } from '../models/SchoolModel';

// 持久化初始化
PersistentStorage.persistProp('schoolData', JSON.stringify({
  selectedSchool: new School(),
  searchHistory: []
}));

@Entry
@Component
struct Index {
  @StorageLink('schoolData') schoolDataStr: string = '{}';
  @State schoolData: SchoolData = new SchoolData();

  aboutToAppear() {
    this.onDataChange();
  }

  onDataChange() {
    // 解析持久化数据
    try {
      const data = JSON.parse(this.schoolDataStr);
      this.schoolData.selectedSchool = data.selectedSchool;
      this.schoolData.searchHistory = data.searchHistory || [];
    } catch (e) {
      console.error('解析学校数据失败:', e);
    }
  }

  build() {
    Column() {
      // 显示已选学校
      if (this.schoolData.selectedSchool.name) {
        Text('已选学校: ' + this.schoolData.selectedSchool.name)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .margin(20)

        Text(`省份: ${this.schoolData.selectedSchool.province}`)
        Text(`城市: ${this.schoolData.selectedSchool.city}`)
      } else {
        Text('请选择学校')
          .fontSize(20)
          .fontColor(Color.Gray)
          .margin(20)
      }

      // 选择学校按钮
      Button('选择学校')
        .onClick(() => {
          router.pushUrl({
            url: 'pages/SchoolListPage'
          });
        })
        .margin(20)

    }
    .width('100%')
    .height('100%')
  }
}
