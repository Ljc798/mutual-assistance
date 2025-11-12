## 问题定位
- HomeView 类型错误：
  - `features/home/src/main/ets/views/HomeView.ets:501-502` 使用了泛型中的对象字面量类型（`Array<{...}>`），触发 `arkts-no-obj-literals-as-types` 与 `arkts-no-untyped-obj-literals`。
- HttpClient 规则错误：
  - `commons/basic/src/main/ets/utils/HttpClient.ets:21` 在 `client.request` 中传入未声明类型的对象字面量，触发 `arkts-no-untyped-obj-literals`。
  - `commons/basic/src/main/ets/utils/HttpClient.ets:41` 使用对象展开 `...(headers ?? {})`，触发 `arkts-no-spread`（对象不允许展开）与未声明类型的对象字面量。
- Entry 根节点错误：
  - `features/home/src/main/ets/pages/Index.ets:6-8` 在 `@Entry` 组件中，`build` 的根节点不是显式容器组件，触发「根节点必须为容器且仅一个」规则。

## 修复方案
- 将任务类型集中到 `commons`：
  - 在 `commons/basic/src/main/ets/viewmodels/task.ets` 新增服务端任务数据接口 `TaskDTO`（字段对齐后端 `backend/app/schemas/tasks_schema.py:5-20`），以及基础 UI 映射接口 `TaskItemBase`（公共展示字段）。
  - HomeView 中引用 `TaskDTO` 与 `TaskItemBase`，去除所有对象字面量类型。
- 修复 HomeView 泛型类型：
  - 将 `HttpClient.get<Array<{...}>>('/tasks')` 改为 `HttpClient.get<TaskDTO[]>('/tasks')`。
  - `fetchTasks` 映射输出使用 `TaskItemBase`，并在本地仅扩展必要的交互字段（如 `mode`、`hasPaid`），避免未声明对象字面量。
- 修复 HttpClient 类型与对象合并：
  - 定义 `HttpHeaders` 接口（索引签名：`[key: string]: string`）。
  - 定义 `HttpRequestConfig` 接口（`method`、`header`、`connectTimeout`、`readTimeout`、`extraData?`）。
  - `get`/`post` 中构造配置对象时，先用显式类型变量承载，再传入 `client.request`，避免「未类型的对象字面量」。
  - 去除对象展开，使用显式赋值合并头：`const reqHeaders: HttpHeaders = { 'Content-Type': 'application/json' }; if (headers) { for (const k in headers) reqHeaders[k] = headers[k]; }`。
- 修复 Entry 根节点：
  - 将 `features/home/src/main/ets/pages/Index.ets:6-8` 修改为：在 `build` 中使用显式容器根（如 `Column() { HomeView() }`），仅一个根容器节点。

## 修改点清单
- `commons/basic/src/main/ets/viewmodels/task.ets`
  - 新增：`export interface TaskDTO { id: number; employer_id: number; employee_id?: number; category: string; status: number; position: string; address: string; DDL: string; title: string; offer: number; detail: string; takeaway_code: string; takeaway_tel?: number; takeaway_name: string }`
  - 新增：`export interface TaskItemBase { id: string; title: string; category: string; deadline: string; position: string; address: string; status: 0|1|2; offer: number; formattedDeadline: string }`
- `features/home/src/main/ets/views/HomeView.ets:2, 500-514`
  - 引入新类型：`TaskDTO`, `TaskItemBase`。
  - 改造 `fetchTasks()` 泛型与映射，移除对象字面量类型。
- `commons/basic/src/main/ets/utils/HttpClient.ets:15-24, 39-45`
  - 引入并使用 `HttpHeaders` 与 `HttpRequestConfig`，移除未声明对象字面量与对象展开，改为显式赋值合并头。
- `features/home/src/main/ets/pages/Index.ets:6-8`
  - 将根节点改为单一容器（`Column()` 或 `Navigation()`），内部渲染 `HomeView()`。

## 规则补充（追加到 rule.md）
- 禁止在泛型或类型声明中使用对象字面量类型，必须使用显式 `interface` 或 `class`（arkts-no-obj-literals-as-types）。
- 所有对象字面量必须对应显式声明的接口类型（arkts-no-untyped-obj-literals）。
- 展开运算符只能用于数组或数组派生类，禁止对象展开；对象合并需通过显式赋值或工具函数完成（arkts-no-spread）。
- `@Entry` 组件的 `build` 必须且只能有一个根节点，且该根节点为容器组件（如 `Column`、`Row`、`Navigation`、`Tabs`）。

## 验证步骤
- 运行 ArkTS Lint／IDE 检查，确认上述错误消失：
  - HomeView 第 501-502 行错误消除。
  - HttpClient 第 21/41 行错误消除。
  - Entry 根节点错误消除。
- 构建手机端模块（`products/phone`）并运行，验证首页任务列表正常拉取与展示。

## 备注
- 与 rule.md 既有规范保持一致（强类型、禁止 any/unknown、Refresh 使用 `onRefreshing`、枚举正确使用、统一使用 Navigation）。
- 后续可在 `commons` 补充统一错误提示与鉴权头管理，以便接口调用一致性。