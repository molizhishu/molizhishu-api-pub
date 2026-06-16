# 架构说明

## 技术栈

- 后端：PHP 8 + ThinkPHP 8 + think-orm
- 前端：React + Vite + TypeScript + TanStack Query
- 数据库：MySQL 8
- 部署：Docker Compose 或本地 PHP/Vite 开发服务

## 后端模块

| 模块 | 说明 |
| :--- | :--- |
| `app/controller` | HTTP 入口，负责参数读取、响应和异常映射 |
| `app/service/MolizhishuClient.php` | 模力指数远端 API 客户端 |
| `app/service/TaskSyncService.php` | 状态查询、结果拉取和补偿同步编排 |
| `app/service/TaskRepository.php` | 主任务、Callback 和补偿事件落库 |
| `app/service/SubtaskRepository.php` | 子任务摘要和完整结果字段的 upsert |
| `app/service/AuthService.php` | 管理端登录、token 生成和校验 |
| `app/support/CallbackPayload.php` | Callback payload 校验和 hash |
| `app/support/JsonPayload.php` | JSON 编码、远端时间戳和子任务 payload 判断 |
| `app/command` | 后台补偿同步命令 |

## 前端模块

| 模块 | 说明 |
| :--- | :--- |
| `../frontend/src/api.ts` | 本地 API 封装和登录态处理 |
| `../frontend/src/pages` | 控制台、任务列表、任务详情、新建任务、系统设置 |
| `../frontend/src/ui` | 通用布局、选择器、Markdown 渲染、状态标签 |
| `../frontend/src/molizhishuOptions.ts` | 平台、模式、截图选项和展示映射 |

## 数据流

1. 管理端提交任务到本地后端。
2. 本地后端调用模力指数批量监控 API。
3. 提交成功后，本地保存主任务和初始子任务信息。
4. 如果配置 Callback，模力指数完成后主动推送到 `/webhooks/molizhishu`。
5. 如果没有 Callback 或需要补偿，可通过后台同步命令轮询远端状态。
6. 任务列表和详情页只读取本地数据库，避免页面浏览时频繁打远端接口。

## 后台同步

PHP/ThinkPHP 版通过 `app/command/SyncPendingLoop.php` 提供独立 CLI worker，同步容器运行该命令并定时调用 `TaskSyncService::syncUnfinished()`。

这样 API 容器只处理 HTTP 请求，worker 容器只处理后台补偿同步；两者日志和重启策略互不影响，也符合 PHP 运行时不适合在 Web 请求进程中常驻定时任务的特点。

## 状态约定

模力指数任务状态：

- `pending`：任务已创建，等待开始执行
- `processing`：任务执行中
- `completed`：任务全部完成且无失败
- `partial_completed`：任务部分完成，有成功也有失败
- `failed`：任务全部失败
- `stopped`：任务被人工停止
