# 多语言 Demo 实现契约

这份文档用于约束 PHP、Java、Go、Python、ASP.NET Core、Rust、React Node.js、Vue Node.js 等后端 demo 的行为一致性。任何语言修改 API 入参、出参、数据库字段含义、同步策略或鉴权流程时，都需要同步检查其它语言实现。

## 本地 API 响应契约

所有本地 API 都使用统一 envelope：

```json
{
  "success": true,
  "data": {}
}
```

业务失败返回：

```json
{
  "success": false,
  "code": 400,
  "message": "错误说明"
}
```

除 `/api/health`、`/api/auth/login`、`/webhooks/molizhishu` 外，所有 `/api/**` 默认需要：

```http
Authorization: Bearer <token>
```

默认管理员：

```text
账号：admin
密码：molizhishu
```

## 任务列表和详情字段

公共前端会读取 `/api/tasks` 和 `/api/tasks/{taskId}`。各语言必须保持字段名和字段类型一致。

主任务必须返回：

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `task_id` | string | 模力指数任务 ID |
| `status` | string | 主任务状态 |
| `prompts_json` | string | JSON 字符串，不是数组对象 |
| `platforms_json` | string | JSON 字符串，不是数组对象 |
| `region_code_json` | string | JSON 字符串，不是数组对象 |
| `raw_request_json` | string | JSON 字符串 |
| `raw_response_json` | string | JSON 字符串 |
| `total_items` | number | 子任务总数 |
| `completed_items` | number | 已完成子任务数 |
| `failed_items` | number | 失败子任务数 |
| `created_local_at` | string | 本地创建时间，东八区 |
| `updated_at` | string | 本地更新时间，东八区 |

注意：`prompts_json`、`platforms_json`、`region_code_json` 虽然数据库是 JSON 字段，但 HTTP 返回给前端时必须是 JSON 字符串。公共前端会使用 `JSON.parse` 解析这些字段。Go 曾经直接返回数组对象，导致平台和模式为空；这是不符合契约的实现。

子任务必须返回：

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `subtask_id` | string | 子任务 ID |
| `task_id` | string | 主任务 ID |
| `platform` | string/null | 平台编码 |
| `mode` | string/null | 模式编码 |
| `prompt` | string/null | 提示词 |
| `status` | string/null | 子任务状态 |
| `answer_content` | string/null | 回答内容 |
| `reference_list_json` | string | JSON 字符串 |
| `citation_list_json` | string | JSON 字符串 |
| `reasoning_process_json` | string | JSON 字符串 |
| `recommended_questions_json` | string | JSON 字符串 |
| `media_content_json` | string | JSON 字符串 |
| `raw_result_json` | string | JSON 字符串 |

## 任务状态

模力指数主任务状态只有以下值：

| 状态 | 含义 |
| :--- | :--- |
| `pending` | 任务已创建，等待开始执行 |
| `processing` | 任务执行中 |
| `completed` | 任务全部完成且无失败 |
| `partial_completed` | 任务部分完成，有成功也有失败 |
| `failed` | 任务全部失败 |
| `stopped` | 任务被人工停止 |

终态为：

```text
completed, partial_completed, failed, stopped
```

不要在前后端引入未启动、未知完成等不在远端文档中的主任务状态。

## 数据保存规则

创建任务时必须保存提交参数：

- `prompts_json`
- `platforms_json`
- `region_code_json`
- `callback_url`
- `raw_request_json`

远端状态接口和结果接口一般不包含完整提交参数，因此保存远端结果时不能覆盖这些字段。远端同步只应该更新：

- `status`
- `total_items`
- `completed_items`
- `failed_items`
- `created_at`
- `completed_at`
- `raw_response_json`
- `last_error`
- `updated_at`

如果任务不是由本地提交创建，而是只从 Callback 或补偿同步第一次出现，可以插入空提交参数；后续如果子任务里已经有 `prompt/platform/mode`，可以从子任务回填主任务的 `prompts_json` 和 `platforms_json`。

Python 曾经在保存远端结果时把 `prompts_json`、`platforms_json` 覆盖成空数组，导致任务列表和控制台无法显示提示词、模型、模式；这是不符合契约的实现。

## 后台同步规则

所有语言都必须支持补偿同步：

- `GET /api/tasks` 和 `GET /api/tasks/{taskId}` 只读本地数据库，不隐式请求模力指数远端。
- 后台同步扫描未完成或结果不完整的任务。
- 当状态接口显示主任务进入终态，或 `completedItems > 0`，或 `subTaskList` 中出现已完成子任务时，应继续拉取结果接口并保存可用结果。
- 子任务可能在主任务未全部完成前部分完成，必须尽早入库并展示。

调度方式按语言生态选择：

| 语言 | 调度方式 |
| :--- | :--- |
| PHP | 独立 worker 容器执行 CLI 循环 |
| Java | `@Scheduled` |
| Go | goroutine + ticker |
| Python | FastAPI lifespan + APScheduler |
| ASP.NET Core | `BackgroundService` |
| Rust | Tokio task + interval |
| React Node.js | Node.js 定时器 |
| Vue Node.js | Node.js 定时器 |

## 公共前端数据口径

控制台统计由公共前端基于 `/api/tasks` 返回数据聚合：

- 今日概览统计子任务数，不统计主任务条数。
- 总任务 = `total_items`
- 已完成 = `completed_items`
- 失败 = `failed_items`
- 待执行/执行中/已停止按对应主任务状态下的未完成子任务数统计。
- 日期选择器会按 `created_local_at` 过滤当天任务。

如果后端修改 `/api/tasks` 的字段名、字段类型或时间格式，必须验证公共前端的控制台、任务列表、任务详情三个页面。

## Docker 和前端

每个语言目录的 Docker Compose 都应该一键启动：

- 当前语言 API
- MySQL
- 公共前端 `frontend/`
- 必要的后台同步进程

公共前端由各语言目录里的 `web-build` 服务构建，`web` 服务使用 Nginx 暴露静态页面，并把 `/api/`、`/webhooks/` 反向代理到当前语言 API。

批量本地测试时可以为每个语言设置不同 `WEB_PORT`：

| 语言 | 前端端口 | API 端口 |
| :--- | :--- | :--- |
| PHP | `18000` | `18080` |
| Java | `18001` | `18081` |
| Go | `18002` | `18082` |
| Python | `18003` | `18083` |
| ASP.NET Core | `18004` | `18084` |
| Rust | `18005` | `18085` |
| React Node.js | `18006` | `18086` |
| Vue Node.js | `18007` | `18087` |

## 安全约定

- 不要提交 `.env`、`docker.env`、真实 API Key、生产数据库密码。
- 只提交 `.env.example`、`docker.env.example`。
- API Key 只在服务端读取，不进入前端构建产物。
- 默认允许通过设置页配置 API Key，方便 demo 试用；生产环境可以显式设置 `MOLIZHISHU_ALLOW_API_KEY_UPDATE=false`。
