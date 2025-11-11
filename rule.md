- 该项目为鸿蒙6.0 API 17的项目
- 开发鸿蒙项目只需要在/harmony_frontend里进行代码编写
- 根据/miniprogram/pages里的内容来编写页面内容及样式
- /harmony_frontend/demo文件夹为示例文件夹，在项目完成后将会删除，所以使用时，不能修改，也不能直接引用里面的方法，需要重新创建文件来使用里面的方法

### 常见错误及规范
- padding({Horizontal:10})为错误的写法，正确的是padding({top:10,left:10})
- .fontColor(Color('#39B54A'))为错误写法，正确的是.fontColor('#39B54A')
- 确保对所有@State成员都要补充默认值
- 只能对数组或数组派生类使用展开运算符
- 全面使用Navigation，而不是使用Router
- 类型安全优先原则：禁止使用 any 和 unknown 类型，必须显式声明具体类型，并且必须使用 interface 来定义结构类型
- 不存在navigation这个类，请不要import { Navigation } from 'kit.ArkUI'