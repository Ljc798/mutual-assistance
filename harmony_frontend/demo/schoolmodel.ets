// models/SchoolModel.ets
class School {
  id: string = '';
  name: string = '';
  province: string = '';
  city: string = '';
  type: string = ''; // 学校类型
}

// 持久化存储的学校数据
@ObservedV2
class SchoolData {
  @Trace selectedSchool: School = new School();
  @Trace searchHistory: string[] = [];
}
