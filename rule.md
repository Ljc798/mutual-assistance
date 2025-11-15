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

### 常见错误及规范
- padding({Horizontal:10})为错误的写法，正确的是padding({top:10,left:10})
- .fontColor(Color('#39B54A'))为错误写法，正确的是.fontColor('#39B54A')
- 确保对所有@State成员都要补充默认值
- 只能对数组或数组派生类使用展开运算符
- 全面使用Navigation，而不是使用Router
- ！！！！！！！！类型安全优先原则：禁止使用 any 和 unknown 类型，必须显式声明具体类型，并且必须使用 interface 来定义结构类型，一定不要出现any和unknown！！！！！！
- 不存在navigation这个类，请不要import { Navigation } from 'kit.ArkUI'
- ArkTS 要求对象字面量必须有明确的类型声明，不能使用无类型的对象字面量。
- ArkTS 限制展开运算符只能用于数组或数组派生类，不能用于普通对象。
- Refresh 组件的回调事件名称应该是 onRefreshing 而不是 onRefresh。
- Flex 布局组件没有 justifyContent 属性，应该使用 justifyContent 的 ArkUI 对应属性。
- 使用了错误的枚举类型，FlexAlign 和 ItemAlign 是不同的枚举类型。正确用法.justifyContent(FlexAlign.Center) or .alignItems(HorizontalAlign.Center)
- scroller不需要引入，直接使用即可
- 禁止使用for... in循环，只能使用for... of循环
- 所有interface都写在viewmodels里，然后export导出，要用的地方引入
- 不要使用(error: Error)直接用(error)

### ArkTS 类型与结构补充规范
- 禁止在泛型或类型声明中直接使用对象字面量类型（例如 `HttpClient.get<Array<{...}>>`），必须先声明 interface/class 再引用。
- 方法调用时传入的配置对象必须具备显式接口类型（例如 `client.request(config: HttpRequestOptions)`），不要使用未类型的对象字面量 `{ ... }`。
- 展开运算符仅可用于数组或数组派生类，禁止对象展开；对象合并需显式赋值或通过工具函数实现。
- `@Entry` 组件的 `build` 方法必须且只能有一个根节点，且该根节点必须是容器组件（如 `Column`、`Row`、`Navigation`、`Tabs`）。

### SquareView.ets 当前编译错误原因
- `@State reportPostId?: number`（SquareView.ets:52）未提供默认值，ArkTS 规定所有 @State 成员必须显式初始化。
- 多个 @Builder 内直接书写普通语句（如 `const` 定义或 `return`），在 SquareView.ets:169、380、435、499、550 被报出 “Only UI component syntax can be written here”；Builder 区块中只能组合 UI 组件，控制流需要用 ArkUI 提供的条件/循环语法表达。
- `Image({ uri: ... })` 的写法（SquareView.ets:315、459）与 Image 组件签名不符，ArkUI 仅接受 `ResourceStr` 或 `PixelMap` 资源，不能传入自定义对象字面量。
- `Button` 组件不存在 `.disabled()` 属性（SquareView.ets:401、526），需要改用 `.enabled()` 等受支持的属性设置交互态。
- 事件处理函数 `() => this.submitPost()`、`() => this.submitReport()`（SquareView.ets:402、527）缺少显式返回类型，触发 `arkts-no-implicit-return-types` 规则；应声明 `(): void => { ... }`。
- `getAvatarSource` 及临时图片渲染中返回 `{ uri: string }`（SquareView.ets:714 等）不满足 `PixelMap | ResourceStr` 类型要求，导致 “Type '{ uri: string; }' is not assignable…” 报错，需要转换为 PixelMap 或引用打包资源。

### PublishView.ets 当前编译错误原因
- `@State pendingExtractData?: ExtractedFormData` 缺少默认值（PublishView.ets:55），违反 “所有 @State 成员必须初始化” 规则。
- ArkUI 并未导出 `InputType`（PublishView.ets:2），因此 TextInput 不可使用 `.type(InputType.xxx)`；需要换成 ArkUI 支持的属性或直接移除输入类型设置。
- `Image` 组件不支持 `.tintColor`（PublishView.ets:154）；需使用支持的属性或预设好颜色资源。
- `mode as typeof this.form.mode`（PublishView.ets:307、747）属于类型查询语句，ArkTS 只允许出现在类型位置；应直接使用明确的联合类型（如 `TaskMode`）。
- 自定义对象字面量必须显式声明接口（arkts-no-untyped-obj-literals）；例如任务发布 payload、AI 请求参数都要声明为 `PublishCreatePayload` / `AiExtractPayload`（PublishView.ets:459、631）。
- 在已经 `return` 的分支后继续比较 `method === 'pay'`（PublishView.ets:481）会导致类型收窄为 `'free' | 'vip'`，编译器认为比较无意义，应移除该比较。
- ArkTS 禁止对普通对象使用展开运算符（PublishView.ets:700）；需要通过手动赋值或辅助方法合并字段。
- 多个私有方法缺少显式返回类型（如 PublishView.ets:563、615 等），触发 `arkts-no-implicit-return-types` 警告，需要补充 `: void` / `: Promise<void>`。
- 在 Builder 中使用 `return`（PublishView.ets:838、897）违反 “Only UI component syntax can be written here”，应改为 `if/else` 分支输出组件。

### UserPersistenceManager.ets 持久化错误原因与处理
- `AppStorage`、`PersistentStorage` 为系统级全局对象，`@kit.ArkUI` 不导出这些成员，直接 `import` 会提示 “has no exported member”。正确做法是在 `typings/arkui-storage.d.ts` 中声明类型后直接使用全局对象。
- `UserInfo.token` 是可选字段，直接持久化会触发 “snapshot.token is possibly undefined”。必须定义 `UserSnapshot` 让 `token: string` 并在读写时统一转成字符串。
- `JSON.parse` 结果和 `catch` 变量默认是 `unknown`，在 ArkTS 会触发 `arkts-no-any-unknown`。需要先声明结构化接口（如 `RawUserSnapshot`）并通过 `as` 转换，同时为 `catch` 指定 `Error` 类型。
- ArkTS 仅支持 `instanceof`/`as` 类型收窄，禁止自定义 `value is Xxx` 守卫；也不要用 `hasOwnProperty` 鉴别，改用 `typeof model.token === 'string'` 等显式校验。
- ArkTS 禁止 `Object.prototype` 赋值及 `.call/.apply`，因此 `Object.prototype.hasOwnProperty.call` 会命中 `no-prototype-assignment` 和 `no-func-apply-call`。改写为直接的字段类型判断即可。
