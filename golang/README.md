# Go API 对接 Demo

基于 Go 1.22、Gin、GORM、MySQL 的模力指数监控 API 对接示例，覆盖提交任务、Callback 接收、后台补偿同步、手动补偿同步、停止任务、全局 Callback 配置和城市区域查询。

## 快速开始

```bash
cd golang
cp .env.example .env
go mod tidy
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS molizhishu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p molizhishu < database/schema.sql
go run ./cmd/server
```

环境变量中的 `MOLIZHISHU_TOKEN` 必须只配置在服务端，不要写入前端或仓库。

## 本地接口

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/auth/login` | 管理员登录 |
| `GET` | `/api/auth/me` | 当前登录用户 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `POST` | `/api/tasks` | 创建监控任务 |
| `GET` | `/api/tasks` | 查询本地任务列表 |
| `GET` | `/api/tasks/:taskId` | 查询本地任务详情 |
| `POST` | `/api/tasks/:taskId/sync` | 手动补偿同步 |
| `PUT` | `/api/tasks/:taskId/stop` | 停止未完成任务 |
| `POST` | `/webhooks/molizhishu` | 接收模力指数 Callback |
| `GET` | `/api/callback-url` | 查询全局 Callback |
| `PUT` | `/api/callback-url` | 设置或清空全局 Callback |
| `GET` | `/api/cities` | 查询可用区域 |

## 设计说明

- 远端接口业务失败可能仍返回 HTTP 200，因此客户端统一检查 `success/code/message`。
- Callback 接口先落库，再返回 2xx；重复 payload 通过 `task_id + payload_hash` 幂等处理。
- `completed`、`partial_completed`、`failed`、`stopped` 都是终态；`stopped` 也会保存已完成的子任务结果。
- 服务启动后默认运行后台补偿同步，每 60 秒扫描未完成或结果未完整入库的任务；只要状态接口出现已完成子任务，就会拉取结果接口并写回本地数据库。调度入口在 `cmd/server/main.go`，同步业务在 `internal/syncer`，数据库访问在 `internal/store`。
- `GET /api/tasks` 和 `GET /api/tasks/:taskId` 只读本地数据库，不会隐式调用模力指数远端接口。
- 除登录、健康检查和 Callback 外，`/api/**` 默认需要 `Authorization: Bearer <token>`，兼容根目录 `frontend/` 的登录流程。
- 默认管理员为 `admin / molizhishu`，初始化 SQL 会写入 `geo_admin_users` 表。生产部署后请修改默认密码。
- `internal/httpapi/presenter.go` 会把 MySQL JSON 字段转换成 JSON 字符串返回给公共前端，尤其是 `prompts_json`、`platforms_json`、`region_code_json`。不要直接返回数组对象，否则控制台和任务列表无法解析模型、模式。
- `internal/store/store.go` 保存远端状态/结果时只更新状态、进度、远端时间和原始响应，不应覆盖本地提交时保存的提示词、平台和区域配置。

## 与公共前端保持一致

本 demo 复用根目录 `frontend/`，因此本地 API 字段和行为必须与其它语言保持一致。修改以下内容时需要同步检查所有语言：

- `/api/tasks` 和 `/api/tasks/:taskId` 的响应字段名和字段类型。
- `prompts_json`、`platforms_json`、`region_code_json` 必须返回 JSON 字符串。
- 后台同步不能把提交参数覆盖成空数组。
- 控制台统计口径是子任务数，不是主任务条数。

完整契约见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。

## 同步配置

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `MOLIZHISHU_SYNC_ENABLED` | `true` | 是否启动后台补偿同步 |
| `MOLIZHISHU_SYNC_INTERVAL_SECONDS` | `60` | 每轮同步间隔秒数 |
| `MOLIZHISHU_SYNC_LIMIT` | `20` | 每轮最多同步的任务数 |

如需立即同步某个任务，可调用 `POST /api/tasks/:taskId/sync`。该接口与后台同步使用同一套逻辑。

## 目录结构

- `cmd/server`：服务启动入口，组装配置、远端 Client、Repository、HTTP Handler 和后台同步器。
- `internal/config`：环境变量配置解析。
- `internal/molizhishu`：模力指数远端 API Client，统一处理鉴权、响应 envelope、业务错误和日志。
- `internal/httpapi`：Gin 路由层，按 `auth`、`tasks`、`callback`、`settings`、`presenter` 拆分。
- `internal/store`：GORM 数据访问层，`models.go` 定义表模型，`json.go` 处理 MySQL JSON 字段，`store.go` 保留 Repository 方法。
- `internal/syncer`：后台补偿同步和手动同步业务，调度由 Go `time.Ticker` 驱动。

## Docker

```bash
cp docker.env.example docker.env
sh scripts/docker-up.sh
```

默认 API 端口为 `18082`，数据库表使用 `geo_` 前缀。

Docker 默认使用 `TZ=Asia/Shanghai`，MySQL 使用 `MYSQL_TIME_ZONE=+08:00`。本地 `DATETIME` 字段按东八区保存，远端毫秒级时间戳由公共前端按东八区显示。

Docker Compose 会同时启动公共前端、Go API 和 MySQL。默认访问：前端 `http://127.0.0.1:18000`，API `http://127.0.0.1:18082`。如需修改前端端口，请在 `docker.env` 中调整 `WEB_PORT`。

如果旧版本已经初始化过数据库，Compose 不会自动重跑建表脚本。测试环境可删除旧 volume 后重建；生产环境请先备份并迁移数据。

默认允许在设置页配置 API Key，便于 demo 试用：

```dotenv
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
```

生产环境如需锁定服务端配置，可改为 `false`。
