### 项目规则
- 该项目为鸿蒙6.0 API 20的项目
- 开发鸿蒙项目只需要在/harmony_frontend里进行代码编写
- 根据/miniprogram/pages里的内容来编写页面内容及样式
- /server/router为所有后端接口，/server内部还有db和redis的配置，只需要按照这个要写http请求，后端代码不需要改动，只需要根据接口文档来写前端代码即可
- 数据库文件为mutual_assistance.sql， 可以在这里查到所有表的字段和信息，并且把公用表放在commons下，其他表根据功能放在不同的文件夹下
- /harmony_frontend/demo文件夹为示例文件夹，在项目完成后将会删除，所以使用时，不能修改，也不能直接引用里面的方法，需要重新创建文件来使用里面的方法
- 项目开发过程中采用“三层工程架构”，把项目拆分成不用类型的模块，在通过模块之间的引用组合，最终实现应用的功能，拆分规则如下：
  - commons(公共能力层)：用于存放公共基础能力合集，比如工具库，公共配置等
  - features(基础特性层)：用于存放应用中相对独立的各个功能的UI一级业务逻辑实现
  - products(产品定制层)：用于正对不同设备形态进行功能和特性集成，作为应用入口
- 该项目的设计模式为“MVVM”模式，其中：
  - Model：数据访问层，负责数据结构定义、数据管理和业务逻辑处理等。
  - View：用户界面层，负责UI展示和用户交互等。
  - ViewModel：连接Model和View的桥梁，管理UI状态和交互逻辑。

## 📑 目录

1. ArkTS 核心语法规范  
2. ArkUI 使用规范  
3. Builder 限制  
4. 工程 & 模块规范  
5. 网络请求规范  
6. 持久化存储规范  
7. 图片 & PixelMap 规范  
8. Refresh / Scroll / Tabs 规范  
9. 团队终极 Checklist（精简版）

# 🟩 1. ArkTS 核心语法规范

- 禁止 any / unknown
- 所有 @State 必须初始化默认值
- 禁止对象展开运算符
- 所有函数必须显式返回类型
- 禁止 for...in，仅允许 for...of
- 不可在泛型中使用对象字面量类型

# 🟦 2. ArkUI 使用规范

- padding 写法必须标准
- 字体颜色使用字符串
- Button 无 .disabled()，用 enabled(false)
- Image 只能接受 ResourceStr / PixelMap
- TextInput 不支持 InputType
- Flex 布局枚举使用正确
- Select 组件只能调用 `Select(options: SelectOption[])`，并通过 `.value()` / `.selected()` 设置当前值，不允许传入 `{ value, options }` 对象或自定义字段
- `@Watch` 不能装饰组件方法，需要通过 aboutToRender/State 比对来监听变化

# 🟧 3. Builder 限制

- Builder 中只能写 UI 组件，不可写 const/return/js

# 🟥 4. 工程 & 模块规范

- @Entry build() 只能有一个根容器
- 子页面不得出现 NavDestination
- 禁止 HAR/HSP 引入本地依赖 file:xxx
- bundleName 必须与签名一致

# 🟨 5. 网络请求规范

- request config 必须使用接口类型
- HttpClient 泛型必须引用 interface

# 🟪 6. 持久化存储规范

- AppStorage / PersistentStorage 不可 import
- JSON.parse 必须断言类型
- catch 必须写 (error)
- token 必须为 string

# 🟫 7. 图片 & PixelMap 规范

- 网络图片必须转 PixelMap
- 临时图片必须 createPixelMap()

# 🟦 8. Refresh / Scroll / Tabs 使用规范

- Refresh 事件为 onRefreshing
- Scroll 无需引入 Scroller
- Tabs 内不能出现 NavDestination

# 🟩 9. 团队终极 Checklist（精简版）

🔹 ArkTS
	•	❌ 禁止 any / unknown
	•	所有 @State 有默认值
	•	所有函数有返回类型
	•	禁止对象展开
	•	不使用 for…in
	•	interface 全部集中管理

🔹 ArkUI
	•	padding 写法标准
	•	Image 不用 { uri }
	•	Button 用 enabled(false)
	•	正确使用 FlexAlign / HorizontalAlign

🔹 模块
	•	build() 只有一个根节点
	•	不使用 NavDestination
	•	不使用本地依赖 file:xxx
	•	bundleName 与签名一致

🔹 持久化
	•	token 永远为字符串
	•	JSON.parse 有类型断言
	•	catch(error)

# 🧯 常见错误与解决方案

**ArkTSCheck: arkts-no-any-unknown**
- 错误原因：未显式类型导致被推断为 any/unknown，例如 `catch(error)` 未标注类型；变量/参数缺少接口类型声明。例：SquareDetailView.ets:243。
- 解决方案：所有异常参数与变量显式声明类型，如 `catch (error)`；函数/数据对象使用 interface 定义并在使用处标注泛型或类型。

**ArkTSCheck: arkts-no-untyped-obj-literals**
- 错误原因：直接传入未声明类型的对象字面量，未与显式接口对应。例：SquareDetailView.ets:257 传入点赞载荷 `{ user_id, square_id }`。
- 解决方案：为对象字面量标注接口类型或断言类型，例如：`const payload: SquareLikePayload = { user_id, square_id }`；或使用已有接口并在调用处传入该类型。

**ArkTSCheck: Cannot find name 'WebSocket' / 'MessageEvent'**
- 错误原因：ArkTS 环境不提供浏览器全局对象。
- 解决方案：使用 Harmony 提供的网络能力或回退为 HTTP 轮询；避免使用浏览器 API 名称。

**ArkTSCheck: arkts-no-utility-types / arkts-no-intersection-types**
- 错误原因：不支持 `Record<>`、`Partial<>` 等实用类型与交叉类型。
- 解决方案：用显式 interface 声明负载与响应类型，按字段展开，不使用交叉与工具类型。

**ArkTSCheck: arkts-no-obj-literals-as-types**
- 错误原因：在泛型中书写对象字面量类型。
- 解决方案：为响应定义命名接口，如 `SquareDetailResponse`，并在泛型中使用该接口。

**ArkTSCheck: 属性不存在（minHeight/position 链式）**
- 错误原因：在 Builder 调用上链式设置属性或使用不支持的属性名。
- 解决方案：用容器组件包裹 Builder，再在容器上设置 `.position(...)`；用 `.height('100%')` 替代 `.minHeight('100%')` 并配合 `Scroll`。

**ArkTSCheck: @State must specify a default value**
- 错误原因：`@State` 未初始化默认值，或使用可选 `?` 导致未提供初值。
- 解决方案：所有 `@State` 显式赋默认值，例如：
  - `@State count: number = 0`
  - `@State summary: ReputationItem = { totalScore: 0, completed: 0, canceled: 0, reports: 0, averageRating: 0, reliabilityIndex: 0, updatedAt: '' }`

**ArkTSCheck: 展开运算符禁用（arkts-no-spread）**
- 错误原因：不允许对象/数组展开。
- 解决方案：用 `slice()/concat()` 与“重建对象”模式替代，重新赋值触发渲染。

**资源命名空间错误**
- 错误原因：资源路径缺少模块命名空间。
- 解决方案：使用 `$r('[basic].media.xxx')` 或 `$r('app.media.xxx')`，避免裸资源名。
